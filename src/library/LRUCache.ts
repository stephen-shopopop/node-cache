import type { LRUCacheOptions } from './definition.js';

/**
 * A Least Recently Used (LRU) cache implementation.
 * Keeps track of how recently entries were accessed and removes the least recently used entry when cache exceeds maxSize.
 *
 * @template K - The type of the keys stored in the cache
 * @template V - The type of the values stored in the cache
 *
 * @example
 *
 * ```typescript
 * const cache = new LRUCache<string, number>({ maxSize: 3 });
 * cache.set('a', 1);
 * cache.get('a'); // Returns 1
 * ```
 *
 * @public
 *
 * Illustration of the design:
 *
 *       entry             entry             entry             entry
 *       ______            ______            ______            ______
 *      | head |.newer => |      |.newer => |      |.newer => | tail |
 *      |  A   |          |  B   |          |  C   |          |  D   |
 *      |______| <= older.|______| <= older.|______| <= older.|______|
 *
 *  removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
 *
 * Architecture Diagram: LRUCache
 *
 * ┌───────────────────────────────────────────────┐
 * │                  LRUCache                    │
 * ├───────────────────────────────────────────────┤
 * │  #cache: Map<K, V>                           │
 * │  #maxSize: number                            │
 * └───────────────────────────────────────────────┘
 *            │
 *            ▼
 *   ┌───────────────────────────────┐
 *   │         Map<K, V>             │
 *   └───────────────────────────────┘
 *
 * - Most recently used entries are at the end (tail), least recently used at the start (head).
 * - When maxSize is reached, the oldest (head) entry is removed on insert.
 * - Accessing an entry moves it to the most recently used position.
 * - All data is stored in memory only.
 */
export class LRUCache<K, V> {
  /**
   * Internal map to store cache entries in insertion order
   * The most recently used entry is at the end (tail) and the least recently used at the beginning (head)
   * @private
   */
  #cache: Map<K, V> = new Map();

  /**
   * Maximum number of items the cache can hold.
   * When the cache exceeds this size, the least recently used item will be removed.
   * Default is Infinity (no limit).
   * @private
   */
  readonly #maxSize = Number.POSITIVE_INFINITY;

  /**
   * Creates a new instance of the LRU Cache.
   *
   * @param options - Configuration options for the LRU Cache
   * @param options.maxSize - The maximum number of items the cache can hold. Must be a non-negative integer.
   * @throws {TypeError} When maxSize is not a non-negative integer
   */
  constructor({ maxSize }: Readonly<LRUCacheOptions>) {
    if (maxSize !== undefined) {
      if (typeof maxSize !== 'number' || !Number.isInteger(maxSize) || maxSize < 0) {
        throw new TypeError('CacheLRU options.maxSize must be a non-negative integer');
      }

      this.#maxSize = maxSize;
    }
  }

  #reorder(key: K): void {
    const entry = this.#cache.get(key);

    if (!entry) return;

    this.#cache.delete(key);
    this.#cache.set(key, entry);
  }

  /**
   * Retrieves the value associated with the specified key from the cache.
   * If the key exists, it will be moved to the most recently used position.
   *
   * @param key - The key to look up in the cache
   * @returns The value associated with the key if it exists, undefined otherwise
   */
  get(key: K): V | undefined {
    if (this.#cache.has(key)) this.#reorder(key);

    return this.#cache.get(key);
  }

  /**
   * Sets a key-value pair in the cache.
   * If the key already exists, it reorders it to maintain LRU order.
   * If the cache exceeds maximum size, it removes the least recently used item.
   *
   * @param key - The key to set in the cache
   * @param value - The value to associate with the key
   */
  set(key: K, value: V): void {
    if (this.#cache.has(key)) this.#reorder(key);
    else if (this.#cache.size >= this.#maxSize) this.shift();

    this.#cache.set(key, value);
  }

  /**
   * Removes and returns the oldest entry (first inserted) from the cache
   * @returns A tuple containing the key and value of the removed entry, or undefined if the cache is empty
   *
   * @example
   *
   * ```typescript
   * const cache = new CacheLRU<string, number>();
   * cache.set('a', 1);
   * cache.set('b', 2);
   * const [key, value] = cache.shift(); // Returns ['a', 1]
   * ```
   */
  shift(): [K, V] | undefined {
    const oldestKey = this.#cache.entries().next().value;

    if (oldestKey !== undefined) {
      this.#cache.delete(oldestKey[0]);

      return oldestKey;
    }

    return undefined;
  }

  /**
   * Removes the specified key and its associated value from the cache.
   *
   * @param key - The key to remove from the cache
   * @returns {boolean} True if the element was successfully removed, false if the key was not found
   */
  delete(key: K): boolean {
    return this.#cache.delete(key);
  }

  /**
   * Removes all key-value entries from the cache.
   *
   * @returns void
   */
  clear(): void {
    this.#cache.clear();
  }

  /**
   * Gets the number of items currently stored in the cache.
   *
   * @returns {number} The total number of cached items.
   */
  get size(): number {
    return this.#cache.size;
  }

  /**
   * Checks if a key exists in the cache
   *
   * @param key - The key to check for existence
   * @returns `true` if the key exists in the cache, `false` otherwise
   */
  has(key: K): boolean {
    return this.#cache.has(key);
  }

  /**
   * Returns an iterator that contains an array of [key, value] pairs for every cache entry.
   * The iterator is iterating over entries in order of the least recently used items first.
   *
   * @returns {IterableIterator<[K, V]>} An iterator containing tuples of key-value pairs
   */
  entries(): IterableIterator<[K, V]> {
    return this.#cache.entries();
  }
}
