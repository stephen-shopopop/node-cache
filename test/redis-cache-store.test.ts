import test, { describe, type TestContext } from 'node:test';
import {
  addKeyPrefix,
  serializeMetadataKey,
  parseMetadataKey,
  serializeValuesKey
} from '../src/library/redis-cache-store.js';

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
