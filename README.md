[![CI](https://github.com/stephen-shopopop/node-cache/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/stephen-shopopop/node-cache/actions/workflows/ci.yml)

# node-cache

Cache implementation for nodeJs

## Install

```bash
npm i @stephen-shopopop/cache
```

## Usage

### javascript

### typescript

## Documentation

### Main Classes

#### `LRUCache<K, V>`

Simple LRU cache. Removes the least recently used item when the maximum size is reached.

**Constructor:**

```typescript
new LRUCache<K, V>({ maxSize?: number })
```

**Main methods:**

- `set(key, value)`: add or update a value
- `get(key)`: retrieve a value
- `delete(key)`: remove a key
- `clear()`: clear the cache
- `has(key)`: check if a key exists
- `size`: number of items

#### `LRUCacheWithTTL<K, V>`

LRU cache with automatic expiration (TTL) for entries.

**Constructor:**

```typescript
new LRUCacheWithTTL<K, V>({ maxSize?: number, ttl?: number, stayAlive?: boolean, cleanupInterval?: number })
```

**Main methods:**

- `set(key, value, ttl?)`: add a value with optional TTL
- `get(key)`: retrieve a value (or undefined if expired)
- `delete(key)`: remove a key
- `clear()`: clear the cache
- `has(key)`: check if a key exists
- `size`: number of items

#### `MemoryCacheStore<K, Metadata>`

In-memory cache with LRU policy, supports max size, max entry size, max number of entries, and associated metadata.

**Constructor:**

```typescript
new MemoryCacheStore<K, Metadata>({ maxCount?: number, maxEntrySize?: number, maxSize?: number })
```

**Main methods:**

- `set(key, value, metadata?)`: add a value (string or Buffer) with metadata
- `get(key)`: retrieve `{ value, metadata, size }` or undefined
- `delete(key)`: remove a key
- `clear()`: clear the cache
- `has(key)`: check if a key exists
- `size`: number of items
- `byteSize`: total size in bytes

#### `SQLiteCacheStore<Metadata>`

Persistent cache using SQLite as backend, supports metadata, TTL, entry size and count limits.

**Constructor:**

```typescript
new SQLiteCacheStore<Metadata>({ filename?: string, maxEntrySize?: number, maxCount?: number, timeout?: number })
```

**Main methods:**

- `set(key, value, metadata?, ttl?)`: add a value (string or Buffer) with metadata and optional TTL
- `get(key)`: retrieve `{ value, metadata }` or undefined
- `delete(key)`: remove a key
- `size`: number of items
- `close()`: close the database connection

### Common Options

- `maxSize`: max number of items (LRUCache, LRUCacheWithTTL), max total size in bytes (MemoryCacheStore)
- `maxCount`: max number of entries (MemoryCacheStore)
- `maxEntrySize`: max size of a single entry (MemoryCacheStore)
- `ttl`: time to live in ms (LRUCacheWithTTL)
- `cleanupInterval`: automatic cleanup interval (LRUCacheWithTTL)
- `stayAlive`: keep the timer active (LRUCacheWithTTL)

- `filename`: SQLite database file name (SQLiteCacheStore)
- `timeout`: SQLite operation timeout in ms (SQLiteCacheStore)

### Usage Examples

```typescript
import { LRUCache, LRUCacheWithTTL, MemoryCacheStore } from '@stephen-shopopop/cache';

const lru = new LRUCache({ maxSize: 100 });
lru.set('a', 1);

const lruTtl = new LRUCacheWithTTL({ maxSize: 100, ttl: 60000 });
lruTtl.set('a', 1);

const mem = new MemoryCacheStore({ maxCount: 10, maxEntrySize: 1024 });
mem.set('a', 'value', { meta: 123 });

const sqlite = new SQLiteCacheStore({ filename: 'cache.db', maxEntrySize: 1024 });
sqlite.set('a', 'value', { meta: 123 }, 60000);
const result = sqlite.get('a');
```

## Reference
