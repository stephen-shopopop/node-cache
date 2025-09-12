import { expectError, expectAssignable } from 'tsd';
import type {
  LRUCacheOptions,
  LRUCacheWithTTLOptions,
  MemoryCacheStoreOptions,
  SQLiteCacheStoreOptions,
  Path
} from '../dist/index.d.ts';

// LRUCacheOptions
expectAssignable<LRUCacheOptions>({});
expectAssignable<LRUCacheOptions>({ maxSize: 10 });
expectError<LRUCacheOptions>({ maxSize: '10' });

// LRUCacheWithTTLOptions
expectAssignable<LRUCacheWithTTLOptions>({ ttl: 1000, stayAlive: true, cleanupInterval: 100 });
expectAssignable<LRUCacheWithTTLOptions>({ maxSize: 1 });
expectError<LRUCacheWithTTLOptions>({ ttl: 'bar' });

// MemoryCacheStoreOptions
expectAssignable<MemoryCacheStoreOptions>({ maxSize: 1024, maxCount: 10, maxEntrySize: 256 });
expectAssignable<MemoryCacheStoreOptions>({});
expectError<MemoryCacheStoreOptions>({ maxCount: 'baz' });

// SQLiteCacheStoreOptions
expectAssignable<SQLiteCacheStoreOptions>({
  filename: 'test.db',
  maxEntrySize: 1000,
  maxCount: 5,
  timeout: 2000
});
expectAssignable<SQLiteCacheStoreOptions>({});
expectError<SQLiteCacheStoreOptions>({ timeout: 'oops' });

// Path
expectAssignable<Path>('/tmp/file.txt');
expectAssignable<Path>(Buffer.from('abc'));
expectAssignable<Path>(new URL('file:///tmp/file.txt'));
expectError<Path>(123);
