import { LRUCacheWithTTL } from '../dist/index.js';
import { setTimeout } from 'node:timers/promises';

const cache = new LRUCacheWithTTL({ maxSize: 1000, ttl: 2000 });

/**
 * Basic operations
 */
// Set a value in the cache with a TTL of 10 seconds
cache.set('foo', 42);

// Get a value from the cache
const value = cache.get('foo');
console.log(value); // Outputs: 42

// Check if a key exists in the cache
const hasKey = cache.has('foo');
console.log(hasKey); // Outputs: true

// Wait for 5 seconds to let the key expire
await setTimeout(5000);

const expiredValue = cache.get('foo');
console.log(expiredValue); // Outputs: undefined (since the key has expired)

const hasExpiredKey = cache.has('foo');
console.log(hasExpiredKey); // Outputs: false (since the key has expired)

// Clear the cache
cache.clear();
const hasClearedKey = cache.has('foo');
console.log(hasClearedKey); // Outputs: false (since the cache has been cleared)

/**
 * Demonstrate shift functionality
 */
cache.set('bar', 100, 3000); // Set with a custom TTL of 3 seconds
const shiftedValue = cache.shift();
console.log(shiftedValue); // Outputs: ['bar', 100]
const hasShiftedKey = cache.has('bar');
console.log(hasShiftedKey); // Outputs: false (since the key has been shifted out)

// Check the current size of the cache
console.log(`Cache Size: ${cache.size} items`); // Outputs: Cache Size: 0 items
