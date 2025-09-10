/**
 * Configuration options for the LRU (Least Recently Used) Cache.
 *
 * @interface
 * @property {number} [maxSize] - The maximum number of items the cache can hold. When exceeded, least recently used items are removed.
 */
export type LRUCacheOptions = {
  maxSize?: number;
};
