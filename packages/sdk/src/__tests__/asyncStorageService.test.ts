import { describe, it, expect, beforeEach } from 'vitest';
import { createAsyncStorageService, IndexedDBProvider } from '../services/asyncStorageService';

describe('createAsyncStorageService', () => {
  const storage = createAsyncStorageService('test-app');

  beforeEach(async () => {
    await storage.clear();
  });

  it('returns null for missing key', async () => {
    expect(await storage.get('nonexistent')).toBeNull();
  });

  it('stores and retrieves a value', async () => {
    await storage.set('name', 'Alice');
    expect(await storage.get<string>('name')).toBe('Alice');
  });

  it('stores and retrieves complex objects', async () => {
    const data = { items: [1, 2, 3], nested: { ok: true } };
    await storage.set('complex', data);
    expect(await storage.get('complex')).toEqual(data);
  });

  it('removes a key', async () => {
    await storage.set('temp', 'value');
    await storage.remove('temp');
    expect(await storage.get('temp')).toBeNull();
  });

  it('lists keys', async () => {
    await storage.set('a', 1);
    await storage.set('b', 2);
    const keys = await storage.keys();
    expect(keys.sort()).toEqual(['a', 'b']);
  });

  it('clear removes all keys for this app', async () => {
    await storage.set('x', 1);
    await storage.set('y', 2);
    await storage.clear();
    expect(await storage.keys()).toEqual([]);
  });

  it('scopes by appId — different apps do not collide', async () => {
    const storageA = createAsyncStorageService('app-a');
    const storageB = createAsyncStorageService('app-b');
    await storageA.set('key', 'A');
    await storageB.set('key', 'B');
    expect(await storageA.get('key')).toBe('A');
    expect(await storageB.get('key')).toBe('B');
    await storageA.clear();
    await storageB.clear();
  });
});

describe('IndexedDBProvider', () => {
  const provider = new IndexedDBProvider('idb-test:');

  beforeEach(async () => {
    await provider.clear();
  });

  it('has name "indexedDB"', () => {
    expect(provider.name).toBe('indexedDB');
  });

  it('CRUD round-trip', async () => {
    await provider.set('foo', 42);
    expect(await provider.get<number>('foo')).toBe(42);
    await provider.remove('foo');
    expect(await provider.get('foo')).toBeNull();
  });

  it('lists and clears keys', async () => {
    await provider.set('a', 1);
    await provider.set('b', 2);
    expect((await provider.keys()).sort()).toEqual(['a', 'b']);
    await provider.clear();
    expect(await provider.keys()).toEqual([]);
  });
});
