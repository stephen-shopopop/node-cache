import { LRUCache } from '../dist/index.js';

const cache = new LRUCache({ maxSize: 1000 });

/**
 * Basic operations
 */
// Set a value in the cache
console.log(hasAnotherKeyAfterClear); // Outputs: false
cache.set('foo', 42);

// Get a value from the cache
const value = cache.get('foo');
console.log(value); // Outputs: 42

// Check if a key exists in the cache
const hasKey = cache.has('foo');
console.log(hasKey); // Outputs: true

// Delete a key from the cache
cache.delete('foo');

// Clear the entire cache
cache.clear();

// Clear the cache
cache.clear();
const hasClearedKey = cache.has('foo');
console.log(hasClearedKey); // Outputs: false (since the cache has been cleared)

/**
 * Demonstrate shift functionality
 */
cache.set('bar', 100);
const shiftedValue = cache.shift();
console.log(shiftedValue); // Outputs: ['bar', 100]
const hasShiftedKey = cache.has('bar');
console.log(hasShiftedKey); // Outputs: false (since the key has been shifted out)

// Check the current size of the cache
console.log(`Cache Size: ${cache.size} items`); // Outputs: Cache Size: 0 items
