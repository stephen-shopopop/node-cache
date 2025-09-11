// node bench/lru-cache.js
import { run, bench } from 'mitata';
import { LRUCache } from '../dist/index.js';

const lru = new LRUCache({ maxSize: 2 });
const value = 3;

bench('lru cache set', () => lru.set('key-1', value)).gc('inner');

bench('lru cache get', () => lru.get('key-1')).gc('inner');

bench('lru cache set/get', () => {
  lru.set('key-1', value);
  lru.get('key-1');
}).gc('inner');

bench('lru cache complex', () => {
  lru.set('key-1', value);
  lru.get('key-1');
  lru.set('key-2', value);
  lru.set('key-3', value);
  lru.set('key-4', value);
  lru.get('key-1');
}).gc('inner');

await run();
