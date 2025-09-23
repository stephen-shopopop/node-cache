import { LRUCache } from './LRUCache.js';
import type { LRUCacheWithTTLOptions } from './definition.js';

/**
 * A Least Recently Used (LRU) cache implementation with Time-To-Live (TTL) support.
 *
 * @template K - The type of keys stored in the cache
 * @template V - The type of values stored in the cache
 *
 * @example
 * ```typescript
 * const cache = new CacheLRUWithTTL<string, number>({
 *   maxSize: 100,
 *   ttl: 60000
 * });
 * cache.set("key", 123); // Store value with default TTL
 * cache.set("key2", 456, 30000); // Store with custom TTL
 * ```
 *
 * @remarks
 * - Entries are automatically removed when they expire based on TTL
 * - Least recently used entries are removed when cache reaches maxSize
 * - Optional automatic cleanup of expired entries at specified intervals
 *
 * @throws {TypeError} When constructor options have invalid types or values:
 * - maxSize must be a non-negative integer
 * - ttl must be a non-negative integer
 * - cleanupInterval must be >= 1000ms
 * - stayAlive must be a boolean
 */
export class LRUCacheWithTTL<K, V> {
  #cache: LRUCache<K, { value: V; expiry?: number | undefined }>;
  readonly #ttl: number | undefined;
  readonly #timer: NodeJS.Timeout | undefined;
  readonly #cleanupInterval: number = 60000;
  readonly #maxSize: number = 1024;

  /**
   * Creates a new instance of CacheLRUWithTTL
   *
   * @param options - Configuration options for the cache
   * @param options.maxSize - Maximum number of items the cache can hold. Must be a non-negative integer
   * @param options.ttl - Time to live in milliseconds for cache items. Must be a non-negative integer
   * @param options.stayAlive - If true, keeps the cleanup timer running even when process.exit is called
   * @param options.cleanupInterval - Interval in milliseconds between cleanup runs. Must be at least 1000ms
   * @throws {TypeError} If any of the options have invalid values
   */
  constructor({ maxSize, ttl, stayAlive, cleanupInterval }: Readonly<LRUCacheWithTTLOptions>) {
    if (maxSize !== undefined) {
      if (typeof maxSize !== 'number' || !Number.isInteger(maxSize) || maxSize < 0) {
        throw new TypeError('CacheLRUWithTTL options.maxSize must be a non-negative integer');
      }
      this.#maxSize = maxSize;
    }

    if (ttl !== undefined) {
      if (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < 0) {
        throw new TypeError('CacheLRUWithTTL options.ttl must be a non-negative integer');
      }
      this.#ttl = ttl;
    }

    if (cleanupInterval !== undefined) {
      if (
        typeof cleanupInterval !== 'number' ||
        !Number.isInteger(cleanupInterval) ||
        cleanupInterval < 1000
      ) {
        throw new TypeError(
          'CacheLRUWithTTL options.cleanupInterval must be a non-negative integer and at least 1000 milliseconds'
        );
      }
      this.#cleanupInterval = cleanupInterval;
    }

    if (stayAlive !== undefined) {
      if (typeof stayAlive !== 'boolean') {
        throw new TypeError('CacheLRUWithTTL options.stayAlive must be a boolean');
      }
    }

    this.#cache = new LRUCache<K, { value: V; expiry?: number | undefined }>({
      maxSize: this.#maxSize
    });

    if (stayAlive) {
      this.#timer = setTimeout(() => {
        for (const [key, entry] of this.#cache.entries()) {
          if (entry.expiry !== undefined && performance.now() > entry.expiry) {
            this.#cache.delete(key);
          }
        }

        this.#timer?.refresh();
      }, this.#cleanupInterval);
      this.#timer.unref();
    }
  }

  #isExpired(entry: { value: V; expiry?: number | undefined }): boolean {
    if (entry.expiry === undefined) return false;

    return performance.now() > entry.expiry;
  }

  /**
   * Retrieves a value from the cache by its key
   *
   * @param key - The key to look up in the cache
   * @returns The value associated with the key if it exists and hasn't expired, undefined otherwise
   */
  get(key: K): V | undefined {
    const entry = this.#cache.get(key);

    if (entry === undefined) return undefined;

    if (this.#isExpired(entry)) {
      this.#cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Sets a key-value pair in the cache with an optional time-to-live (TTL).
   *
   * @param key - The key to store the value under
   * @param value - The value to be stored
   * @param ttl - Optional TTL in milliseconds. If not provided, uses the cache's default TTL if set, otherwise the entry won't expire
   * @returns void
   *
   * @example
   * ```ts
   * cache.set("key", "value", 1000); // Expires after 1 second
   * cache.set("key2", "value2"); // Uses default TTL or never expires
   * ```
   */
  set(key: K, value: V, ttl?: number): void {
    const expiry =
      ttl !== undefined
        ? performance.now() + ttl
        : this.#ttl !== undefined
          ? performance.now() + this.#ttl
          : undefined;

    this.#cache.set(key, { value, expiry });
  }

  /**
   * Removes and returns the first (oldest) item from the cache.
   *
   * @returns {[K, V] | undefined} The first key-value pair that was removed, or undefined if the cache was empty.
   */
  shift(): [K, V] | undefined {
    const entry = this.#cache.shift();

    if (entry === undefined) return undefined;

    return [entry[0], entry[1].value];
  }

  /**
   * Removes the specified key from the cache.
   *
   * @param key - The key to remove from the cache
   * @returns {boolean} Returns true if an element in the cache existed and has been removed,
   *                    or false if the element does not exist
   */
  delete(key: K): boolean {
    return this.#cache.delete(key);
  }

  /**
   * Removes all entries from the cache.
   * After calling this method, the cache will be empty.
   */
  clear(): void {
    this.#cache.clear();
  }

  /**
   * Gets the number of key-value pairs in the cache.
   *
   * @readonly
   * @returns {number} The total number of entries in the cache.
   */
  get size(): number {
    return this.#cache.size;
  }

  /**
   * Checks if a key exists in the cache and is not expired
   *
   * @param key - The key to check in the cache
   * @returns True if the key exists and has not expired, false otherwise
   * @template K - The type of the cache key
   */
  has(key: K): boolean {
    const entry = this.#cache.get(key);

    if (entry === undefined) return false;

    if (this.#isExpired(entry)) {
      this.#cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Stops the cleanup timer for expired cache entries if one is running.
   * This should be called when shutting down the cache to prevent memory leaks.
   */
  cancelCleanupTimer(): void {
    if (this.#timer) {
      clearTimeout(this.#timer);
    }
  }
}
