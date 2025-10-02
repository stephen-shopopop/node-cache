import { SQLiteCacheStore } from '../dist/index.js';
import { setTimeout } from 'node:timers/promises';

const cache = new SQLiteCacheStore({
  maxSize: 50 * 1024 * 1024 // 50 MB
});

/**
 * Basic operations
 */
cache.set('exampleKey', JSON.stringify({ data: 'test' }), { metadata: { createdAt: Date.now() } });
const value = cache.get('exampleKey');
console.log(value.value.toString(), value.metadata); // Outputs: exampleData {}

console.log(`Cache Size: ${cache.size} bytes`); // Outputs the current size of the cache

cache.delete('exampleKey');
const hasKeyAfterDelete = cache.get('exampleKey');
console.log(hasKeyAfterDelete); // Outputs: undefined

/**
 * Demonstrate TTL functionality
 */
cache.set('anotherKey', JSON.stringify({ data: 'more test' }), {}, 3000); // Expires in 1 minute

await setTimeout(2000); // Wait for 2 seconds
const hasAnotherKey = cache.get('anotherKey');
console.log(hasAnotherKey.value.toString()); // Outputs: more test

await setTimeout(4000); // Wait for 4 seconds
const hasAnotherKeyAfterExpiry = cache.get('anotherKey');
console.log(hasAnotherKeyAfterExpiry); // Outputs: undefined (since the key has expired)

console.log(`Final Cache Size: ${cache.size} bytes`); // Outputs: 1

cache.delete('anotherKey'); // Clean toUpperCase()

console.log(`Cache Size after cleanup: ${cache.size} bytes`); // Outputs: 0
