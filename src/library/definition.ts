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
 * @property {number} [maxSize] - The maximum number of entries that can be stored in the cache. Default is 1024.
 * @property {number} [ttl] - Time-to-live in milliseconds for cache entries
 * @property {boolean} [stayAlive] - If true, prevents the cache from being destroyed when empty
 * @property {number} [cleanupInterval] - Interval in milliseconds between cleanup of expired entries - Default value is 60000ms (1 minute)
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

/**
 * Configuration options for SQLite cache store
 *
 * @interface SQLiteCacheStoreOptions
 * @property {string} [filename] - The name of the SQLite database file - default is ':memory:' for in-memory database
 * @property {number} [maxEntrySize] - Maximum size of a single cache entry in bytes - default is 2GB
 * @property {number} [maxCount] - Maximum number of entries allowed in the cache - default is unlimited
 * @property {number} [timeout] - Timeout duration in milliseconds for database operations
 */
export type SQLiteCacheStoreOptions = {
  filename?: string;
  maxEntrySize?: number;
  maxCount?: number;
  timeout?: number;
};

/**
 * Represents a file system path that can be a string path, Buffer, or URL.
 * This type is commonly used for file operations and path manipulations.
 *
 * @typedef {(string | Buffer | URL)} Path
 */
export type Path = string | Buffer | URL;
