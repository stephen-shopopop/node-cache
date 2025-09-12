import { afterEach, describe, test, type TestContext } from 'node:test';
import { SQLiteConnector } from '../src/index.js';
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
