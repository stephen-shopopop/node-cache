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
// === Run benchmarks and cleanup ===
//
await run();

cacheSqlite.close();
cacheSqliteMem.close();
if (fs.existsSync(sqliteFile)) fs.unlinkSync(sqliteFile);
