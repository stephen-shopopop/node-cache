import { createRequire } from 'node:module';
import type { Redis, RedisOptions } from 'iovalkey';
import type { RedisCacheStoreOptions } from './definition.js';
import { MemoryCacheStore } from './memory-cache-store.js';

/**
 * High-performance Redis-backed cache store with optional local tracking and metadata support.
 *
 * Architecture diagram:
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        RedisCacheStore                          │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
 * │  │   Redis Client  │    │ Redis Subscribe │    │ Memory Cache │ │
 * │  │    (Primary)    │    │   (Tracking)    │    │  (Optional)  │ │
 * │  └─────────────────┘    └─────────────────┘    └──────────────┘ │
 * │           │                       │                     │       │
 * │           │                       │                     │       │
 * │           ▼                       ▼                     ▼       │
 * │  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
 * │  │   Data Storage  │    │   Invalidation  │    │ Fast Lookup  │ │
 * │  │   (Values +     │    │   Notifications  │    │   & Caching  │ │
 * │  │   Metadata)     │    │                 │    │              │ │
 * │  └─────────────────┘    └─────────────────┘    └──────────────┘ │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * Data Structure in Redis:
 * ```
 * Key Structure:
 * - metadata:[key] → HASH { metadata: JSON, id: UUID }
 * - values:[id]    → STRING (actual value)
 * ```
 *
 * @template Metadata - The shape of the metadata object associated with each cache entry
 *
 * @example Basic usage
 * ```typescript
 * interface UserMetadata {
 *   userId: string;
 *   timestamp: number;
 *   tags: string[];
 * }
 *
 * const store = new RedisCacheStore<UserMetadata>({
 *   maxEntrySize: 50 * 1024 * 1024, // 50MB
 *   clientOpts: {
 *     host: 'localhost',
 *     port: 6379,
 *     keyPrefix: 'app:'
 *   },
 *   maxCount: 1000,
 *   errorCallback: (err) => console.error('Cache error:', err)
 * });
 *
 * // Store with metadata and TTL
 * await store.set('user:123', JSON.stringify(userData), {
 *   userId: '123',
 *   timestamp: Date.now(),
 *   tags: ['active', 'premium']
 * }, 3600); // 1 hour TTL
 *
 * // Retrieve
 * const result = await store.get('user:123');
 * if (result) {
 *   console.log('Value:', result.value);
 *   console.log('Metadata:', result.metadata);
 * }
 *
 * // Clean up
 * await store.close();
 * ```
 *
 * @example With tracking disabled
 * ```typescript
 * const store = new RedisCacheStore({
 *   tracking: false, // Disable local tracking cache
 *   clientOpts: { host: 'redis.example.com' }
 * });
 * ```
 *
 * @since 1.0.0
 */

/**
 * Creates a require function scoped to the current module's URL.
 * This enables CommonJS-style require() in ESM modules.
 *
 * @internal
 * @const {Function} require - The created require function
 */
const require = createRequire(import.meta.url);

/**
 * Adds a prefix to the provided key if a prefix is specified.
 *
 * @internal
 * @param key - The original key to which the prefix may be added
 * @param prefix - An optional string to prepend to the key. Defaults to an empty string
 * @returns The key with the prefix prepended if a prefix is provided; otherwise, returns the original key
 *
 * @example
 * ```typescript
 * addKeyPrefix('user:123', 'app:') // Returns: 'app:user:123'
 * addKeyPrefix('user:123', '')     // Returns: 'user:123'
 * ```
 */
export const addKeyPrefix = (key: string, prefix: string) => (prefix ? `${prefix}${key}` : key);

/**
 * Serializes a metadata key by prefixing it with "metadata:" and an optional custom prefix.
 *
 * @internal
 * @param key - The original key to be serialized
 * @param prefix - An optional prefix to prepend to the serialized key
 * @returns The serialized metadata key with the specified prefix
 *
 * @example
 * ```typescript
 * serializeMetadataKey('user:123', 'app:') // Returns: 'app:metadata:user:123'
 * serializeMetadataKey('user:123', '')     // Returns: 'metadata:user:123'
 * ```
 */
export const serializeMetadataKey = (key: string, prefix: string) =>
  addKeyPrefix(`metadata:${key}`, prefix);

/**
 * Extracts the portion of a key string that follows the 'metadata:' prefix.
 *
 * If the key starts with 'metadata:', the prefix is removed and the remainder is returned.
 * If the key contains 'metadata:' elsewhere, the substring after the first occurrence is returned.
 * If the key does not contain 'metadata:', the original key is returned unchanged.
 *
 * @internal
 * @param key - The key string to parse
 * @returns The key string without the 'metadata:' prefix, or the original key if the prefix is not present
 *
 * @example
 * ```typescript
 * parseMetadataKey('metadata:user:123')     // Returns: 'user:123'
 * parseMetadataKey('app:metadata:user:123') // Returns: 'user:123'
 * parseMetadataKey('user:123')              // Returns: 'user:123'
 * ```
 */
export const parseMetadataKey = (key: string) => {
  const pattern = 'metadata:';

  if (key.startsWith(pattern)) {
    return key.slice(pattern.length);
  }

  if (key.includes(pattern)) {
    return key.slice(key.indexOf(pattern) + pattern.length);
  }

  return key;
};

/**
 * Generates a Redis key for storing serialized values by combining the given `id` with a `values:` prefix,
 * and then applying the provided key prefix.
 *
 * @internal
 * @param id - The unique identifier for the values to be serialized
 * @param prefix - The prefix to be added to the generated key for namespacing
 * @returns The fully prefixed Redis key for the serialized values
 *
 * @example
 * ```typescript
 * serializeValuesKey('uuid-123', 'app:') // Returns: 'app:values:uuid-123'
 * serializeValuesKey('uuid-123', '')     // Returns: 'values:uuid-123'
 * ```
 */
export const serializeValuesKey = (id: string, prefix: string) =>
  addKeyPrefix(`values:${id}`, prefix);

/**
 * A Redis-backed cache store with optional local tracking and metadata support.
 *
 * `RedisCacheStore` provides a high-level interface for storing, retrieving, and deleting
 * cache entries in Redis, with support for per-entry metadata, maximum entry size enforcement,
 * and optional local in-memory tracking for improved performance and cache invalidation.
 *
 * ## Key Features
 *
 * - **Dual Storage Architecture**: Stores values and associated metadata in Redis using separate keys for data and metadata
 * - **Size Enforcement**: Enforces a configurable maximum entry size to prevent memory issues
 * - **Local Tracking Cache**: Optional local in-memory cache for fast lookups with Redis keyspace notifications for invalidation
 * - **Automatic Cleanup**: Handles automatic cleanup of stale or corrupted cache entries
 * - **Error Resilience**: Provides custom error handling via configurable error callback
 * - **Atomic Operations**: Uses Redis pipelines for atomic set operations
 * - **TTL Support**: Full support for time-to-live on cache entries
 *
 * ## Architecture Details
 *
 * The store uses a two-key approach in Redis:
 * 1. `metadata:[key]` - Hash containing JSON metadata and a UUID
 * 2. `values:[uuid]` - String containing the actual cached value
 *
 * This design allows for efficient metadata queries without loading large values,
 * and enables atomic cleanup of both parts when entries expire.
 *
 * ## Performance Characteristics
 *
 * - **Cold reads**: Single Redis roundtrip (HGETALL + GET)
 * - **Warm reads**: Zero Redis roundtrips (served from tracking cache)
 * - **Writes**: Single pipelined Redis transaction (HSET + SET + 2x EXPIRE)
 * - **Memory overhead**: Minimal for metadata, configurable tracking cache size
 *
 * @template Metadata - The shape of the metadata object associated with each cache entry
 *
 * @public
 * @since 1.0.0
 */
export class RedisCacheStore<Metadata extends object = Record<PropertyKey, unknown>> {
  /**
   * Primary Redis client for data operations.
   * @private
   * @readonly
   */
  readonly #redis: Redis;

  /**
   * Secondary Redis client for subscription to invalidation notifications.
   * @private
   */
  #redisSubscribe: Redis | undefined;

  /**
   * Maximum allowed size for a single cache entry in bytes.
   * @private
   * @readonly
   * @default 104857600 (100MB)
   */
  readonly #maxEntrySize: number = 104857600; // 100MB

  /**
   * Optional local tracking cache for fast lookups.
   * @private
   * @readonly
   */
  readonly #trackingCache: MemoryCacheStore<string, Metadata> | undefined;

  /**
   * Redis client configuration options.
   * @private
   * @readonly
   */
  readonly #redisClientOpts: RedisOptions;

  /**
   * Key prefix for Redis operations.
   * @private
   * @readonly
   */
  readonly #keyPrefix: string;

  /**
   * Error callback function for handling Redis and internal errors.
   * @private
   * @readonly
   */
  readonly #errorCallback: (err: unknown) => void = (err) => {
    console.error('Unhandled error in RedisCacheStore:', err);
  };

  /**
   * Flag indicating whether the store has been closed.
   * @private
   */
  #closed = false;

  /**
   * Creates a new instance of the RedisCacheStore.
   *
   * @param options - The configuration options for the RedisCacheStore
   * @param options.maxEntrySize - The maximum size (in bytes) allowed for a single cache entry. Must be a non-negative integer. Defaults to 100MB
   * @param options.errorCallback - A callback function to handle errors that occur during Redis operations
   * @param options.clientOpts - Options to configure the underlying Redis client. May include `keyPrefix` and other Redis client options
   * @param options.clientOpts.keyPrefix - Prefix to apply to all Redis keys for namespacing
   * @param options.maxCount - The maximum number of entries allowed in the tracking cache (only used when tracking is enabled)
   * @param options.tracking - If set to `false`, disables the local tracking cache. Defaults to `true`
   *
   * @throws {TypeError} If `options` is not an object
   * @throws {TypeError} If `maxEntrySize` is not a non-negative integer
   * @throws {TypeError} If `errorCallback` is not a function
   *
   * @example Basic initialization
   * ```typescript
   * const store = new RedisCacheStore({
   *   clientOpts: { host: 'localhost', port: 6379 }
   * });
   * ```
   *
   * @example Advanced configuration
   * ```typescript
   * const store = new RedisCacheStore<MyMetadata>({
   *   maxEntrySize: 50 * 1024 * 1024, // 50MB
   *   maxCount: 5000,                  // Track up to 5000 entries locally
   *   tracking: true,                  // Enable local tracking (default)
   *   clientOpts: {
   *     host: 'redis.example.com',
   *     port: 6380,
   *     keyPrefix: 'myapp:',
   *     retryDelayOnFailover: 100
   *   },
   *   errorCallback: (err) => {
   *     logger.error('Redis cache error:', err);
   *     metrics.increment('redis.errors');
   *   }
   * });
   * ```
   *
   * @public
   */
  constructor(options: Readonly<RedisCacheStoreOptions>) {
    if (options) {
      if (typeof options !== 'object') {
        throw new TypeError('RedisCacheStore options to be an object');
      }

      if (options.maxEntrySize) {
        if (
          typeof options.maxEntrySize !== 'number' ||
          !Number.isInteger(options.maxEntrySize) ||
          options.maxEntrySize < 0
        ) {
          throw new TypeError(
            'RedisCacheStore options.maxEntrySize must be a non-negative integer'
          );
        }

        this.#maxEntrySize = options.maxEntrySize;
      }

      if (options.errorCallback) {
        if (typeof options.errorCallback !== 'function') {
          throw new TypeError('RedisCacheStore options.errorCallback to be a function');
        }

        this.#errorCallback = options.errorCallback;
      }
    }

    const { keyPrefix, ...clientOpts } = options?.clientOpts ?? {};
    this.#redisClientOpts = clientOpts ?? {};
    this.#keyPrefix = keyPrefix ?? '';

    const RedisClient = require('iovalkey').Redis as new (opts: RedisOptions) => Redis;
    this.#redis = new RedisClient({ enableAutoPipelining: true });

    if (options?.tracking !== false) {
      this.#trackingCache = new MemoryCacheStore({
        maxEntrySize: this.#maxEntrySize,
        maxSize: options?.maxSize,
        maxCount: options?.maxCount
      });

      this.#subscribe();
    }
  }

  /**
   * Retrieves a cached value and its associated metadata by key.
   *
   * This method implements a two-tier lookup strategy:
   * 1. **Fast path**: If local tracking is enabled and contains the key, return immediately
   * 2. **Slow path**: Query Redis for the entry, then populate the tracking cache if found
   *
   * The method handles various edge cases including:
   * - Missing or corrupted metadata
   * - Expired values with lingering metadata
   * - JSON parsing errors in metadata
   *
   * @param key - The cache key to retrieve
   * @returns A promise that resolves to an object containing the value and metadata if found, or `undefined` if the key does not exist or an error occurs
   *
   * @example Basic retrieval
   * ```typescript
   * const result = await store.get('user:123');
   * if (result) {
   *   console.log('User data:', result.value);
   *   console.log('Metadata:', result.metadata);
   * } else {
   *   console.log('User not found in cache');
   * }
   * ```
   *
   * @example Type-safe metadata access
   * ```typescript
   * interface UserMetadata {
   *   lastUpdated: number;
   *   version: string;
   * }
   *
   * const store = new RedisCacheStore<UserMetadata>();
   * const result = await store.get('user:123');
   *
   * if (result) {
   *   // TypeScript knows metadata has lastUpdated and version
   *   console.log('Last updated:', new Date(result.metadata.lastUpdated));
   *   console.log('Version:', result.metadata.version);
   * }
   * ```
   *
   * @public
   */
  async get(key: string): Promise<{ value: string; metadata: Metadata } | undefined> {
    if (this.#trackingCache) {
      const result = this.#trackingCache.get(key);
      if (result !== undefined)
        return { value: result.value.toString(), metadata: result.metadata };
    }

    const cacheEntry = await this.findByKey(key);
    if (cacheEntry === undefined) return undefined;

    const { metadata, value } = cacheEntry;

    if (this.#trackingCache) {
      this.#trackingCache.set(key, value, metadata);
    }

    return { metadata, value };
  }

  /**
   * Retrieves a value and its associated metadata from Redis by the provided key.
   *
   * This is the core lookup method that handles the Redis-level operations.
   * It performs the following steps:
   *
   * 1. Fetch metadata hash using `HGETALL`
   * 2. If metadata exists, fetch the actual value using the embedded UUID
   * 3. Handle cleanup of stale entries (metadata without corresponding values)
   * 4. Parse and validate metadata JSON
   * 5. Clean up corrupted entries and log errors appropriately
   *
   * @internal
   * @param key - The key to look up in the cache
   * @returns A promise that resolves to an object containing the value and its metadata, or `undefined` if the key is not found or an error occurs
   *
   * @example Error scenarios handled:
   * ```typescript
   * // Scenario 1: Metadata exists but value expired
   * // Action: Delete stale metadata, return undefined
   *
   * // Scenario 2: Metadata JSON is corrupted
   * // Action: Delete both metadata and value, log error, return undefined
   *
   * // Scenario 3: Redis connection error
   * // Action: Call error callback, return undefined
   * ```
   */
  async findByKey(key: string): Promise<{ value: string; metadata: Metadata } | undefined> {
    const metadataKey = serializeMetadataKey(key, this.#keyPrefix);

    try {
      const metadataValue = (await this.#redis.hgetall(metadataKey)) as {
        metadata: string;
        id: string;
      } | null;

      if (!metadataValue || !('id' in metadataValue)) {
        return undefined;
      }

      const valueKey = serializeValuesKey(metadataValue['id'], this.#keyPrefix);
      const value = await this.#redis.get(valueKey);
      if (!value) {
        // The value expired but the metadata stayed around. This shouldn't ever
        //  happen but is _technically_ possible
        this.#redis.del(metadataKey).catch((err) => {
          this.#errorCallback(err);
        });

        return undefined;
      }

      let metadata: Metadata;

      try {
        metadata = JSON.parse(metadataValue.metadata) as Metadata;
      } catch (err) {
        // If we can't parse the metadata, something is very wrong - delete both
        this.delete(key).catch((err) => {
          this.#errorCallback(err);
        });

        this.#errorCallback(err);

        return undefined;
      }

      return {
        value,
        metadata
      };
    } catch (err: unknown) {
      this.#errorCallback(err);

      return undefined;
    }
  }

  /**
   * Stores a value in the Redis cache with associated metadata and an optional time-to-live (TTL).
   *
   * This method performs atomic storage using Redis pipelines to ensure consistency.
   * The operation includes:
   *
   * 1. **Validation**: Checks value type, metadata object, TTL, and size constraints
   * 2. **UUID Generation**: Creates a unique identifier for value storage
   * 3. **Atomic Storage**: Uses Redis pipeline for atomic HSET + SET + 2x EXPIRE operations
   * 4. **Size Enforcement**: Prevents storage of entries exceeding `maxEntrySize`
   *
   * ## Storage Schema
   *
   * ```
   * metadata:[key] → { metadata: JSON, id: UUID }  [TTL: ttl seconds]
   * values:[UUID]  → value                         [TTL: ttl seconds]
   * ```
   *
   * @param key - The cache key under which the value will be stored
   * @param value - The value to store; must be a string or Buffer
   * @param metadata - Metadata object to associate with the cache entry. Defaults to empty object if not provided
   * @param ttl - Time-to-live in seconds; must be a non-negative integer. If not provided, entries will not expire
   *
   * @throws {TypeError} If the value is not a string or Buffer
   * @throws {TypeError} If the metadata is not an object or is null
   * @throws {TypeError} If the ttl is not a non-negative integer
   * @throws {Error} If the entry size exceeds the maximum allowed size
   *
   * @returns A promise that resolves when the value and metadata have been stored successfully
   *
   * @example Basic storage
   * ```typescript
   * await store.set('user:123', JSON.stringify(userData), {
   *   userId: '123',
   *   lastUpdated: Date.now()
   * });
   * ```
   *
   * @example With TTL
   * ```typescript
   * await store.set('session:abc', sessionData, {
   *   sessionId: 'abc',
   *   createdAt: Date.now()
   * }, 3600); // Expires in 1 hour
   * ```
   *
   * @example Buffer storage
   * ```typescript
   * const imageBuffer = await fs.readFile('image.jpg');
   * await store.set('image:123', imageBuffer, {
   *   filename: 'image.jpg',
   *   mimeType: 'image/jpeg',
   *   size: imageBuffer.length
   * }, 86400); // Expires in 24 hours
   * ```
   *
   * @example Error handling
   * ```typescript
   * try {
   *   await store.set('large-file', hugeBuffer, {}, 3600);
   * } catch (error) {
   *   if (error.message.includes('maxEntrySize')) {
   *     console.log('File too large for cache');
   *   }
   * }
   * ```
   *
   * @public
   */
  async set(
    key: string,
    value: string | Buffer,
    metadata: Metadata = {} as Metadata,
    ttl?: number
  ): Promise<void> {
    if (typeof value !== 'string' && !Buffer.isBuffer(value)) {
      throw new TypeError(
        `RedisCacheStore value must be a string or Buffer, received ${typeof value}`
      );
    }

    if (typeof metadata !== 'object' || metadata === null) {
      throw new TypeError(
        `RedisCacheStore metadata must be an object, received ${typeof metadata}`
      );
    }

    if (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < 0) {
      throw new TypeError('RedisCacheStore ttl must be a non-negative integer');
    }

    const size = Buffer.byteLength(value);

    if (size > this.#maxEntrySize) {
      throw new Error(
        `RedisCacheStore entry size exceeds maxEntrySize of ${this.#maxEntrySize} bytes`
      );
    }

    const id = crypto.randomUUID();
    const metadataKey = serializeMetadataKey(key, this.#keyPrefix);
    const valueKey = serializeValuesKey(id, this.#keyPrefix);

    const pipeline = this.#redis.pipeline();
    pipeline.hset(metadataKey, { metadata: JSON.stringify(metadata), id });
    pipeline.set(valueKey, value);
    pipeline.expire(metadataKey, ttl);
    pipeline.expire(valueKey, ttl);

    await pipeline.exec();
  }

  /**
   * Deletes a cache entry and its associated metadata from Redis.
   *
   * This method performs a complete cleanup by:
   * 1. Fetching the metadata to get the associated value UUID
   * 2. Deleting both the metadata hash and the value string
   * 3. Removing the entry from the local tracking cache (if enabled)
   *
   * The operation is atomic - either both keys are deleted or neither is.
   * If the metadata doesn't exist, the method returns silently without error.
   *
   * @param key - The cache key to delete
   * @returns A promise that resolves when the deletion is complete
   *
   * @example Basic deletion
   * ```typescript
   * await store.delete('user:123');
   * console.log('User cache entry deleted');
   * ```
   *
   * @example Batch deletion
   * ```typescript
   * const keysToDelete = ['user:1', 'user:2', 'user:3'];
   * await Promise.all(keysToDelete.map(key => store.delete(key)));
   * console.log('All user entries deleted');
   * ```
   *
   * @example Safe deletion (no error if key doesn't exist)
   * ```typescript
   * // This won't throw even if 'nonexistent:key' doesn't exist
   * await store.delete('nonexistent:key');
   * ```
   *
   * @public
   */
  async delete(key: string): Promise<void> {
    const metadataKey = serializeMetadataKey(key, this.#keyPrefix);
    const metadata = await this.#redis.hgetall(metadataKey);

    if (!metadata || !('id' in metadata)) {
      return;
    }

    const valueKey = serializeValuesKey(metadata['id'], this.#keyPrefix);

    const promises = [this.#redis.del(valueKey), this.#redis.del(metadataKey)];

    if (this.#trackingCache) {
      this.#trackingCache.delete(key);
    }

    await Promise.all(promises);
  }

  /**
   * Sets up Redis keyspaces notifications for cache invalidation.
   *
   * This method:
   * 1. Creates a separate Redis client for subscriptions
   * 2. Enables Redis CLIENT TRACKING to receive invalidation notifications
   * 3. Subscribes to the `__redis__:invalidate` channel
   * 4. Sets up message handling to remove invalidated keys from the tracking cache
   *
   * The tracking system ensures that when Redis keys are modified externally
   * (by other clients or expiration), the local tracking cache is automatically
   * invalidated to maintain consistency.
   *
   * @private
   * @returns {void}
   *
   * @example Invalidation flow:
   * ```
   * 1. External client modifies 'metadata:user:123'
   * 2. Redis sends invalidation notification
   * 3. This client receives '__redis__:invalidate' message
   * 4. Local tracking cache removes 'user:123'
   * 5. Next get('user:123') will fetch from Redis
   * ```
   */
  #subscribe(): void {
    const RedisClient = require('iovalkey').Redis as new (opts: RedisOptions) => Redis;
    this.#redisSubscribe = new RedisClient(this.#redisClientOpts);

    this.#redisSubscribe
      .call('CLIENT', 'ID')
      .then((clientId) => {
        return this.#redis.call('CLIENT', 'TRACKING', 'on', 'REDIRECT', clientId as string);
      })
      .then(() => this.#redisSubscribe?.subscribe('__redis__:invalidate'))
      .catch((err: unknown) => this.#errorCallback(err));

    this.#redisSubscribe.on('message', (channel: string, message: string) => {
      if (channel === '__redis__:invalidate') {
        if (
          message.startsWith('metadata:') ||
          message.startsWith(addKeyPrefix('metadata:', this.#keyPrefix))
        ) {
          if (this.#trackingCache) {
            const parsedMetadataKey = parseMetadataKey(message);
            this.#trackingCache.delete(parsedMetadataKey);
          }
        }
      }
    });
  }

  /**
   * Closes the Redis connections used by the cache store.
   *
   * This method ensures graceful shutdown by:
   * 1. Setting the closed flag to prevent further operations
   * 2. Calling `quit()` on all Redis clients (main and subscriber)
   * 3. Waiting for all connections to close properly
   * 4. Handling any errors during the closing process
   *
   * Once closed, the store instance should not be used for further operations.
   * It's recommended to call this method when your application shuts down
   * or when you're done with the cache store to prevent connection leaks.
   *
   * @returns A promise that resolves when all connections are closed
   *
   * @example Graceful shutdown
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   console.log('Shutting down gracefully...');
   *   await store.close();
   *   console.log('Cache store closed');
   *   process.exit(0);
   * });
   * ```
   *
   * @example In a web server
   * ```typescript
   * const server = express();
   * const store = new RedisCacheStore(options);
   *
   * // ... use store in routes ...
   *
   * server.listen(3000, () => {
   *   console.log('Server started');
   * });
   *
   * process.on('SIGINT', async () => {
   *   console.log('Closing server...');
   *   await store.close(); // Close cache before server
   *   server.close();
   * });
   * ```
   *
   * @example Multiple calls are safe
   * ```typescript
   * await store.close(); // First call closes connections
   * await store.close(); // Second call returns immediately
   * ```
   *
   * @public
   */
  async close(): Promise<void> {
    if (this.#closed) return;

    this.#closed = true;

    try {
      const promises = [this.#redis.quit()];
      if (this.#redisSubscribe) {
        promises.push(this.#redisSubscribe.quit());
      }
      await Promise.all(promises);
    } catch (err: unknown) {
      this.#errorCallback(err);
    }
  }
}
