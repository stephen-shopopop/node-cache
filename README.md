[![CI](https://github.com/stephen-shopopop/node-cache/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/stephen-shopopop/node-cache/actions/workflows/ci.yml)

# node-cache

A high-performance, strongly-typed caching library for Node.js, supporting in-memory (LRU, TTL), metadata, and persistent SQLite backends. Designed for reliability, flexibility, and modern TypeScript/ESM workflows.

- ⚡️ Fast in-memory LRU and TTL caches
- 🗃️ Persistent cache with SQLite backend
- 🏷️ Metadata support for all entries
- 📏 Size and entry count limits
- 🧑‍💻 100% TypeScript, ESM & CJS compatible
- 🧪 Simple, robust API for all Node.js projects

## Install

```bash
npm i @stephen-shopopop/cache
```

## Setup

This library requires no special configuration for basic usage.

- Node.js >= 20.17.0
- Compatible with both ESM (`import`) and CommonJS (`require`)
- TypeScript types included
- SQLiteCacheStore available on Node.js > 20.x

### ESM

```js
import { LRUCache } from '@stephen-shopopop/cache';
```

### CommonJS

```js
const { LRUCache } = require('@stephen-shopopop/cache');
```

## Documentation

### Main Classes

#### `LRUCache<K, V>`

A fast in-memory Least Recently Used (LRU) cache. Removes the least recently used item when the maximum size is reached.

- **Constructor:**

  ```typescript
  new LRUCache<K, V>({ maxSize?: number })
  ```

- **Methods:**
  - `set(key, value)`: Add or update a value
  - `get(key)`: Retrieve a value
  - `delete(key)`: Remove a key
  - `clear()`: Clear the cache
  - `has(key)`: Check if a key exists
  - `size`: Number of items

#### `LRUCacheWithTTL<K, V>`

LRU cache with automatic expiration (TTL) for entries. Combines LRU eviction and time-based expiration.

- **Constructor:**

  ```typescript
  new LRUCacheWithTTL<K, V>({ maxSize?: number, ttl?: number, stayAlive?: boolean, cleanupInterval?: number })
  ```

- **Methods:**
  - `set(key, value, ttl?)`: Add a value with optional TTL
  - `get(key)`: Retrieve a value (or undefined if expired)
  - `delete(key)`: Remove a key
  - `clear()`: Clear the cache
  - `has(key)`: Check if a key exists
  - `size`: Number of items

#### `MemoryCacheStore<K, Metadata>`

In-memory cache with LRU policy, supports max size, max entry size, max number of entries, and associated metadata.

- **Constructor:**

  ```typescript
  new MemoryCacheStore<K, Metadata>({ maxCount?: number, maxEntrySize?: number, maxSize?: number })
  ```

- **Methods:**
  - `set(key, value, metadata?)`: Add a value (string or Buffer) with metadata
  - `get(key)`: Retrieve `{ value, metadata, size }` or undefined
  - `delete(key)`: Remove a key
  - `clear()`: Clear the cache
  - `has(key)`: Check if a key exists
  - `size`: Number of items
  - `byteSize`: Total size in bytes

#### `SQLiteCacheStore<Metadata>`

Persistent cache using SQLite as backend, supports metadata, TTL, entry size and count limits.

- **Constructor:**

  ```typescript
  new SQLiteCacheStore<Metadata>({ filename?: string, maxEntrySize?: number, maxCount?: number, timeout?: number })
  ```

- **Methods:**
  - `set(key, value, metadata?, ttl?)`: Add a value (string or Buffer) with metadata and optional TTL
  - `get(key)`: Retrieve `{ value, metadata }` or undefined
  - `delete(key)`: Remove a key
  - `size`: Number of items
  - `close()`: Close the database connection

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

### LRU Cache - ASCII Diagram

```shell
[Most Recent]   [   ...   ]   [Least Recent]
    head  <->  node <-> ... <->  tail
      |                          |
      +---> {key,value}          +---> {key,value}

Eviction: when maxSize is reached, 'tail' is removed (least recently used)
Access:   accessed node is moved to 'head' (most recently used)
```

### MemoryCacheStore - ASCII Diagram

```ascii
+-----------------------------+
|        MemoryCacheStore     |
+-----------------------------+
|  #data: LRUCache<K, Value>  |
|  #maxCount                  |
|  #maxEntrySize              |
|  #maxSize                   |
|  #size                      |
+-----------------------------+
        |         |
        |         +---> [maxCount, maxEntrySize, maxSize] constraints
        |
        +---> LRUCache (internal):
                head <-> node <-> ... <-> tail
                (evicts least recently used)

Each entry:
  {
    key: K,
    value: string | Buffer,
    metadata: object,
    size: number (bytes)
  }

Eviction: when maxCount or maxSize is reached, oldest/oversized entries are removed.
```

### SQLiteCacheStore - ASCII Diagram

```ascii
+-----------------------------+
|      SQLiteCacheStore       |
+-----------------------------+
|  #db: SQLite database       |
|  #maxCount                  |
|  #maxEntrySize              |
|  #timeout                   |
+-----------------------------+
        |
        +---> [SQLite file: cache.db]
                |
                +---> Table: cache_entries
                        +-------------------------------+
                        | key | value | metadata | ttl  |
                        +-------------------------------+

Each entry:
  {
    key: string,
    value: string | Buffer,
    metadata: object,
    ttl: number (ms, optional)
  }

Eviction: when maxCount or maxEntrySize is reached, or TTL expires, entries are deleted from the table.
Persistence: all data is stored on disk in the SQLite file.
```

### LRUCacheWithTTL - ASCII Diagram

```ascii
+-----------------------------+
|      LRUCacheWithTTL        |
+-----------------------------+
|  #data: LRUCache<K, Entry>  |
|  #ttl                       |
|  #cleanupInterval           |
|  #timer                     |
+-----------------------------+
        |
        +---> LRUCache (internal):
                head <-> node <-> ... <-> tail
                (evicts least recently used)

Each entry:
  {
    key: K,
    value: V,
    expiresAt: number (timestamp, ms)
  }

Expiration: entries are removed when their TTL expires (checked on access or by cleanup timer).
Eviction: LRU policy applies when maxSize is reached.
```

## Use Cases

- **API response caching**: Reduce latency and external API calls by caching HTTP responses in memory or on disk.
- **Session storage**: Store user sessions or tokens with TTL for automatic expiration.
- **File or image cache**: Cache processed files, images, or buffers with size limits.
- **Metadata tagging**: Attach custom metadata (timestamps, user info, tags) to each cache entry for advanced logic.
- **Persistent job queue**: Use SQLiteCacheStore to persist jobs or tasks between server restarts.
- **Rate limiting**: Track and limit user actions over time using TTL-based caches.
- **Temporary feature flags**: Store and expire feature flags or toggles dynamically.

## References

- [Least Recently Used (LRU) cache - Wikipedia](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU))
