import { test, describe, type TestContext } from 'node:test';
import { MemoryCacheStore } from '../src/library/memory-cache-store.js';

describe('MemoryCacheStore', () => {
  test('constructor - should create instance with default values', (t: TestContext) => {
    t.plan(2);

    // Act
    const cache = new MemoryCacheStore({});

    // Assert
    t.assert.equal(cache.size, 0);
    t.assert.equal(cache.byteSize, 0);
  });

  test('constructor - should throw on invalid options', (t: TestContext) => {
    t.plan(3);

    // Assert
    t.assert.throws(() => new MemoryCacheStore({ maxSize: -1 }), TypeError);
    t.assert.throws(() => new MemoryCacheStore({ maxCount: -1 }), TypeError);
    t.assert.throws(() => new MemoryCacheStore({ maxEntrySize: -1 }), TypeError);
  });

  test('set/get - should store and retrieve string values', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new MemoryCacheStore<string, { timestamp: number }>({});
    const metadata = { timestamp: Date.now() };

    // Act
    cache.set('key1', 'value1', metadata);
    const result = cache.get('key1');

    // Assert
    t.assert.equal(result?.value, 'value1');
    t.assert.deepEqual(result?.metadata, metadata);
  });

  test('set/get - should store and retrieve Buffer values', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new MemoryCacheStore<string>({});
    const buffer = Buffer.from('test');

    // Act
    cache.set('key1', buffer, {});
    const result = cache.get('key1');

    // Assert
    t.assert.ok(Buffer.isBuffer(result?.value));
    t.assert.equal(result?.value.toString(), 'test');
  });

  test('set - should throw on invalid value type', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const cache = new MemoryCacheStore<string>({});

    // Assert
    t.assert.throws(
      // @ts-expect-error Testing invalid type
      () => cache.set('key1', 123, {}),
      TypeError
    );
  });

  test('set - should throw when exceeding maxEntrySize', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const cache = new MemoryCacheStore<string>({ maxEntrySize: 2 });

    // Assert
    t.assert.throws(() => cache.set('key1', 'too long', {}), Error);
  });

  test('delete - should remove entry and update size', (t: TestContext) => {
    t.plan(4);

    // Arrange
    const cache = new MemoryCacheStore<string>({});

    // Act
    cache.set('key1', 'value1', {});

    // Assert
    t.assert.equal(cache.size, 1);
    t.assert.ok(cache.delete('key1'));
    t.assert.equal(cache.size, 0);
    t.assert.equal(cache.byteSize, 0);
  });

  test('has - should check existence of keys', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new MemoryCacheStore<string>({});

    // Act
    cache.set('key1', 'value1', {});

    // Assert
    t.assert.ok(cache.has('key1'));
    t.assert.ok(!cache.has('key2'));
  });

  test('clear - should remove all entries', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new MemoryCacheStore<string>({});
    cache.set('key1', 'value1', {});
    cache.set('key2', 'value2', {});

    // Act
    cache.clear();

    // Assert
    t.assert.equal(cache.size, 0);
    t.assert.equal(cache.byteSize, 0);
  });

  test('size limits - should respect maxCount', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new MemoryCacheStore<string>({ maxCount: 2 });

    // Act
    cache.set('key1', 'value1', {});
    cache.set('key2', 'value2', {});
    cache.set('key3', 'value3', {});

    // Assert
    t.assert.equal(cache.size, 2);
    t.assert.ok(!cache.has('key1'));
  });

  test('size limits - should respect maxSize', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const cache = new MemoryCacheStore<string>({ maxSize: 10 });

    // Act
    cache.set('key1', 'value1', {});
    cache.set('key2', 'value2', {});

    // Assert
    t.assert.ok(cache.byteSize <= 10);
  });

  test('size limits - should respect both maxCount and maxSize', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new MemoryCacheStore<string>({ maxCount: 2, maxSize: 10 });

    // Act
    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    cache.set('key3', 'val3');

    // Assert
    t.assert.equal(cache.size, 1);
    t.assert.ok(cache.byteSize <= 10);
  });

  test('get - should return undefined for non-existent keys', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const cache = new MemoryCacheStore<string>({});

    // Act
    const result = cache.get('nonexistent');

    // Assert
    t.assert.equal(result, undefined);
  });

  test('byteSize - should accurately reflect total byte size', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const cache = new MemoryCacheStore<string>({});

    // Act
    cache.set('key1', '12345', {}); // 5 bytes
    cache.set('key2', Buffer.from('67890'), {}); // 5 bytes

    // Assert
    t.assert.equal(cache.byteSize, 10);
  });

  test('set - should throw on invalid metadata type', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new MemoryCacheStore<string>({});

    // Assert
    t.assert.throws(
      // @ts-expect-error Testing invalid type
      () => cache.set('key1', 'value1', null),
      TypeError
    );

    t.assert.throws(
      // @ts-expect-error Testing invalid type
      () => cache.set('key1', 'value1', 'invalid'),
      TypeError
    );

    t.assert.throws(
      // @ts-expect-error Testing invalid type
      () => cache.set('key1', 'value1', 123),
      TypeError
    );
  });

  test('delete - should return false if key does not exist', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const cache = new MemoryCacheStore<string>({});

    // Act & Assert
    t.assert.equal(cache.delete('notfound'), false);
  });
});
