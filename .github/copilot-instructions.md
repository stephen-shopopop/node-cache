# Copilot Instructions for `node-cache`

## Project Overview

This project implements high-performance, in-memory cache solutions for Node.js, including:
- LRU cache (`LRUCache`)
- LRU cache with TTL (`LRUCacheWithTTL`)
- Memory cache store with metadata and size limits (`MemoryCacheStore`)
- SQLite cache store with metadata and entry size limit (`SQLiteCacheStore`)

## Architecture & Structure

- **Source code**: `src/library/` (main logic), `src/index.ts` (entry point)
- **Tests**: `test/` (all test files use `node:test` and follow `*.test.ts`)
- **Documentation**: `docs/` (generated with TypeDoc, see `npm run docs`)
- **Build**: TypeScript, supports both ESM and CJS, built with `tsup`

## Key Patterns

- All caches use strong typing and explicit size/TTL controls.
- LRU logic is encapsulated in `LRUCache`, reused by other cache types.
- `MemoryCacheStore` supports metadata per entry and byte-size limits.
- Prefer arrow functions for callbacks, single quotes for strings, and always use semicolons.


## Developer Workflows

- **Run tests**: `npm run test` (with coverage)
- **Lint/format**: `npm run lint`, `npm run format` (uses biome)
- **Type check**: `npm run check`
- **Build**: `npm run build`
- **Generate docs**: `npm run docs` (outputs to `/docs`). If you change the public API, always run this command before submitting a PR.
- **Update dependencies**: `npm run deps:update`
- **Clean**: `npm run clean`
- **Bench**: `npm run bench`


## Testing

- Uses `node:test` (no Jest, Mocha, etc.)
- Use `node:assert/strict` for assertions (see example below)
- Test files: `test/*.test.ts`
- Coverage and multiple reporters supported via CLI options (see below)
- Setup/teardown: `test/setup.js`, `test/teardown.js`

### Minimal test example

```js
import test from 'node:test';
import { LRUCache } from '../src/library/LRUCache.js';

test('LRUCache basic set/get', (t: TestContext) => {
  t.plan(1);

  // Arrange
	const cache = new LRUCache({ maxSize: 2 });

  // Act
	cache.set('a', 1);

  // Assert
	t.assert.strictEqual(cache.get('a'), 1);
});
```

## CLI Test Options

- `--concurrency/-c`: Set test concurrency (default: CPUs-1)
- `--coverage/-C`: Enable code coverage
- `--watch/-w`: Watch mode
- `--only/-o`: Only run tests marked as `only`
- `--reporter/-r`: Set reporter (spec, tap, dot, junit, github)
- `--pattern/-p`: Glob for test files (default: `*.test.{js|ts}`)
- `--timeout/-t`: Test timeout (default: 30000ms)
- Coverage thresholds: `--lines`, `--functions`, `--branches` (default: 80)


## Coding Standards

- Use semicolons, single quotes, and arrow functions for callbacks.
- Avoid nested ternary operators for readability.
- Code reviews should be in French and focus on clarity.

## Compatibility

- Tested on Node.js >= 20.17.0

## Examples

See `README.md` for usage and API examples.
