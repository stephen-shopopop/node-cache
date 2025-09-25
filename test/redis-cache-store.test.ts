import test, { after, before, describe, type TestContext } from 'node:test';
import {
  addKeyPrefix,
  parseMetadataKey,
  RedisCacheStore,
  serializeMetadataKey,
  serializeValuesKey
} from '../src/library/redis-cache-store.js';
import { randomUUID } from 'node:crypto';
import { Redis } from 'iovalkey';

describe('RedisCacheStore utility functions', () => {
  test('addKeyPrefix adds prefix correctly', (t: TestContext) => {
    t.plan(3);

    // Act & Assert
    t.assert.strictEqual(addKeyPrefix('user:123', 'app:'), 'app:user:123');
    t.assert.strictEqual(addKeyPrefix('user:123', ''), 'user:123');
    t.assert.strictEqual(addKeyPrefix('user:123', undefined as unknown as string), 'user:123');
  });

  test('serializeMetadataKey serializes with prefix', (t: TestContext) => {
    t.plan(2);

    // Act & Assert
    t.assert.strictEqual(serializeMetadataKey('user:123', 'app:'), 'app:metadata:user:123');
    t.assert.strictEqual(serializeMetadataKey('user:123', ''), 'metadata:user:123');
  });

  test('serializeValuesKey serializes with prefix', (t: TestContext) => {
    t.plan(3);

    // Act & Assert
    t.assert.strictEqual(serializeValuesKey('user:123', 'app:'), 'app:values:user:123');
    t.assert.strictEqual(serializeValuesKey('user:123', ''), 'values:user:123');
    t.assert.strictEqual(
      serializeValuesKey('user:123', undefined as unknown as string),
      'values:user:123'
    );
  });

  test('parseMetadataKey removes metadata prefix', (t: TestContext) => {
    t.plan(4);

    // Act & Assert
    t.assert.strictEqual(parseMetadataKey('metadata:user:123'), 'user:123');
    t.assert.strictEqual(parseMetadataKey('app:metadata:user:123'), 'user:123');
    t.assert.strictEqual(parseMetadataKey('user:123'), 'user:123');
    t.assert.strictEqual(parseMetadataKey('foo:bar'), 'foo:bar');
  });
});

describe('RedisCacheStore', () => {
  // Use a unique key prefix for isolation
  const keyPrefix = `test:${randomUUID()}:`;

  // Create the store instance
  const store = new RedisCacheStore<{ foo?: string; bar?: number }>({
    clientOpts: { host: '127.0.0.1', port: 6379, keyPrefix },
    maxEntrySize: 1024 * 1024,
    maxCount: 100,
    tracking: true
  });

  // Helper to flush all keys
  const flushAllKeys = async () => {
    const redis = new Redis({ host: '127.0.0.1', port: 6379 });
    // await redis.flushall();
    await redis.quit();
  };

  before(async () => {
    // Clean up before running tests
    await flushAllKeys();
  });

  after(async () => {
    // Clean up after running tests
    await flushAllKeys();
    await store.close();
  });

  test('set and get a string value with metadata', async (t: TestContext) => {
    t.plan(3);

    // Arrange
    const key = 'foo:bar';
    const value = 'hello world';
    const metadata = { foo: 'baz', bar: 42 };

    // Act
    await store.set(key, value, metadata, 60);
    const result = await store.get(key);

    // Assert
    t.assert.ok(result, 'Should retrieve stored value');
    t.assert.strictEqual(result?.value, value);
    t.assert.deepStrictEqual(result?.metadata, metadata);
  });

  test('set and get a Buffer value with metadata', async (t: TestContext) => {
    t.plan(3);

    // Arrange
    const key = 'buffer:key';
    const value = Buffer.from('buffer-value');
    const metadata = { foo: 'buffer', bar: 7 };

    // Act
    await store.set(key, value, metadata, 60);
    const result = await store.get(key);

    // Assert
    t.assert.ok(result, 'Should retrieve stored buffer value');
    t.assert.strictEqual(result?.value, value.toString());
    t.assert.deepStrictEqual(result?.metadata, metadata);
  });

  test('get returns undefined for missing key', async (t: TestContext) => {
    t.plan(1);

    // Act
    const result = await store.get('does:not:exist');

    // Assert
    t.assert.strictEqual(result, undefined);
  });

  test('delete removes value and metadata', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const key = 'delete:me';
    await store.set(key, 'bye', { foo: 'bye' }, 60);

    let result = await store.get(key);

    // Assert exists
    t.assert.ok(result, 'Should exist before delete');

    // Act
    await store.delete(key);
    result = await store.get(key);

    // Assert deleted
    t.assert.strictEqual(result, undefined);
  });

  test('set throws for value exceeding maxEntrySize', async (t: TestContext) => {
    t.plan(1);

    // Arrange
    const key = 'too:big';
    const bigValue = Buffer.alloc(2 * 1024 * 1024); // 2MB, over 1MB limit

    // Act & Assert
    await t.assert.rejects(() => store.set(key, bigValue, {}, 60), /maxEntrySize/);
  });

  test('set throws for invalid value type', async (t: TestContext) => {
    t.plan(1);

    // Act & Assert
    // @ts-expect-error_t
    await t.assert.rejects(() => store.set('bad', 123, {}, 60), /string or Buffer/);
  });

  test('set throws for invalid metadata', async (t: TestContext) => {
    t.plan(1);

    // Act & Assert
    // @ts-expect-error_t
    await t.assert.rejects(() => store.set('bad', 'ok', null, 60), /metadata must be an object/);
  });

  test('set throws for invalid ttl', async (t: TestContext) => {
    t.plan(1);

    // Act & Assert
    await t.assert.rejects(
      () => store.set('bad', 'ok', {}, -1),
      /ttl must be a non-negative integer/
    );
  });

  test('delete is safe for non-existent key', async (t: TestContext) => {
    t.plan(1);

    // Act & Assert
    await t.assert.doesNotReject(() => store.delete('not:found'));
  });

  test('get returns value and metadata for existing key (warm read)', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const key = 'warm:read';
    const value = 'warm-value';
    const metadata = { foo: 'warm', bar: 2 };
    await store.set(key, value, metadata, 60);

    // Prime tracking cache
    await store.get(key);

    // Act
    const result = await store.get(key);

    // Assert
    t.assert.ok(result, 'Should retrieve value from tracking cache');
    t.assert.deepStrictEqual(result, { value, metadata });
  });

  test('get returns undefined for expired key', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const key = 'expire:soon';
    const value = 'temp';
    const metadata = { foo: 'temp', bar: 1 };
    await store.set(key, value, metadata, 1); // 1 second TTL

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Act
    const result = await store.get(key);

    // Assert
    t.assert.strictEqual(result, undefined, 'Should be expired and return undefined');

    // Verify metadata is also gone
    const redis = new Redis({ host: '127.0.0.1', port: 6379 }); // No prefix here
    const metaKey = `metadata:${key}`;
    const metaExists = await redis.exists(metaKey);
    await redis.quit();

    t.assert.strictEqual(metaExists, 0, 'Metadata should also be removed after expiration');
  });

  test('get returns undefined for expired key (cold read)', async (t: TestContext) => {
    t.plan(1);

    // Arrange
    const key = 'expire:soon';
    const value = 'temp';
    const metadata = { foo: 'temp', bar: 1 };
    await store.set(key, value, metadata, 1); // 1 second TTL

    await store.get(key);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Act
    const result = await store.get(key);

    // Assert
    t.assert.strictEqual(result, undefined);
  });

  test('close can be called multiple times safely', async (t: TestContext) => {
    t.plan(1);

    // Arrange
    await store.close();

    // Assert
    await t.assert.doesNotReject(() => store.close());
  });
});

describe('RedisCacheStore constructor validations', () => {
  describe('constructor', () => {
    test('throws if options is not an object', (t: TestContext) => {
      t.plan(1);

      // Act & Assert
      // @ts-expect-error
      t.assert.throws(() => new RedisCacheStore('foo'), /options to be an object/);
    });

    test('throws if maxEntrySize is not a non-negative integer', (t: TestContext) => {
      t.plan(3);

      // Act & Assert
      t.assert.throws(
        () =>
          new RedisCacheStore({
            // @ts-expect-error
            maxEntrySize: 'foo',
            clientOpts: { host: '127.0.0.1', port: 6379 }
          }),
        /maxEntrySize must be a non-negative integer/
      );
      t.assert.throws(
        () =>
          new RedisCacheStore({
            maxEntrySize: -1,
            clientOpts: { host: '127.0.0.1', port: 6379 }
          }),
        /maxEntrySize must be a non-negative integer/
      );
      t.assert.throws(
        () =>
          new RedisCacheStore({
            maxEntrySize: 1.5,
            clientOpts: { host: '127.0.0.1', port: 6379 }
          }),
        /maxEntrySize must be a non-negative integer/
      );
    });

    test('throws if errorCallback is not a function', (t: TestContext) => {
      t.plan(1);

      // Act & Assert
      t.assert.throws(
        () =>
          new RedisCacheStore({
            // @ts-expect-error
            errorCallback: 123,
            clientOpts: { host: '127.0.0.1', port: 6379 }
          }),
        /errorCallback to be a function/
      );
    });
  });
});
