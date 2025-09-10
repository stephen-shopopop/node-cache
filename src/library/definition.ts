/**
 * Configuration options for the LRU (Least Recently Used) Cache.
 *
 * @interface
 * @property {number} [maxSize] - The maximum number of items the cache can hold. When exceeded, least recently used items are removed.
 */
export type LRUCacheOptions = {
  maxSize?: number;
};

/**
 * Configuration options for memory cache store.
 *
 * @interface MemoryCacheStoreOptions
 * @property {number} [maxSize] - Maximum size in bytes that the cache can grow to
 * @property {number} [maxCount] - Maximum number of items that can be stored in the cache
 * @property {number} [maxEntrySize] - Maximum size in bytes for a single cache entry
 */
export type MemoryCacheStoreOptions = {
  maxSize?: number;
  maxCount?: number;
  maxEntrySize?: number;
};
