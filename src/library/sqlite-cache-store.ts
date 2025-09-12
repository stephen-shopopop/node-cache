import type { DatabaseSync, DatabaseSyncOptions, StatementSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import type { Path, SQLiteCacheStoreOptions } from './definition.js';

/**
 * Creates a require function scoped to the current module's URL.
 * This enables CommonJS-style require() in ESM modules.
 * @const {Function} require - The created require function
 */
const require = createRequire(import.meta.url);

/**
 * The version number of the SQLite cache store implementation.
 * Used to track schema compatibility and migrations.
 * @constant
 * @type {number}
 */
const VERSION = 1;

/**
 * Maximum size in bytes for a cache entry (2GB)
 * @constant {number}
 */
const MAX_ENTRY_SIZE = 2 * 1000 * 1000 * 1000;

/**
 * SQLiteConnector implements a singleton pattern for SQLite database connections.
 * This class manages database connections and ensures only one instance exists.
 *
 * @class SQLiteConnector
 *
 * @example
 * ```typescript
 * const connector = SQLiteConnector.getInstance(':memory:');
 * const db = connector.createConnection();
 * ```
 *
 * @property {SQLiteConnector} #instance - Private static instance of the connector
 * @property {Path} path - Path to the SQLite database file or ':memory:' for in-memory database
 * @property {number | undefined} timeout - Optional timeout value for database operations
 *
 * @throws {Error} If the SQLite database connection cannot be established
 */
export class SQLiteConnector {
  private static _instance: SQLiteConnector;

  private constructor(
    private readonly path: Path,
    private readonly timeout?: number
  ) {}

  /**
   * Returns a singleton instance of SQLiteConnector.
   * If an instance doesn't exist, creates one with the given parameters.
   *
   * @param path - The path to the SQLite database file. Defaults to ':memory:' for in-memory database.
   * @param timeout - Optional timeout value in milliseconds
   * @returns The singleton SQLiteConnector instance
   *
   * @example
   * ```ts
   * const connector = SQLiteConnector.getInstance('/path/to/db', 5000);
   * ```
   */
  static getInstance(path: Path = ':memory:', timeout?: number): SQLiteConnector {
    if (!SQLiteConnector._instance) {
      SQLiteConnector._instance = new SQLiteConnector(path, timeout);
    }

    return SQLiteConnector._instance;
  }

  /**
   * Creates a synchronous SQLite database connection.
   *
   * @returns {DatabaseSync} A new instance of DatabaseSync connected to the specified path
   * @throws {Error} If the database connection cannot be established
   */
  createConnection(): DatabaseSync {
    const DatabaseSync = require('node:sqlite').DatabaseSync as new (
      path: Path,
      args: DatabaseSyncOptions
    ) => DatabaseSync;

    return new DatabaseSync(this.path, { timeout: this.timeout });
  }
}

/**
 * A SQLite-based cache store implementation that provides persistent key-value storage with metadata.
 *
 * This class implements a cache mechanism using SQLite as the underlying storage engine,
 * supporting features like TTL (Time To Live), metadata storage, and automatic pruning
 * of expired or excess entries.
 *
 * @template Metadata - The type of metadata to store alongside cached values. Defaults to Record<PropertyKey, unknown>
 *
 * @example
 * ```typescript
 * const cache = new SQLiteCacheStore({ filename: 'cache.db' });
 *
 * // Store a value with metadata and 1 hour TTL
 * cache.set('key', 'value', { source: 'api' }, 3600000);
 *
 * // Retrieve a value
 * const result = cache.get('key');
 * ```
 *
 * @remarks
 * - Uses SQLite WAL (Write-Ahead Logging) mode for better concurrency
 * - Supports automatic pruning of expired entries
 * - Enforces maximum entry size limits
 * - Provides optional entry count limits
 *
 * @throws {TypeError} When invalid options are provided in the constructor
 * @throws {TypeError} When invalid arguments are provided to set() method
 * @throws {Error} When attempting to store entries larger than maxEntrySize
 */
export class SQLiteCacheStore<Metadata extends object = Record<PropertyKey, unknown>> {
  #db: DatabaseSync;
  #maxEntrySize = MAX_ENTRY_SIZE;
  #maxCount = Number.POSITIVE_INFINITY;
  #countEntriesQuery: StatementSync;
  #deleteExpiredValuesQuery: StatementSync;
  #deleteOldValuesQuery: StatementSync | null = null;
  #deleteByKeyQuery: StatementSync;
  #getValuesQuery: StatementSync;
  #insertValueQuery: StatementSync;
  #updateValueQuery: StatementSync;

  /**
   * Creates a new SQLiteCacheStore instance.
   *
   * @param options - Configuration options for the SQLite cache store
   * @param options.filename - The filename for the SQLite database
   * @param options.timeout - The timeout value for database operations
   * @param options.maxCount - Maximum number of entries allowed in the cache (must be non-negative integer)
   * @param options.maxEntrySize - Maximum size of a single cache entry in bytes (must be non-negative integer < 2GB)
   *
   * @throws {TypeError} When maxEntrySize is not a non-negative integer or exceeds 2GB
   * @throws {TypeError} When maxCount is not a non-negative integer
   *
   * @remarks
   * The constructor initializes the SQLite database with the following optimizations:
   * - WAL journal mode
   * - NORMAL synchronous mode
   * - Memory-based temp store
   * - Database optimization
   *
   * It also creates necessary tables and indexes for cache operations and prepares
   * SQL statements for common operations like get, update, insert, delete, and count.
   */
  constructor(options: Readonly<SQLiteCacheStoreOptions> = {}) {
    const { filename, timeout, maxCount, maxEntrySize } = options;

    if (maxEntrySize !== undefined) {
      if (typeof maxEntrySize !== 'number' || !Number.isInteger(maxEntrySize) || maxEntrySize < 0) {
        throw new TypeError('SQLiteCacheStore options.maxEntrySize must be a non-negative integer');
      }

      if (maxEntrySize > MAX_ENTRY_SIZE) {
        throw new TypeError('SQLiteCacheStore options.maxEntrySize must be less than 2gb');
      }

      this.#maxEntrySize = maxEntrySize;
    }

    if (maxCount !== undefined) {
      if (typeof maxCount !== 'number' || !Number.isInteger(maxCount) || maxCount < 0) {
        throw new TypeError('SqliteCacheStore options.maxCount must be a non-negative integer');
      }
      this.#maxCount = maxCount;
    }

    this.#db = SQLiteConnector.getInstance(filename, timeout).createConnection();

    this.#db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = memory;
      PRAGMA optimize;

      CREATE TABLE IF NOT EXISTS cache_v${VERSION} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value BUF NOT NULL,
        metadata BLOB NOT NULL,
        deleteAt INTEGER NOT NULL,
        cachedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cache_v${VERSION}_getValuesQuery ON cache_v${VERSION}(key, deleteAt);
      CREATE INDEX IF NOT EXISTS idx_cache_v${VERSION}_deleteByUrlQuery ON cache_v${VERSION}(deleteAt);
    `);

    this.#getValuesQuery = this.#db.prepare(`
      SELECT
        id,
        value,
        metadata,
        deleteAt,
        cachedAt
      FROM cache_v${VERSION}
      WHERE
        key = ?
      ORDER BY
        deleteAt ASC
      LIMIT 1
    `);

    this.#updateValueQuery = this.#db.prepare(`
      UPDATE cache_v${VERSION} SET
        value = ?,
        metadata = ?,
        deleteAt = ?,
        cachedAt = ?
      WHERE
        id = ?
    `);

    this.#insertValueQuery = this.#db.prepare(`
      INSERT INTO cache_v${VERSION} (
        key,
        value,
        metadata,
        deleteAt,
        cachedAt
      ) VALUES (?, ?, ?, ?, ?)
    `);

    this.#countEntriesQuery = this.#db.prepare(`SELECT COUNT(*) AS total FROM cache_v${VERSION}`);

    this.#deleteByKeyQuery = this.#db.prepare(`DELETE FROM cache_v${VERSION} WHERE key = ?`);

    this.#deleteExpiredValuesQuery = this.#db.prepare(
      `DELETE FROM cache_v${VERSION} WHERE deleteAt <= ?`
    );

    this.#deleteOldValuesQuery =
      this.#maxCount === Number.POSITIVE_INFINITY
        ? null
        : this.#db.prepare(`
        DELETE FROM cache_v${VERSION}
        WHERE id IN (
          SELECT
            id
          FROM cache_v${VERSION}
          ORDER BY cachedAt DESC
          LIMIT ?
        )
      `);
  }

  /**
   * Prunes the cache by removing expired and old entries.
   * First removes expired values, then if necessary removes older values to maintain cache size limits.
   *
   * The pruning process:
   * 1. Checks if pruning is needed based on maxCount
   * 2. Removes expired values
   * 3. If still needed, removes approximately 10% of oldest entries (minimum 1 entry)
   *
   * @returns {number | bigint} The number of entries removed during pruning
   * @internal
   */
  #prune(): number | bigint {
    if (Number.isFinite(this.#maxCount) && this.size <= this.#maxCount) {
      return 0;
    }

    {
      const removed = this.#deleteExpiredValuesQuery.run(Date.now()).changes;

      if (removed) {
        return removed;
      }
    }

    {
      const removed = this.#deleteOldValuesQuery?.run(
        Math.max(Math.floor(this.#maxCount * 0.1), 1)
      ).changes;

      if (removed) {
        return removed;
      }
    }

    return 0;
  }

  /**
   * Finds a cached value by its key in the SQLite store
   *
   * @param key - The key to search for in the cache
   * @param canBeExpired - If true, returns the entry even if it has expired. Defaults to false
   * @returns The cache entry if found and not expired, undefined otherwise
   * @internal
   */
  #findValue(key: string, canBeExpired = false) {
    const entry = this.#getValuesQuery.get(key) as
      | {
          id: number;
          value: Buffer;
          metadata: string;
          deleteAt: number;
          cachedAt: number;
        }
      | undefined;

    if (entry === undefined) {
      return undefined;
    }

    if (Date.now() >= entry.deleteAt && !canBeExpired) {
      return undefined;
    }

    return entry;
  }

  /**
   * Removes an entry from the SQLite cache store by its key.
   *
   * @param key The key of the cache entry to delete
   */
  delete(key: string) {
    this.#deleteByKeyQuery.run(key);
  }

  /**
   * Retrieves a cached value and its associated metadata by key
   * @param key - The unique identifier to lookup in the cache
   *
   * @returns An object containing the cached value as a Buffer, metadata,
   *          or undefined if the key doesn't exist in the cache
   */
  get(key: string): { value: Buffer; metadata: Metadata } | undefined {
    const entry = this.#findValue(key);

    if (entry === undefined) {
      return undefined;
    }

    return {
      value: Buffer.from(entry.value),
      metadata: JSON.parse(entry.metadata) as Metadata
    };
  }

  /**
   * Sets a value in the SQLite cache store with an optional TTL and metadata.
   *
   * @param key - The key to store the value under
   * @param value - The value to store. Must be a string or Buffer
   * @param metadata - Optional metadata to store with the value
   * @param ttl - Time-to-live in milliseconds. 0 means no expiration
   *
   * @throws {TypeError} If value is not a string or Buffer
   * @throws {TypeError} If TTL is not a non-negative integer
   * @throws {Error} If value size exceeds maxEntrySize
   */
  set(key: string, value: string | Buffer, metadata: Metadata = {} as Metadata, ttl = 0) {
    if (typeof value !== 'string' && !Buffer.isBuffer(value)) {
      throw new TypeError(
        `SQLiteCacheStore value must be a string or Buffer, received ${typeof value}`
      );
    }

    if (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < 0) {
      throw new TypeError('SQLiteCacheStore ttl must be a non-negative integer');
    }

    const valueBuffer = typeof value === 'string' ? Buffer.from(value) : value;

    if (valueBuffer.byteLength > this.#maxEntrySize) {
      throw new Error(
        `SQLiteCacheStore entry size ${valueBuffer.byteLength} exceeds maxEntrySize of ${this.#maxEntrySize}`
      );
    }

    const now = Date.now();
    const deleteAt = ttl > 0 ? now + ttl : Number.POSITIVE_INFINITY;
    const metadataBlob = JSON.stringify(metadata);

    const entry = this.#findValue(key, true);

    if (entry !== undefined) {
      this.#updateValueQuery.run(valueBuffer, metadataBlob, deleteAt, now, entry.id);
    } else {
      this.#prune();
      this.#insertValueQuery.run(key, valueBuffer, metadataBlob, deleteAt, now);
    }
  }

  /**
   * Gets the total number of entries in the cache store.
   *
   * @returns {number} The total count of cache entries
   */
  get size() {
    const { total } = this.#countEntriesQuery.get() as { total: number };

    return total;
  }

  /**
   * Closes the SQLite database connection.
   * This method should be called when the cache store is no longer needed to free up resources.
   */
  close() {
    this.#db.close();
  }
}
