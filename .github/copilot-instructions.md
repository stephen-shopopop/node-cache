# Copilot Instructions for `node-cache`

## Project Overview

This project implements high-performance, in-memory cache solutions for Node.js, including:
- LRU cache (`LRUCache`)
- LRU cache with TTL (`LRUCacheWithTTL`)
- Memory cache store with metadata and size limits (`MemoryCacheStore`)

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
- **Generate docs**: `npm run docs` (outputs to `/docs`)
- **Update dependencies**: `npm run deps:update`
- **Clean**: `npm run clean`

## Testing

- Uses `node:test` (no Jest, Mocha, etc.)
- Test files: `test/*.test.ts`
- Coverage and multiple reporters supported via CLI options (see below)
- Setup/teardown: `test/setup.js`, `test/teardown.js`

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

## Examples

See `README.md` for usage and API examples.
