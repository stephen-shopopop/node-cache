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
 * Options for configuring an LRU cache with Time-To-Live (TTL) functionality
 * @extends LRUCacheOptions
 * @interface
 *
 * @property {number} [ttl] - Time-to-live in milliseconds for cache entries
 * @property {boolean} [stayAlive] - If true, prevents the cache from being destroyed when empty
 * @property {number} [cleanupInterval] - Interval in milliseconds between cleanup of expired entries
 */
export type LRUCacheWithTTLOptions = LRUCacheOptions & {
  ttl?: number;
  stayAlive?: boolean;
  cleanupInterval?: number;
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
