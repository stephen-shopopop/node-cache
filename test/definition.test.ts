import { test, type TestContext } from 'node:test';
import type {
  LRUCacheOptions,
  LRUCacheWithTTLOptions,
  MemoryCacheStoreOptions,
  Path,
  RedisCacheStoreOptions,
  SQLiteCacheStoreOptions
} from '../src/index.js';

test('LRUCacheOptions: should accept valid maxSize', (t: TestContext) => {
  t.plan(1);

  // Act
  const opts: LRUCacheOptions = { maxSize: 10 };

  // Assert
  t.assert.equal(typeof opts.maxSize, 'number');
});

test('LRUCacheOptions: should allow empty object', (t: TestContext) => {
  t.plan(1);

  // Act
  const opts: LRUCacheOptions = {};

  // Assert
  t.assert.equal(Object.keys(opts).length, 0);
});

test('LRUCacheWithTTLOptions: should accept all options', (t: TestContext) => {
  t.plan(3);

  // Arrange
  const opts: LRUCacheWithTTLOptions = {
    maxSize: 100,
    ttl: 5000,
    stayAlive: true,
    cleanupInterval: 1000
  };

  // Assert
  t.assert.equal(typeof opts.ttl, 'number');
  t.assert.equal(typeof opts.stayAlive, 'boolean');
  t.assert.equal(typeof opts.cleanupInterval, 'number');
});

test('LRUCacheWithTTLOptions: should extend LRUCacheOptions', (t: TestContext) => {
  t.plan(1);

  // Act
  const opts: LRUCacheWithTTLOptions = { maxSize: 1 };

  // Assert
  t.assert.equal(typeof opts.maxSize, 'number');
});

test('MemoryCacheStoreOptions: should accept all options', (t: TestContext) => {
  t.plan(3);

  // Act
  const opts: MemoryCacheStoreOptions = {
    maxSize: 1024,
    maxCount: 10,
    maxEntrySize: 256
  };

  // Assert
  t.assert.equal(typeof opts.maxSize, 'number');
  t.assert.equal(typeof opts.maxCount, 'number');
  t.assert.equal(typeof opts.maxEntrySize, 'number');
});

test('MemoryCacheStoreOptions: should allow empty object', (t: TestContext) => {
  t.plan(1);

  // Act
  const opts: MemoryCacheStoreOptions = {};

  // Assert
  t.assert.equal(Object.keys(opts).length, 0);
});

test('SQLiteCacheStoreOptions: should accept all options', (t: TestContext) => {
  t.plan(4);

  // Act
  const opts: SQLiteCacheStoreOptions = {
    filename: 'test.db',
    maxEntrySize: 1000,
    maxCount: 5,
    timeout: 2000
  };

  // Assert
  t.assert.equal(typeof opts.filename, 'string');
  t.assert.equal(typeof opts.maxEntrySize, 'number');
  t.assert.equal(typeof opts.maxCount, 'number');
  t.assert.equal(typeof opts.timeout, 'number');
});

test('SQLiteCacheStoreOptions: should allow empty object', (t: TestContext) => {
  t.plan(1);

  // Act
  const opts: SQLiteCacheStoreOptions = {};

  // Assert
  t.assert.equal(Object.keys(opts).length, 0);
});

test('Path: should accept string', (t: TestContext) => {
  t.plan(1);

  // Act
  const p: Path = '/tmp/file.txt';

  // Assert
  t.assert.equal(typeof p, 'string');
});

test('Path: should accept Buffer', (t: TestContext) => {
  t.plan(1);

  // Act
  const p: Path = Buffer.from('abc');

  // Assert
  t.assert.ok(Buffer.isBuffer(p));
});

test('Path: should accept URL', (t: TestContext) => {
  t.plan(1);

  // Act
  const p: Path = new URL('file:///tmp/file.txt');

  // Assert
  t.assert.equal(p.protocol, 'file:');
});

test('RedisCacheStoreOptions: should accept all options', (t: TestContext) => {
  t.plan(6);

  // Arrange
  const errorFn = (_err: unknown) => {};
  const opts: RedisCacheStoreOptions = {
    clientOpts: { host: 'localhost', port: 6379 },
    maxEntrySize: 1024,
    maxSize: 1024 * 1024,
    maxCount: 100,
    tracking: false,
    errorCallback: errorFn
  };

  // Assert
  t.assert.equal(typeof opts.clientOpts, 'object');
  t.assert.equal(typeof opts.maxEntrySize, 'number');
  t.assert.equal(typeof opts.maxSize, 'number');
  t.assert.equal(typeof opts.maxCount, 'number');
  t.assert.equal(typeof opts.tracking, 'boolean');
  t.assert.equal(opts.errorCallback, errorFn);
});

test('RedisCacheStoreOptions: should allow empty object', (t: TestContext) => {
  t.plan(1);

  // Act
  const opts: RedisCacheStoreOptions = {};

  // Assert
  t.assert.equal(Object.keys(opts).length, 0);
});

test('RedisCacheStoreOptions: errorCallback should be callable', (t: TestContext) => {
  t.plan(1);

  let called = false;
  const opts: RedisCacheStoreOptions = {
    errorCallback: () => {
      called = true;
    }
  };

  // Act
  opts.errorCallback?.(new Error('fail'));

  // Assert
  t.assert.ok(called);
});
