[![npm version](https://img.shields.io/npm/v/@stephen-shopopop/cache.svg)](https://www.npmjs.com/package/@stephen-shopopop/cache)
[![Coverage Status](https://img.shields.io/badge/coverage-96%25-brightgreen)](./)
[![CI](https://github.com/stephen-shopopop/node-cache/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/stephen-shopopop/node-cache/actions/workflows/ci.yml)

# node-cache

A high-performance, strongly-typed caching library for Node.js, supporting in-memory (LRU, TTL), metadata, and persistent SQLite backends. Designed for reliability, flexibility, and modern TypeScript/ESM workflows.

- ⚡️ Fast in-memory LRU and TTL caches
- 🗃️ Persistent cache with SQLite backend
- 🏷️ Metadata support for all entries
- 📏 Size and entry count limits
- 🧑‍💻 100% TypeScript, ESM & CJS compatible
- 🧪 Simple, robust API for all Node.js projects

## Table of Contents

- [node-cache](#node-cache)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Setup](#setup)
    - [ESM](#esm)
    - [CommonJS](#commonjs)
  - [Documentation](#documentation)
    - [Main Classes](#main-classes)
      - [LRUCache\<K, V\>](#lrucachek-v)
      - [LRUCacheWithTTL\<K, V\>](#lrucachewithttlk-v)
      - [MemoryCacheStore\<K, Metadata\>](#memorycachestorek-metadata)
      - [SQLiteCacheStore](#sqlitecachestore)
      - [RedisCacheStore](#rediscachestore)
    - [Common Options](#common-options)
    - [Usage Examples](#usage-examples)
    - [LRU Cache - ASCII Diagram](#lru-cache---ascii-diagram)
    - [MemoryCacheStore - ASCII Diagram](#memorycachestore---ascii-diagram)
    - [SQLiteCacheStore - ASCII Diagram](#sqlitecachestore---ascii-diagram)
    - [LRUCacheWithTTL - ASCII Diagram](#lrucachewithttl---ascii-diagram)
    - [RedisCacheStore - ASCII Diagram](#rediscachestore---ascii-diagram)
  - [Use Cases](#use-cases)
  - [📊 Performance Comparison](#-performance-comparison)
  - [⚠️ Performance limits by backend](#️-performance-limits-by-backend)
  - [FAQ / Troubleshooting](#faq--troubleshooting)
    - [Why is SQLiteCacheStore slower than in-memory caches?](#why-is-sqlitecachestore-slower-than-in-memory-caches)
    - [How can I enable observability (tracing/metrics)?](#how-can-i-enable-observability-tracingmetrics)
    - [I get “ExperimentalWarning: SQLite is an experimental feature”](#i-get-experimentalwarning-sqlite-is-an-experimental-feature)
    - [How do I handle errors from SQLiteCacheStore?](#how-do-i-handle-errors-from-sqlitecachestore)
    - [Can I use this library in a serverless environment?](#can-i-use-this-library-in-a-serverless-environment)
  - [🤝 Contributing / Development](#-contributing--development)
    - [Prerequisites](#prerequisites)
    - [Project Setup](#project-setup)
    - [Useful Scripts](#useful-scripts)
    - [Project Structure](#project-structure)
    - [Best Practices](#best-practices)
      - [Minimal test example (node:test)](#minimal-test-example-nodetest)
    - [Before Submitting a PR](#before-submitting-a-pr)
    - [Release process](#release-process)
    - [Need help?](#need-help)
  - [References](#references)

## Install

```bash
npm i @stephen-shopopop/cache
```

For Redis support, you also need to install iovalkey:

```bash
npm i iovalkey
```

## Setup

This library requires no special configuration for basic usage.

- Node.js >= 20.17.0
- Compatible with both ESM (`import`) and CommonJS (`require`)
- TypeScript types included
- SQLiteCacheStore available on Node.js > 20.x
- **RedisCacheStore requires `iovalkey` package to be installed separately**

For Redis support with RedisCacheStore, install the required dependency:

```bash
npm i iovalkey
```

### ESM

```js
import { LRUCache } from '@stephen-shopopop/cache';
```

### CommonJS

```js
const { LRUCache } = require('@stephen-shopopop/cache');
```

## Documentation

Full API documentation is available here: [📚 Generated Docs](https://stephen-shopopop.github.io/node-cache/)

### Main Classes

#### LRUCache<K, V>

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

#### LRUCacheWithTTL<K, V>

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

#### MemoryCacheStore<K, Metadata>

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

#### SQLiteCacheStore<Metadata>

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

> **Note:** SQLiteCacheStore methods may throw errors related to SQLite (connection, query, file access, etc.).
> It is the responsibility of the user to handle these errors (e.g., with try/catch) according to their application's needs. The library does not catch or wrap SQLite errors by design.

#### RedisCacheStore<Metadata>

Distributed cache based on Redis, supports persistence, TTL, metadata, and entry size/count limits.

> **Prerequisites:** Install `iovalkey` package: `npm i iovalkey`

- **Constructor:**

  ```typescript
  new RedisCacheStore<Metadata>({
    url?: string,
    maxEntrySize?: number,
    maxCount?: number,
    ttl?: number,
    namespace?: string,
    redisOptions?: object
  })
  ```

- **Methods:**
  - `set(key, value, metadata?, ttl?)`: Add a value (string or Buffer) with optional metadata and TTL
  - `get(key)`: Retrieve `{ value, metadata }` or undefined
  - `delete(key)`: Remove a key
  - `close()`: Close the Redis connection

> **Note:** RedisCacheStore requires an accessible Redis server and the `iovalkey` package. Connection or operation errors are thrown as-is.

### Common Options

- `maxSize`: max number of items (LRUCache, LRUCacheWithTTL), max total size in bytes (MemoryCacheStore)
- `maxCount`: max number of entries (MemoryCacheStore)
- `maxEntrySize`: max size of a single entry (MemoryCacheStore)
- `ttl`: time to live in ms (LRUCacheWithTTL)
- `cleanupInterval`: automatic cleanup interval (LRUCacheWithTTL)
- `stayAlive`: keep the timer active (LRUCacheWithTTL)

- `filename`: SQLite database file name (SQLiteCacheStore)
- `timeout`: SQLite operation timeout in ms (SQLiteCacheStore)
- `url`: Redis server URL (RedisCacheStore)
- `namespace`: Key namespace for RedisCacheStore (RedisCacheStore)
- `redisOptions`: Additional options for Redis client (RedisCacheStore)

### Usage Examples

```typescript
import { LRUCache, LRUCacheWithTTL, MemoryCacheStore, RedisCacheStore } from '@stephen-shopopop/cache';

const lru = new LRUCache({ maxSize: 100 });
lru.set('a', 1);

const lruTtl = new LRUCacheWithTTL({ maxSize: 100, ttl: 60000 });
lruTtl.set('a', 1);

const mem = new MemoryCacheStore({ maxCount: 10, maxEntrySize: 1024 });
mem.set('a', 'value', { meta: 123 });

const sqlite = new SQLiteCacheStore({ filename: 'cache.db', maxEntrySize: 1024 });
sqlite.set('a', 'value', { meta: 123 }, 60000);
const result = sqlite.get('a');

const redis = new RedisCacheStore({ url: 'redis://localhost:6379', namespace: 'mycache:' });
await redis.set('a', 'value', { meta: 123 }, 60000);
const redisResult = await redis.get('a');
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

### RedisCacheStore - ASCII Diagram

```ascii
+-----------------------------+
|      RedisCacheStore        |
+-----------------------------+
|  #client: Redis client      |
|  #namespace                 |
|  #maxCount                  |
|  #maxEntrySize              |
|  #ttl                       |
+-----------------------------+
        |
        +---> [Redis server]
                |
                +---> Key: {namespace}{key}
                        Value: JSON.stringify({ value, metadata })
                        TTL: Redis expire (ms)

Each entry:
  {
    key: string,
    value: string | Buffer,
    metadata: object,
    ttl: number (ms, optional)
  }

Expiration: handled by Redis via TTL.
Eviction: handled by Redis according to its memory policy.
Persistence: depends on Redis configuration (AOF, RDB, etc.).
```

## Use Cases

- **API response caching**: Reduce latency and external API calls by caching HTTP responses in memory or on disk.
- **Session storage**: Store user sessions or tokens with TTL for automatic expiration.
- **File or image cache**: Cache processed files, images, or buffers with size limits.
- **Metadata tagging**: Attach custom metadata (timestamps, user info, tags) to each cache entry for advanced logic.
- **Persistent job queue**: Use SQLiteCacheStore to persist jobs or tasks between server restarts.
- **Rate limiting**: Track and limit user actions over time using TTL-based caches.
- **Temporary feature flags**: Store and expire feature flags or toggles dynamically.

## 📊 Performance Comparison

> **Note:** Results below are indicative and may vary depending on your hardware and Node.js version. Run `npm run bench` for up-to-date results on your machine.

| Store                        | set (ops/s) | get (ops/s) | delete (ops/s) | complex workflow (ops/s) |
|------------------------------|-------------|-------------|----------------|--------------------------|
| LRUCache                     | 1,220,000   | 2,030,000   | 1,190,000      | 675,000                  |
| LRUCacheWithTTL              | 1,060,000   | 1,830,000   | 1,030,000      | 615,000                  |
| MemoryCacheStore             | 1,120,000   | 1,910,000   |  182,000       | 305,000                  |
| RedisCacheStore              |    28,000   |    39,000   |   33,000       | 16,500                   |
| SQLiteCacheStore (mem)       |  121,000    |   442,000   |  141,000       | 52,500                   |
| SQLiteCacheStore (file)      |   51,000    |    49,000   |  137,000       | 46,500                   |

*Bench run on Apple M1, Node.js 24.7.0, `npm run bench` — complex workflow = set, get, update, delete, hit/miss, TTL, metadata.*

**How are ops/s calculated?**
For each operation, the benchmark reports the average time per operation (e.g. `1.87 µs/iter`).
To get the number of operations per second (ops/s), we use:

  ops/s = 1 / (average time per operation in seconds)

Example: if the bench reports `856.45 ns/iter`, then:

- 856.45 ns = 0.00000085645 seconds
- ops/s = 1 / 0.00000085645 ≈ 1,168,000

All values in the table are calculated this way and rounded for readability.

## ⚠️ Performance limits by backend

Each backend has different performance characteristics and is suited for different use cases:

| Backend                 | Typical use case                | Max ops/s (indicative) | Latency (typical) | Notes                                 |
|-------------------------|---------------------------------|------------------------|-------------------|---------------------------------------|
| LRUCache                | Hot-path, ultra-fast in-memory  | >1,200,000             | <2µs              | No persistence, no TTL                |
| LRUCacheWithTTL         | In-memory with expiration       | >1,000,000             | <2µs              | TTL adds slight overhead              |
| MemoryCacheStore        | In-memory, metadata, size limit | ~1,100,000             | <2µs              | Metadata, size/count limits           |
| SQLiteCacheStore (mem)  | Fast, ephemeral persistence     | ~120,000               | ~10µs             | Data lost on restart                  |
| SQLiteCacheStore (file) | Durable persistence             | ~50,000                | ~20–50µs          | Disk I/O, best for cold data          |
| RedisCacheStore         | Distributed, persistent cache   | ~27,000                | ~40–100µs         | Network I/O, Redis server, async API  |

**Guidance:**

- Use LRUCache/LRUCacheWithTTL for ultra-low-latency, high-throughput scenarios (API cache, session, etc.).
- Use MemoryCacheStore if you need metadata or strict size limits.
- Use SQLiteCacheStore (memory) for fast, non-persistent cache across processes.
- Use SQLiteCacheStore (file) for persistent cache, but expect higher latency due to disk I/O.
- Use RedisCacheStore for distributed caching, multi-process sharing, and when Redis features or persistence are needed.

*Numbers are indicative, measured on Apple M1, Node.js 24.x. Always benchmark on your own hardware for production sizing.*

## FAQ / Troubleshooting

### Why is SQLiteCacheStore slower than in-memory caches?

SQLite is a disk-based database. Even with optimizations (WAL, memory temp store), disk I/O and serialization add latency compared to pure in-memory caches. For ultra-low-latency needs, use LRUCache or MemoryCacheStore.

### How can I enable observability (tracing/metrics)?

You can instrument the library using [diagnostic_channel](https://www.npmjs.com/package/diagnostic-channel) (Node.js). Future versions may provide built-in hooks. For now, you can wrap cache methods or use diagnostic_channel in your own code to publish events on cache operations.

### I get “ExperimentalWarning: SQLite is an experimental feature”

This warning is from Node.js itself (v20+). SQLite support is stable for most use cases, but the API may change in future Node.js versions. Follow Node.js release notes for updates.

### How do I handle errors from SQLiteCacheStore?

All errors from SQLite (connection, query, file access) are thrown as-is. You should use try/catch around your cache operations and handle errors according to your application’s needs.

### Can I use this library in a serverless environment?

Yes, but persistent caches (SQLiteCacheStore with file) may not be suitable for ephemeral file systems. Use in-memory caches for stateless/serverless workloads.

## 🤝 Contributing / Development

Want to contribute to this library? Thank you! Here’s what you need to know to get started:

### Prerequisites

- Node.js >= 20.17.0
- pnpm or npm (package manager)
- TypeScript (strictly typed everywhere)

### Project Setup

```bash
git clone https://github.com/stephen-shopopop/node-cache.git
cd node-cache
pnpm install # or npm install
```

### Useful Scripts

- `npm run build`: build TypeScript (ESM + CJS via tsup)
- `npm run test`: run all tests (node:test)
- `npm run lint`: check lint (biome)
- `npm run format`: format code
- `npm run check`: type check
- `npm run bench`: run benchmarks
- `npm run docs`: generate documentation (TypeDoc)

### Project Structure

- `src/library/`: main source code (all cache classes)
- `src/index.ts`: entry point
- `test/`: all unit tests (node:test)
- `bench/`: benchmarks (mitata)
- `docs/`: generated documentation

### Best Practices

- Follow the style: semicolons, single quotes, arrow functions for callbacks
- Avoid nested ternary operators
- Always add tests for any new feature or bugfix (see example below)
- Use clear, conventional commit messages (see [Conventional Commits](https://www.conventionalcommits.org/))
- PRs and code reviews are welcome in French or English

#### Minimal test example (node:test)

```js
import test from 'node:test';
import { LRUCache } from '../src/library/LRUCache.js';

test('LRUCache basic set/get', (t: TestContext) => {
  // Arrange
  const cache = new LRUCache({ maxSize: 2 });

  // Act
  cache.set('a', 1);

  // Assert
  t.assert.strictEqual(cache.get('a'), 1);
});
```

### Before Submitting a PR

1. Make sure all tests pass (`npm run test`)
2. Check lint and formatting (`npm run lint && npm run format`)
3. Check coverage (`npm run coverage`)
4. Add/complete documentation if needed
5. Clearly describe your contribution in the PR
6. Use clear, conventional commit messages
7. If your change impacts users, update the README and/or documentation

### Release process

- Releases are tagged and published manually by the maintainer. If you want to help with releases, open an issue or PR.

### Need help?

- Open an [issue](https://github.com/stephen-shopopop/node-cache/issues) or contact the maintainer via GitHub.
- See [pull requests](https://github.com/stephen-shopopop/node-cache/pulls) for ongoing work.

---

## References

- [Least Recently Used (LRU) cache - Wikipedia](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU))
