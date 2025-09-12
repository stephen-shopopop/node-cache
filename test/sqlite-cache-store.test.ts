import { afterEach, describe, test, type TestContext } from 'node:test';
import { SQLiteCacheStore, SQLiteConnector } from '../src/index.js';
import { unlinkSync } from 'node:fs';

describe('SQLiteConnector', async () => {
  afterEach(() => {
    // Reset the singleton instance after each test to ensure test isolation
    Reflect.set(SQLiteConnector, '_instance', undefined);
  });

  test('should return singleton instance', (t: TestContext) => {
    t.plan(1);

    // Act
    const connector1 = SQLiteConnector.getInstance();
    const connector2 = SQLiteConnector.getInstance();

    // Assert
    t.assert.strictEqual(connector1, connector2, 'Both instances should be the same');
  });

  test('should throw error for invalid database path', (t: TestContext) => {
    t.plan(1);

    // Act
    const connector = SQLiteConnector.getInstance('/invalid/path/to/db');

    // Assert
    t.assert.throws(() => {
      connector.createConnection();
    }, Error);
  });

  test('should create in-memory database when no path is provided', (t: TestContext) => {
    t.plan(1);

    // Act
    const connector = SQLiteConnector.getInstance();
    const connection = connector.createConnection();

    // Assert
    t.assert.ok(connection.constructor.name === 'DatabaseSync');
  });

  test('should create connection with specified timeout', (t: TestContext) => {
    t.plan(1);

    // Act
    const connector = SQLiteConnector.getInstance(':memory:', 5000);
    const connection = connector.createConnection();

    // Assert
    t.assert.ok(connection.constructor.name === 'DatabaseSync');
  });

  test('should create file-based database connection', (t: TestContext) => {
    t.plan(1);

    // Act
    const connector = SQLiteConnector.getInstance('test-db.sqlite');
    const connection = connector.createConnection();

    // Assert
    t.assert.ok(connection.constructor.name === 'DatabaseSync');

    // Cleanup
    unlinkSync('test-db.sqlite');
  });

  test('should use file already created', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const connector1 = SQLiteConnector.getInstance('test-db.sqlite');
    const connection1 = connector1.createConnection();
    connection1.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT);');
    connection1.exec("INSERT INTO test (name) VALUES ('example');");
    connection1.close();

    // Act
    const connector2 = SQLiteConnector.getInstance('test-db.sqlite');
    const connection2 = connector2.createConnection();
    const result = connection2.prepare('SELECT * FROM test;').all();

    // Assert
    t.assert.strictEqual(result.length, 1);
    connection2.close();

    // Cleanup
    unlinkSync('test-db.sqlite');
  });
});

describe('SQLiteCacheStore', async () => {
  test('should instantiate SQLiteCacheStore with default options', (t: TestContext) => {
    t.plan(1);

    // Act
    const store = new SQLiteCacheStore();

    // Assert
    t.assert.ok(store instanceof SQLiteCacheStore);
    store.close();
  });

  test('should throw on invalid maxEntrySize', (t: TestContext) => {
    t.plan(2);

    // Assert
    t.assert.throws(
      () => new SQLiteCacheStore({ maxEntrySize: -1 }),
      new TypeError('SQLiteCacheStore options.maxEntrySize must be a non-negative integer')
    );

    t.assert.throws(
      () => new SQLiteCacheStore({ maxEntrySize: 3000000000 }), // 3GB
      new TypeError('SQLiteCacheStore options.maxEntrySize must be less than 2gb')
    );
  });

  test('should throw on invalid maxCount', (t: TestContext) => {
    t.plan(1);

    // Assert
    t.assert.throws(
      () => new SQLiteCacheStore({ maxCount: -1 }),
      new TypeError('SqliteCacheStore options.maxCount must be a non-negative integer')
    );
  });

  test('should store and retrieve values', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const store = new SQLiteCacheStore();
    const key = 'test-key';
    const value = 'test-value';
    const metadata = { source: 'test' };

    // Act
    store.set(key, value, metadata);
    const result = store.get(key);

    // Assert
    t.assert.equal(result?.value.toString(), value);
    t.assert.deepEqual(result?.metadata, metadata);

    store.close();
  });

  test('should handle TTL expiration', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const store = new SQLiteCacheStore();
    const now = Date.now();
    const key = 'test-key';
    const value = 'test-value';
    const ttl = 100; // 100ms

    // Act
    store.set(key, value, {}, ttl);
    const beforeExpiry = store.get(key);

    t.mock.method(Date, 'now', () => now + ttl + 10); // Simulate time passage

    const afterExpiry = store.get(key);

    // Assert
    t.assert.ok(beforeExpiry !== undefined);
    t.assert.strictEqual(afterExpiry, undefined);

    store.close();
  });

  test('should delete entries', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const store = new SQLiteCacheStore();
    const key = 'test-key';
    const value = 'test-value';

    // Act
    store.set(key, value);
    const beforeDelete = store.get(key);
    store.delete(key);
    const afterDelete = store.get(key);

    // Assert
    t.assert.ok(beforeDelete !== undefined);
    t.assert.equal(afterDelete, undefined);

    store.close();
  });

  test('should return correct size', (t: TestContext) => {
    t.plan(3);

    // Arrange
    const store = new SQLiteCacheStore();

    // Act & Assert
    t.assert.strictEqual(store.size, 0);

    store.set('key1', 'value1');
    t.assert.strictEqual(store.size, 1);

    store.set('key2', 'value2');
    t.assert.strictEqual(store.size, 2);

    store.close();
  });

  test('should enforce maxEntrySize limit', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const store = new SQLiteCacheStore({ maxEntrySize: 5 });

    // Assert
    t.assert.throws(() => store.set('key', 'too-long-value'), Error);

    store.close();
  });

  test('should enforce maxCount limit', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const store = new SQLiteCacheStore({ maxCount: 2 });

    // Act
    store.set('key1', 'value1');
    store.set('key2', 'value2');
    store.set('key3', 'value3');
    store.set('key4', 'value4');

    // Assert
    t.assert.strictEqual(store.size, 3);
    t.assert.equal(store.get('key1'), undefined);

    store.close();
  });

  test('should not allow operations after close', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const store = new SQLiteCacheStore();

    // Act
    store.close();

    // Assert
    t.assert.throws(() => store.set('a', 'b'), Error);
  });

  test('should update existing entry', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const store = new SQLiteCacheStore();
    store.set('key', 'v1', { meta: 1 });
    store.set('key', 'v2', { meta: 2 });

    // Act
    const result = store.get('key');

    // Assert
    t.assert.strictEqual(result?.value.toString(), 'v2');
    t.assert.deepEqual(result?.metadata, { meta: 2 });

    //  Cleanup
    store.close();
  });

  test('should store and retrieve Buffer values', (t: TestContext) => {
    t.plan(2);

    // Arrange
    const store = new SQLiteCacheStore();
    const buf = Buffer.from('buffer-value');
    store.set('buf-key', buf, { type: 'bin' });

    // Act
    const result = store.get('buf-key');

    // Assert
    t.assert.ok(Buffer.isBuffer(result?.value));
    t.assert.strictEqual(result?.value.toString(), 'buffer-value');

    // Cleanup
    store.close();
  });

  test('should return undefined for missing key', (t: TestContext) => {
    t.plan(1);

    // Arrange
    const store = new SQLiteCacheStore();

    // Act & Assert
    t.assert.equal(store.get('never-existed'), undefined);

    // Cleanup
    store.close();
  });
});
