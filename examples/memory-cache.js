import { MemoryCacheStore } from '../dist/index.js';

const cache = new MemoryCacheStore({ maxCount: 1000 });

// Set a value in the cache
cache.set('foo', 'val', { tag: 'mytag' });

// Get a value from the cache
const value = cache.get('foo');
console.log(value); // Outputs: 'val'

// Get cache size
console.log(`Cache size: ${cache.size}, with size: ${cache.byteSize}`); // Outputs: 'Cache size: 1, with size: 3'

// Check if a key exists in the cache
const hasKey = cache.has('foo');
console.log(hasKey); // Outputs: true

// Delete a key from the cache
cache.delete('foo');
const hasDeletedKey = cache.has('foo');
console.log(hasDeletedKey); // Outputs: false (since the key has been deleted)

// Clear the cache
cache.clear();
const hasClearedKey = cache.has('foo');
console.log(hasClearedKey); // Outputs: false (since the cache has been cleared)
