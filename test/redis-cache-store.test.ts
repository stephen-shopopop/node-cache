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
    await redis.flushall();
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

  test('set stores string value and metadata with no TTL', async (t: TestContext) => {
    t.plan(3);

    // Arrange
    const key = 'set:string:no-ttl';
    const value = 'some string';
    const metadata = { foo: 'bar', bar: 123 };

    // Act
    await store.set(key, value, metadata);
    const result = await store.get(key);

    // Assert
    t.assert.ok(result, 'Should retrieve stored value');
    t.assert.strictEqual(result?.value, value);
    t.assert.deepStrictEqual(result?.metadata, metadata);
  });

  test('set stores Buffer value and metadata with TTL', async (t: TestContext) => {
    t.plan(3);

    // Arrange
    const key = 'set:buffer:ttl';
    const value = Buffer.from('buffer-data');
    const metadata = { foo: 'buffer', bar: 456 };
    const ttl = 10;

    // Act
    await store.set(key, value, metadata, ttl);
    const result = await store.get(key);

    // Assert
    t.assert.ok(result, 'Should retrieve stored buffer value');
    t.assert.strictEqual(result?.value, value.toString());
    t.assert.deepStrictEqual(result?.metadata, metadata);
  });

  test('set stores with empty metadata object', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const key = 'set:empty:metadata';
    const value = 'empty-metadata';

    // Act
    await store.set(key, value);
    const result = await store.get(key);

    // Assert
    t.assert.ok(result, 'Should retrieve stored value');
    t.assert.deepStrictEqual(result?.metadata, {});
  });

  test('set throws if value exceeds maxEntrySize', async (t: TestContext) => {
    t.plan(1);

    // Arrange
    const key = 'too:large';
    const bigValue = Buffer.alloc(104857600);

    // Act & Assert
    await t.assert.rejects(() => store.set(key, bigValue, {}, 10), /maxEntrySize/);
  });

  test('set stores and overwrites existing key', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const key = 'overwrite:key';
    const value1 = 'first';
    const value2 = 'second';
    const metadata1 = { foo: 'one', bar: 1 };
    const metadata2 = { foo: 'two', bar: 2 };

    // Act
    await store.set(key, value1, metadata1, 60);

    // Overwrite
    await store.set(key, value2, metadata2, 60);
    const result = await store.get(key);

    // Assert overwritten
    t.assert.strictEqual(result?.value, value2);
    t.assert.deepStrictEqual(result?.metadata, metadata2);
  });

  test('findByKey returns value and metadata for existing key', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const key = 'find:existing';
    const value = 'find-value';
    const metadata = { foo: 'find', bar: 99 };
    await store.set(key, value, metadata, 60);

    // Act
    const result = await store.findByKey(key);

    // Assert
    t.assert.ok(result, 'Should return result for existing key');
    t.assert.deepStrictEqual(result, { value, metadata });
  });

  test('findByKey returns undefined for missing key', async (t: TestContext) => {
    t.plan(1);

    // Act
    const result = await store.findByKey('find:missing');

    // Assert
    t.assert.strictEqual(result, undefined);
  });

  test('findByKey cleans up and returns undefined if value expired but metadata exists', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const key = 'find:expired';
    const value = 'expired-value';
    const metadata = { foo: 'expired', bar: 1 };
    await store.set(key, value, metadata, 1);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Act
    const result = await store.findByKey(key);

    // Assert
    t.assert.strictEqual(result, undefined);

    // Metadata should be cleaned up
    const redis = new Redis({ host: '127.0.0.1', port: 6379 });
    const metaKey = `${keyPrefix}metadata:${key}`;
    const metaExists = await redis.exists(metaKey);
    await redis.quit();
    t.assert.strictEqual(metaExists, 0, 'Metadata should be deleted');
  });

  test('findByKey deletes and returns undefined if metadata is corrupted', async (t: TestContext) => {
    t.plan(2);

    // Suppress expected error logs
    t.mock.method(console, 'error', () => {});

    // Arrange
    const key = 'find:corrupt';
    const value = 'corrupt-value';
    const redis = new Redis({ host: '127.0.0.1', port: 6379 });
    const id = randomUUID();
    const metaKey = `${keyPrefix}metadata:${key}`;
    const valueKey = `${keyPrefix}values:${id}`;
    await redis.set(valueKey, value);
    await redis.hset(metaKey, { metadata: '{invalid-json', id });
    await redis.quit();

    // Act
    const result = await store.findByKey(key);

    // Assert
    t.assert.strictEqual(result, undefined);

    // Both metadata and value should be deleted
    const redis2 = new Redis({ host: '127.0.0.1', port: 6379 });
    const metaExists = await redis2.exists(metaKey);
    const valExists = await redis2.exists(valueKey);
    await redis2.quit();
    t.assert.strictEqual(metaExists + valExists, 0, 'Both metadata and value should be deleted');
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
