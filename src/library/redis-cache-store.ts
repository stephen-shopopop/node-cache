import { createRequire } from 'node:module';
import type { Redis, RedisOptions } from 'iovalkey';
import type { RedisCacheStoreOptions } from './definition.js';
import { MemoryCacheStore } from './memory-cache-store.js';

/**
 * Creates a require function scoped to the current module's URL.
 * This enables CommonJS-style require() in ESM modules.
 * @const {Function} require - The created require function
 */
const require = createRequire(import.meta.url);

/**
 * Adds a prefix to the provided key if a prefix is specified.
 *
 * @param key - The original key to which the prefix may be added.
 * @param prefix - An optional string to prepend to the key. Defaults to an empty string.
 * @returns The key with the prefix prepended if a prefix is provided; otherwise, returns the original key.
 */
export const addKeyPrefix = (key: string, prefix: string) => (prefix ? `${prefix}${key}` : key);

/**
 * Serializes a metadata key by prefixing it with "metadata:" and an optional custom prefix.
 *
 * @param key - The original key to be serialized.
 * @param prefix - An optional prefix to prepend to the serialized key.
 * @returns The serialized metadata key with the specified prefix.
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
 * @param key - The key string to parse.
 * @returns The key string without the 'metadata:' prefix, or the original key if the prefix is not present.
 */
export const parseMetadataKey = (key: string) => {
  if (key.startsWith('metadata:')) {
    return key.slice(9);
  }

  if (key.includes('metadata:')) {
    return key.slice(key.indexOf('metadata:') + 9);
  }

  return key;
};

/**
 * Generates a Redis key for storing serialized values by combining the given `id` with a `values:` prefix,
 * and then applying the provided key prefix.
 *
 * @param id - The unique identifier for the values to be serialized.
 * @param prefix - The prefix to be added to the generated key for namespacing.
 * @returns The fully prefixed Redis key for the serialized values.
 */
const serializeValuesKey = (id: string, prefix: string) => addKeyPrefix(`values:${id}`, prefix);

/**
 * A Redis-backed cache store with optional local tracking and metadata support.
 *
 * `RedisCacheStore` provides a high-level interface for storing, retrieving, and deleting
 * cache entries in Redis, with support for per-entry metadata, maximum entry size enforcement,
 * and optional local in-memory tracking for improved performance and cache invalidation.
 *
 * Features:
 * - Stores values and associated metadata in Redis, using separate keys for data and metadata.
 * - Enforces a configurable maximum entry size.
 * - Supports optional local tracking cache for fast lookups and Redis keyspace notifications.
 * - Handles automatic cleanup of stale or corrupted cache entries.
 * - Allows custom error handling via an error callback.
 * - Provides methods for setting, getting, and deleting cache entries, as well as closing connections.
 *
 * @typeParam Metadata - The shape of the metadata object associated with each cache entry.
 *
 * @example
 * ```typescript
 * const store = new RedisCacheStore<MyMetadataType>({ clientOpts: { host: 'localhost' } });
 * await store.set('my-key', 'value', { foo: 'bar' }, 60);
 * const entry = await store.get('my-key');
 * await store.delete('my-key');
 * await store.close();
 * ```
 */
export class RedisCacheStore<Metadata extends object = Record<PropertyKey, unknown>> {
  readonly #redis: Redis;
  #redisSubscribe: Redis | undefined;
  readonly #maxEntrySize: number = 104857600; // 100MB
  readonly #trackingCache: MemoryCacheStore<string, Metadata> | undefined;
  readonly #redisClientOpts: RedisOptions;
  readonly #keyPrefix: string;
  readonly #errorCallback: (err: unknown) => void = (err) => {
    console.error('Unhandled error in RedisCacheStore:', err);
  };
  #closed = false;

  /**
   * Creates a new instance of the RedisCacheStore.
   *
   * @param options - The configuration options for the RedisCacheStore.
   *   - `maxEntrySize` (optional): The maximum size (in bytes) allowed for a single cache entry. Must be a non-negative integer.
   *   - `errorCallback` (optional): A callback function to handle errors.
   *   - `clientOpts` (optional): Options to configure the underlying Redis client. May include `keyPrefix` and other Redis client options.
   *   - `maxCount` (optional): The maximum number of entries allowed in the tracking cache.
   *   - `tracking` (optional): If set to `false`, disables the tracking cache. Defaults to `true`.
   *
   * @throws {TypeError} If any of the provided options are invalid.
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

    const RedisClass = require('iovalkey').Redis as new (opts: RedisOptions) => Redis;
    this.#redis = new RedisClass({ enableAutoPipelining: true });

    if (options?.tracking !== false) {
      this.#trackingCache = new MemoryCacheStore({
        maxEntrySize: this.#maxEntrySize,
        maxCount: options?.maxCount
      });

      this.#subscribe();
    }
  }

  /**
   * Retrieves a cached value and its associated metadata by key.
   *
   * If a local tracking cache is enabled and contains the key, the value is returned from there.
   * Otherwise, attempts to find the cache entry from the underlying store.
   * If found, the entry is optionally stored in the tracking cache for future access.
   *
   * @param key - The cache key to retrieve.
   * @returns A promise that resolves to an object containing the value and metadata if found, or `undefined` if the key does not exist.
   */
  async get(key: string): Promise<{ value: string; metadata: Metadata } | undefined> {
    if (this.#trackingCache) {
      const result = this.#trackingCache.get(key);
      if (result !== undefined) return result as { value: string; metadata: Metadata };
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
   * This method first attempts to fetch the metadata associated with the given key.
   * If the metadata or its required fields are missing, it returns `undefined`.
   * If the value corresponding to the metadata's ID is missing (possibly expired),
   * it cleans up the stale metadata and returns `undefined`.
   * If the metadata cannot be parsed, it deletes both the value and metadata,
   * logs the error, and returns `undefined`.
   *
   * @param key - The key to look up in the cache.
   * @returns A promise that resolves to an object containing the value and its metadata,
   *          or `undefined` if the key is not found or an error occurs.
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
   * @param key - The cache key under which the value will be stored.
   * @param value - The value to store; must be a string or Buffer.
   * @param metadata - Optional metadata object to associate with the cache entry.
   * @param ttl - Optional time-to-live in seconds; must be a non-negative integer.
   * @throws {TypeError} If the value is not a string or Buffer.
   * @throws {TypeError} If the metadata is not an object.
   * @throws {TypeError} If the ttl is not a non-negative integer.
   * @throws {Error} If the entry size exceeds the maximum allowed size.
   * @returns A promise that resolves when the value and metadata have been stored.
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
   * This method removes both the value and metadata keys associated with the provided cache key.
   * If a tracking cache is enabled, it also removes the key from the tracking cache.
   *
   * @param key - The cache key to delete.
   * @returns A promise that resolves when the deletion is complete.
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

  #subscribe() {
    const RedisClass = require('iovalkey').Redis as new (opts: RedisOptions) => Redis;
    this.#redisSubscribe = new RedisClass(this.#redisClientOpts);

    this.#redisSubscribe
      .call('CLIENT', 'ID')
      .then((clientId: unknown) => {
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
   * This method ensures that all Redis clients (main and subscriber, if present)
   * are gracefully closed by calling their `quit` methods. If the connections are
   * already closed, the method returns immediately. Any errors encountered during
   * the closing process are passed to the configured error callback.
   *
   * @returns {Promise<void>} A promise that resolves when all connections are closed.
   */
  async close() {
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
