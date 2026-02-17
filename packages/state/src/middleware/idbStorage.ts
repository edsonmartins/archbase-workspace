import { openDB, type IDBPDatabase } from 'idb';
import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'archbase-zustand';
const DB_VERSION = 1;
const STORE_NAME = 'stores';

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
 * Zustand StateStorage implementation backed by IndexedDB.
 * Used with Zustand's `persist` middleware to persist store state
 * beyond the 5MB localStorage limit.
 */
export const idbStateStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      const db = await getDB();
      const value = await db.get(STORE_NAME, name);
      if (value === undefined || value === null) return null;
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return null;
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, value, name);
    } catch {
      // IDB unavailable
    }
  },

  async removeItem(name: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, name);
    } catch {
      // ignore
    }
  },
};
