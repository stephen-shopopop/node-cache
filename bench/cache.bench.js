// node bench/cache.bench.mjs

import { LRUCacheWithTTL, LRUCache, MemoryCacheStore, SQLiteCacheStore } from '../dist/index.js';
import { bench, run } from 'mitata';
import fs from 'node:fs';

// ===============================
// Cache instance creation
// ===============================
const cacheSqliteMem = new SQLiteCacheStore({ filename: ':memory:', maxCount: 1000 });
const cacheTTL = new LRUCacheWithTTL({ maxSize: 1000, ttl: 10000 });
const cacheLRU = new LRUCache({ maxSize: 1000 });
const cacheMem = new MemoryCacheStore({ maxCount: 1000 });
const sqliteFile = './bench-sqlite-cache.db';
if (fs.existsSync(sqliteFile)) fs.unlinkSync(sqliteFile);
const cacheSqlite = new SQLiteCacheStore({ filename: sqliteFile, maxCount: 1000 });

// --------------------------------------------------
// Key initialization for "hit" tests
// --------------------------------------------------
cacheTTL.set('foo', 42);
cacheLRU.set('foo', 42);
cacheMem.set('foo', 'val');
cacheSqlite.set('foo', 'val');
cacheSqliteMem.set('foo', 'val');

//
// === Benchmarks LRUCacheWithTTL ===
//
bench('LRUCacheWithTTL: set (new key)', () => {
  cacheTTL.set(Math.random().toString(36), Math.random());
}).gc('inner');
bench('LRUCacheWithTTL: set (existing key)', () => {
  cacheTTL.set('foo', 42);
}).gc('inner');
bench('LRUCacheWithTTL: get (hit)', () => {
  cacheTTL.get('foo');
}).gc('inner');
bench('LRUCacheWithTTL: get (miss)', () => {
  cacheTTL.get('notfound');
}).gc('inner');
bench('LRUCacheWithTTL: delete (existing)', () => {
  cacheTTL.delete('foo');
  cacheTTL.set('foo', 42);
}).gc('inner');
bench('LRUCacheWithTTL: delete (missing)', () => {
  cacheTTL.delete('notfound');
}).gc('inner');

//
// === Benchmarks LRUCache (no TTL) ===
//
bench('LRUCache: set (new key)', () => {
  cacheLRU.set(Math.random().toString(36), Math.random());
}).gc('inner');
bench('LRUCache: set (existing key)', () => {
  cacheLRU.set('foo', 42);
}).gc('inner');
bench('LRUCache: get (hit)', () => {
  cacheLRU.get('foo');
}).gc('inner');
bench('LRUCache: get (miss)', () => {
  cacheLRU.get('notfound');
}).gc('inner');
bench('LRUCache: delete (existing)', () => {
  cacheLRU.delete('foo');
  cacheLRU.set('foo', 42);
}).gc('inner');
bench('LRUCache: delete (missing)', () => {
  cacheLRU.delete('notfound');
}).gc('inner');

//
// === Benchmarks MemoryCacheStore ===
//
bench('MemoryCacheStore: set (new key)', () => {
  cacheMem.set(Math.random().toString(36), 'val');
}).gc('inner');
bench('MemoryCacheStore: set (existing key)', () => {
  cacheMem.set('foo', 'val');
}).gc('inner');
bench('MemoryCacheStore: get (hit)', () => {
  cacheMem.get('foo');
}).gc('inner');
bench('MemoryCacheStore: get (miss)', () => {
  cacheMem.get('notfound');
}).gc('inner');
bench('MemoryCacheStore: delete (existing)', () => {
  cacheMem.delete('foo');
  cacheMem.set('foo', 'val');
}).gc('inner');
bench('MemoryCacheStore: delete (missing)', () => {
  cacheMem.delete('notfound');
}).gc('inner');

//
// === Benchmarks SQLiteCacheStore (file) ===
//
bench('SQLiteCacheStore: set (new key)', () => {
  cacheSqlite.set(Math.random().toString(36), 'val');
}).gc('inner');
bench('SQLiteCacheStore: set (existing key)', () => {
  cacheSqlite.set('foo', 'val');
}).gc('inner');
bench('SQLiteCacheStore: get (hit)', () => {
  cacheSqlite.get('foo');
}).gc('inner');
bench('SQLiteCacheStore: get (miss)', () => {
  cacheSqlite.get('notfound');
}).gc('inner');
bench('SQLiteCacheStore: delete (existing)', () => {
  cacheSqlite.delete('foo');
  cacheSqlite.set('foo', 'val');
}).gc('inner');
bench('SQLiteCacheStore: delete (missing)', () => {
  cacheSqlite.delete('notfound');
}).gc('inner');

//
// === Benchmarks SQLiteCacheStore (in-memory) ===
//
bench('SQLiteCacheStore (memory): set (new key)', () => {
  cacheSqliteMem.set(Math.random().toString(36), 'val');
}).gc('inner');
bench('SQLiteCacheStore (memory): set (existing key)', () => {
  cacheSqliteMem.set('foo', 'val');
}).gc('inner');
bench('SQLiteCacheStore (memory): get (hit)', () => {
  cacheSqliteMem.get('foo');
}).gc('inner');
bench('SQLiteCacheStore (memory): get (miss)', () => {
  cacheSqliteMem.get('notfound');
}).gc('inner');
bench('SQLiteCacheStore (memory): delete (existing)', () => {
  cacheSqliteMem.delete('foo');
  cacheSqliteMem.set('foo', 'val');
}).gc('inner');
bench('SQLiteCacheStore (memory): delete (missing)', () => {
  cacheSqliteMem.delete('notfound');
}).gc('inner');

//
// === Complex workflow benchmark (realistic scenario) ===
//
function randomKey() {
  return `k-${Math.floor(Math.random() * 1000)}`;
}

bench('LRUCache: complex workflow', () => {
  const k = randomKey();
  cacheLRU.set(k, Math.random());
  cacheLRU.get(k);
  cacheLRU.set('foo', Math.random());
  cacheLRU.delete('foo');
  cacheLRU.get('notfound');
}).gc('inner');

bench('LRUCacheWithTTL: complex workflow', () => {
  const k = randomKey();
  cacheTTL.set(k, Math.random(), 1000);
  cacheTTL.get(k);
  cacheTTL.set('foo', Math.random(), 500);
  cacheTTL.delete('foo');
  cacheTTL.get('notfound');
}).gc('inner');

bench('MemoryCacheStore: complex workflow', () => {
  const k = randomKey();
  cacheMem.set(k, 'val', { meta: Math.random() });
  cacheMem.get(k);
  cacheMem.set('foo', 'val', { meta: 1 });
  cacheMem.delete('foo');
  cacheMem.get('notfound');
}).gc('inner');

bench('SQLiteCacheStore: complex workflow', () => {
  const k = randomKey();
  cacheSqlite.set(k, 'val', { meta: Math.random() }, 1000);
  cacheSqlite.get(k);
  cacheSqlite.set('foo', 'val', { meta: 1 }, 500);
  cacheSqlite.delete('foo');
  cacheSqlite.get('notfound');
}).gc('inner');

bench('SQLiteCacheStore (memory): complex workflow', () => {
  const k = randomKey();
  cacheSqliteMem.set(k, 'val', { meta: Math.random() }, 1000);
  cacheSqliteMem.get(k);
  cacheSqliteMem.set('foo', 'val', { meta: 1 }, 500);
  cacheSqliteMem.delete('foo');
  cacheSqliteMem.get('notfound');
}).gc('inner');

//
// === Run benchmarks and cleanup ===
//
await run();

cacheSqlite.close();
cacheSqliteMem.close();
if (fs.existsSync(sqliteFile)) fs.unlinkSync(sqliteFile);
