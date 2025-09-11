import { test, describe, type TestContext } from 'node:test';
import { LRUCacheWithTTL } from '../src/library/LRUCacheWithTTL.js';

describe('LRUCacheWithTTL', () => {
  test('constructor validation', (t: TestContext) => {
    t.plan(4);

    // Act & Assert
    t.assert.throws(() => {
      new LRUCacheWithTTL({ maxSize: -1 });
    }, TypeError);

    t.assert.throws(() => {
      new LRUCacheWithTTL({ ttl: -1 });
    }, TypeError);

    t.assert.throws(() => {
      new LRUCacheWithTTL({ cleanupInterval: 500 });
    }, TypeError);

    t.assert.throws(() => {
      new LRUCacheWithTTL({ stayAlive: 'true' as unknown as boolean });
    }, TypeError);
  });

  test('basic set/get operations', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({ maxSize: 3 });

    // Act
    cache.set('a', 1);
    cache.set('b', 2);

    // Assert
    t.assert.equal(cache.get('a'), 1);
    t.assert.equal(cache.get('b'), 2);
    t.assert.equal(cache.get('c'), undefined);
  });

  test('respects maxSize limit', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({ maxSize: 2 });

    // Act
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Assert
    t.assert.equal(cache.size, 2);
    t.assert.equal(cache.get('a'), undefined);
    t.assert.equal(cache.get('c'), 3);
  });

  test('handles TTL expiration', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({ ttl: 100 });

    // Act
    cache.set('key', 123);

    // Assert
    t.assert.equal(cache.get('key'), 123);

    await new Promise((resolve) => setTimeout(resolve, 150));
    t.assert.equal(cache.get('key'), undefined);
  });

  test('custom TTL per entry', async (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({});

    // Act
    cache.set('short', 1, 100);
    cache.set('long', 2, 200);

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Assert
    t.assert.equal(cache.get('short'), undefined);
    t.assert.equal(cache.get('long'), 2);
  });

  test('has() method', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({});

    // Act
    cache.set('key', 123);

    // Assert
    t.assert.equal(cache.has('key'), true);
    t.assert.equal(cache.has('missing'), false);
  });

  test('delete() method', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({});

    // Act
    cache.set('key', 123);

    // Assert
    t.assert.equal(cache.delete('key'), true);
    t.assert.equal(cache.get('key'), undefined);
    t.assert.equal(cache.delete('missing'), false);
  });

  test('clear() method', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({});

    // Act
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    // Assert
    t.assert.equal(cache.size, 0);
    t.assert.equal(cache.get('a'), undefined);
  });

  test('shift() method', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({});

    cache.set('a', 1);
    cache.set('b', 2);

    // Act
    const shifted = cache.shift();

    // Assert
    t.assert.equal(shifted?.at(1), 1);
    t.assert.equal(cache.get('a'), undefined);
  });

  test('no automatic cleanup when stayAlive is false', async (t: TestContext) => {
    t.plan(2);

    t.mock.timers.enable({ apis: ['setTimeout'] });

    // Arrange
    const now = performance.now();

    const cache = new LRUCacheWithTTL<string, number>({
      ttl: 100,
      cleanupInterval: 1000,
      stayAlive: false
    });

    // Act
    cache.set('key', 123);

    // Simulate performance.now() moving forward
    t.mock.method(performance, 'now', () => now + 150);

    // Advance in time
    t.mock.timers.tick(1001);

    // Assert
    t.assert.equal(cache.size, 1);
    t.assert.equal(cache.get('key'), undefined);
    cache.cancelCleanupTimer();
  });

  test('automatic cleanup when stayAlive is true', async (t: TestContext) => {
    t.plan(2);

    t.mock.timers.enable({ apis: ['setTimeout'] });

    // Arrange
    const now = performance.now();

    const cache = new LRUCacheWithTTL<string, number>({
      ttl: 100,
      cleanupInterval: 1000,
      stayAlive: true
    });

    // Act
    cache.set('key', 123);

    // Simulate performance.now() moving forward
    t.mock.method(performance, 'now', () => now + 110);

    // Advance in time
    t.mock.timers.tick(1001);

    // Assert
    t.assert.equal(cache.size, 0);
    t.assert.equal(cache.get('key'), undefined);
    cache.cancelCleanupTimer();
  });

  test('size property', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const cache = new LRUCacheWithTTL<string, number>({});

    // Act
    cache.set('a', 1);
    cache.set('b', 2);

    // Assert
    t.assert.equal(cache.size, 2);
    cache.delete('a');
    t.assert.equal(cache.size, 1);
    cache.clear();
    t.assert.equal(cache.size, 0);
  });
});
