import { test, describe, type TestContext } from 'node:test';
import { LRUCache } from '../src/library/cacheLRU.js';

describe('LRUCache', () => {
  test('constructor should create cache with default settings', (t: TestContext) => {
    t.plan(1);

    // Act
    const cache = new LRUCache({});

    // Assert
    t.assert.strictEqual(cache.size, 0);
  });

  test('constructor should throw error for invalid maxSize', (t: TestContext) => {
    t.plan(2);

    // Assert
    t.assert.throws(() => {
      new LRUCache({ maxSize: -1 });
    }, TypeError);

    t.assert.throws(() => {
      new LRUCache({ maxSize: 1.5 });
    }, TypeError);
  });

  test('set and get should work correctly', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCache<string, number>({});

    // Act
    cache.set('a', 1);

    // Assert
    t.assert.strictEqual(cache.get('a'), 1);
    t.assert.strictEqual(cache.get('b'), undefined);
  });

  test('cache should respect maxSize', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCache<string, number>({ maxSize: 2 });

    // Act
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Assert
    t.assert.strictEqual(cache.get('a'), undefined);
    t.assert.strictEqual(cache.get('b'), 2);
    t.assert.strictEqual(cache.get('c'), 3);
  });

  test('least recently used item should be removed first', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCache<string, number>({ maxSize: 2 });

    // Act
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // makes 'a' most recently used
    cache.set('c', 3);

    // Assert
    t.assert.strictEqual(cache.get('b'), undefined);
    t.assert.strictEqual(cache.get('a'), 1);
    t.assert.strictEqual(cache.get('c'), 3);
  });

  test('shift should remove and return oldest entry', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCache<string, number>({});

    // Act
    cache.set('a', 1);
    cache.set('b', 2);
    // biome-ignore lint/style/noNonNullAssertion: For testing only
    const [key, value] = cache.shift()!;

    // Assert
    t.assert.strictEqual(key, 'a');
    t.assert.strictEqual(value, 1);
    t.assert.strictEqual(cache.size, 1);
  });

  test('delete should remove specific entry', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCache<string, number>({});

    // Act
    cache.set('a', 1);

    // Assert
    t.assert.strictEqual(cache.delete('a'), true);
    t.assert.strictEqual(cache.delete('b'), false);
    t.assert.strictEqual(cache.get('a'), undefined);
  });

  test('clear should remove all entries', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCache<string, number>({});

    // Act
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    // Assert
    t.assert.strictEqual(cache.size, 0);
    t.assert.strictEqual(cache.get('a'), undefined);
  });

  test('has should check existence correctly', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCache<string, number>({});

    // Act
    cache.set('a', 1);

    // Assert
    t.assert.strictEqual(cache.has('a'), true);
    t.assert.strictEqual(cache.has('b'), false);
  });

  test('size should return correct number of items', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCache<string, number>({});

    // Act & Assert
    t.assert.strictEqual(cache.size, 0);
    cache.set('a', 1);
    t.assert.strictEqual(cache.size, 1);
    cache.set('b', 2);
    t.assert.strictEqual(cache.size, 2);
  });

  test('updating an existing key should not increase size', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCache<string, number>({ maxSize: 2 });

    // Act
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 3); // Update existing key

    // Assert
    t.assert.strictEqual(cache.size, 2);
    t.assert.strictEqual(cache.get('a'), 3);
  });

  test('accessing an item should update its recency', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCache<string, number>({ maxSize: 2 });

    // Act
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // Access 'a' to make it most recently used
    cache.set('c', 3); // This should evict 'b'

    // Assert
    t.assert.strictEqual(cache.get('b'), undefined);
    t.assert.strictEqual(cache.get('a'), 1);
    t.assert.strictEqual(cache.get('c'), 3);
  });
});
