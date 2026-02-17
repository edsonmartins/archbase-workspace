import { openDB, type IDBPDatabase } from 'idb';
import type { StorageProvider } from './storageProviderRegistry';

const DB_NAME = 'archbase-app-storage';
const DB_VERSION = 1;
const STORE_NAME = 'data';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * IndexedDB implementation of the StorageProvider interface.
 * Register with `registerStorageProvider(new IndexedDBProvider())`.
 */
export class IndexedDBProvider implements StorageProvider {
  readonly name = 'indexedDB';
  private readonly prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await getDB();
      const value = await db.get(STORE_NAME, `${this.prefix}${key}`);
      return value !== undefined ? (value as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, value, `${this.prefix}${key}`);
    } catch {
      // IDB unavailable
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, `${this.prefix}${key}`);
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await getDB();
      const allKeys = await db.getAllKeys(STORE_NAME);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      for (const k of allKeys) {
        if ((k as string).startsWith(this.prefix)) {
          tx.store.delete(k);
        }
      }
      await tx.done;
    } catch {
      // ignore
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await getDB();
      const allKeys = await db.getAllKeys(STORE_NAME);
      return (allKeys as string[])
        .filter((k) => k.startsWith(this.prefix))
        .map((k) => k.slice(this.prefix.length));
    } catch {
      return [];
    }
  }
}

/**
 * Async storage service backed by IndexedDB.
 * Scoped by appId, same API pattern as the sync storageService.
 * Suitable for larger data that exceeds the 5MB localStorage limit.
 *
 * Delegates to IndexedDBProvider internally.
 */
export function createAsyncStorageService(appId: string): Omit<IndexedDBProvider, 'name'> {
  return new IndexedDBProvider(`${appId}:`);
}
