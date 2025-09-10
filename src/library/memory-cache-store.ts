import { LRUCache } from './cacheLRU.js';
import type { MemoryCacheStoreOptions } from './definition.js';

type Value<Metadata> = {
  metadata?: Metadata;
  value: string | Buffer;
  size: number;
};

/**
 * A memory-based cache store implementation using LRU (Least Recently Used) cache strategy.
 *
 * @template K - The type of keys used in the cache
 * @template Metadata - The type of metadata associated with cached values, extends object
 *
 * @remarks
 * This cache store implementation provides the following features:
 * - Maximum entry size limit (default: 5MB)
 * - Maximum total cache size limit (default: 100MB)
 * - Maximum number of entries limit (default: 1024)
 * - LRU eviction policy
 * - Support for string and Buffer values
 * - Associated metadata for each cache entry
 *
 * @example
 * ```typescript
 * const cache = new MemoryCacheStore<string, { timestamp: number }>({
 *   maxCount: 100,
 *   maxSize: 1024 * 1024, // 1MB
 *   maxEntrySize: 64 * 1024 // 64KB
 * });
 * ```
 */
export class MemoryCacheStore<K, Metadata extends object = Record<PropertyKey, unknown>> {
  #maxEntrySize = 5242880; // 5MB
  #maxSize = 104857600; // 100MB
  #maxCount = 1024;
  #data: LRUCache<K, Value<Metadata>>;

  #size = 0;

  /**
   * Creates a new instance of MemoryCacheStore.
   *
   * @param options - Configuration options for the memory cache store
   * @param options.maxCount - Maximum number of entries allowed in the cache. Must be a non-negative integer.
   * @param options.maxEntrySize - Maximum size of a single entry in bytes. Must be a non-negative integer.
   * @param options.maxSize - Maximum total size of all entries in bytes. Must be a non-negative integer.
   * @throws {TypeError} If any of the numeric options are not non-negative integers
   */
  constructor({ maxCount, maxEntrySize, maxSize }: Readonly<MemoryCacheStoreOptions>) {
    if (maxSize !== undefined) {
      if (typeof maxSize !== 'number' || !Number.isInteger(maxSize) || maxSize < 0) {
        throw new TypeError('MemoryCache options.maxSize must be a non-negative integer');
      }

      this.#maxSize = maxSize;
    }

    if (maxCount !== undefined) {
      if (typeof maxCount !== 'number' || !Number.isInteger(maxCount) || maxCount < 0) {
        throw new TypeError('MemoryCache options.maxCount must be a non-negative integer');
      }

      this.#maxCount = maxCount;
    }

    if (maxEntrySize !== undefined) {
      if (typeof maxEntrySize !== 'number' || !Number.isInteger(maxEntrySize) || maxEntrySize < 0) {
        throw new TypeError('MemoryCache options.maxEntrySize must be a non-negative integer');
      }

      this.#maxEntrySize = maxEntrySize;
    }

    this.#data = new LRUCache<K, Value<Metadata>>({ maxSize: this.#maxCount });
  }

  #clean() {
    while (this.#data.size > this.#maxCount || this.#size > this.#maxSize) {
      const entry = this.#data.shift()?.[1];

      this.#size -= entry?.size ?? 0;
    }
  }

  /**
   * Retrieves the value associated with the specified key from the cache.
   *
   * @param key - The key to lookup in the cache
   * @returns The cached value and metadata if found, undefined otherwise
   */
  get(key: K): Value<Metadata> | undefined {
    return this.#data.get(key);
  }

  /**
   * Sets a key-value pair in the memory cache with associated metadata.
   *
   * @param key - The key to store the value under
   * @param value - The value to store, must be a string or Buffer
   * @param metadata - Associated metadata for the cached entry, must be a object
   * @throws {TypeError} If value is not a string or Buffer
   * @throws {Error} If entry size exceeds configured maxEntrySize
   */
  set(key: K, value: string | Buffer, metadata: Metadata = {} as Metadata): void {
    if (typeof value !== 'string' && !Buffer.isBuffer(value)) {
      throw new TypeError(`MemoryCache value must be a string or Buffer, received ${typeof value}`);
    }

    if (typeof metadata !== 'object' || metadata === null) {
      throw new TypeError(`MemoryCache metadata must be an object, received ${typeof metadata}`);
    }

    const size = Buffer.byteLength(value);

    if (size > this.#maxEntrySize) {
      throw new Error(`MemoryCache entry size exceeds maxEntrySize of ${this.#maxEntrySize} bytes`);
    }

    this.#data.set(key, { value, metadata, size });

    this.#size += size;
    this.#clean();
  }

  /**
   * Deletes an entry from the cache by its key.
   *
   * @param key - The key of the cache entry to delete
   * @returns {boolean} True if an element was removed successfully, false if the key was not found
   *
   * @example
   * ```typescript
   * cache.delete("myKey"); // returns true if key exists and was deleted
   * ```
   */
  delete(key: K): boolean {
    const entry = this.#data.get(key);

    if (!entry) return false;

    this.#size -= entry.size;

    return this.#data.delete(key);
  }

  /**
   * Clears all data from the cache store and resets the size counter to zero.
   * This operation removes all key-value pairs from the internal Map storage.
   */
  clear(): void {
    this.#data.clear();
    this.#size = 0;
  }

  /**
   * Checks if a value exists for the specified key in the cache
   *
   * @param key - The key to check in the cache
   * @returns {boolean} True if the key exists in the cache, false otherwise
   */
  has(key: K): boolean {
    return this.#data.has(key);
  }

  /**
   * Gets the total number of entries stored in the memory cache.
   *
   * @returns {number} The number of key-value pairs currently stored in the cache.
   */
  get size(): number {
    return this.#data.size;
  }

  /**
   * Returns the current byte size of the cache
   *
   * @returns {number} The size of the cache in bytes
   */
  get byteSize(): number {
    return this.#size;
  }
}
