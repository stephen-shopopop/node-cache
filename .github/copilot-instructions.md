# Project Overview

Cache implementation for nodeJs

## Folder Structure

- `/src`: Contains the source code for the frontend.
- `/docs`: Contains documentation for the project.

## Libraries and Frameworks

- Node.js
- TypeScript
- `node:test` for testing
- `biome` for linting and formatting

## Coding Standards

- Use semicolons at the end of each statement.
- Use single quotes for strings.
- Use arrow functions for callbacks.

## Development Commands

### Primary Commands
- `npm run test` - Run unit tests with coverage, excluding fixtures
- `npm run lint` - Run standard linter with biome linter
- `npm run format` - Run standard formatter with biome formatter
- `npm run check` - Run type checks with TypeScript and run lint commands
- `npm run build` - Build the project for production package

## Architecture

### Core Structure

package
├─ src
│  ├─ library
│     ├─ definition.ts
│     ├─ *.ts (source code)
│  ├─ index.ts
├─ test
│  ├─ setup.js
│  ├─ teardown.js
│  ├─ suite tests with suffix *.test.ts
├─ package.json
├─ tsconfig.json

### Key Features
- Multiple reporter support (spec, tap, dot, junit, github)
- Code coverage via node:test
- Watch mode for development

### Test Structure
- Tests use `node:test`
- Test files follow `*.test.{js|ts}` pattern

### TypeScript Support
- Use tsx for running TypeScript files directly
- Supports both ESM and CJS module formats

## Configuration

### CLI Options for testing
- `--concurrency` or `-c`, to set the number of concurrent tests. Defaults to the number of available CPUs minus one.
- `--coverage` or `-C`, enables code coverage. Default is `false`
- `--watch` or `-w`, re-run tests on changes. Default is `false`
- `--only` or `-o`, only run `node:test` with the `only` option set. Default is `false`
- `--forceExit` or `-F`, finished executing even if the event loop would otherwise remain active. Default is `false`
- `--expose-gc`, exposes the gc() function to tests. Default is `false`
- `--reporter` or `-r`, set up a reporter
- `--pattern` or `-p`, run tests matching the given glob pattern. Default is `*.test.{js|ts}`
- `--name`, run tests name matching the given glob pattern. Default is `undefined`. ex: `--name="#myTag"`
- `--timeout` or `-t`, timeouts the tests after a given time. Default is 30000ms
- `--lines`, set the lines threshold when check coverage is active; default is 80
- `--functions`, set the functions threshold when check coverage is active; default is 80
- `--branches`, set the branches threshold when check coverage is active; default is 80
- `--rootDir`, set rootDir to setup and teardown.
