import { describe, it, expect, beforeEach } from 'vitest';
import { createStorageService } from '../services/storageService';

// ============================================================
// storageService (localStorage wrapper with namespace)
// ============================================================

describe('createStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('get returns parsed JSON value', () => {
    const storage = createStorageService('myapp');
    localStorage.setItem('archbase:myapp:theme', JSON.stringify('dark'));

    expect(storage.get<string>('theme')).toBe('dark');
  });

  it('get returns null for missing key', () => {
    const storage = createStorageService('myapp');

    expect(storage.get('nonexistent')).toBeNull();
  });

  it('get returns null on parse error', () => {
    const storage = createStorageService('myapp');
    localStorage.setItem('archbase:myapp:broken', '{invalid json!!!');

    expect(storage.get('broken')).toBeNull();
  });

  it('set stores serialized value', () => {
    const storage = createStorageService('myapp');
    storage.set('count', 42);

    const raw = localStorage.getItem('archbase:myapp:count');
    expect(raw).toBe('42');
    expect(storage.get<number>('count')).toBe(42);
  });

  it('remove deletes key', () => {
    const storage = createStorageService('myapp');
    storage.set('toDelete', 'value');
    expect(storage.get('toDelete')).toBe('value');

    storage.remove('toDelete');
    expect(storage.get('toDelete')).toBeNull();
    expect(localStorage.getItem('archbase:myapp:toDelete')).toBeNull();
  });

  it('clear removes only keys with matching prefix', () => {
    const storage = createStorageService('myapp');
    storage.set('key1', 'a');
    storage.set('key2', 'b');

    // Add a key from another namespace
    localStorage.setItem('archbase:otherapp:key1', '"c"');
    // Add a non-namespaced key
    localStorage.setItem('unrelated-key', '"d"');

    storage.clear();

    // myapp keys should be gone
    expect(storage.get('key1')).toBeNull();
    expect(storage.get('key2')).toBeNull();
    // Other keys should remain
    expect(localStorage.getItem('archbase:otherapp:key1')).toBe('"c"');
    expect(localStorage.getItem('unrelated-key')).toBe('"d"');
  });

  it('keys returns only keys with matching prefix', () => {
    const storage = createStorageService('myapp');
    storage.set('alpha', 1);
    storage.set('beta', 2);
    storage.set('gamma', 3);

    // Add keys from another namespace
    localStorage.setItem('archbase:otherapp:delta', '"4"');
    localStorage.setItem('unrelated', '"5"');

    const result = storage.keys();
    expect(result).toHaveLength(3);
    expect(result).toContain('alpha');
    expect(result).toContain('beta');
    expect(result).toContain('gamma');
    // Should NOT include keys from other namespaces
    expect(result).not.toContain('delta');
    expect(result).not.toContain('unrelated');
  });

  it('namespace isolation: two services with different appIds do not overlap', () => {
    const storageA = createStorageService('app-a');
    const storageB = createStorageService('app-b');

    storageA.set('shared-key', 'value-from-a');
    storageB.set('shared-key', 'value-from-b');

    // Each service sees only its own value
    expect(storageA.get<string>('shared-key')).toBe('value-from-a');
    expect(storageB.get<string>('shared-key')).toBe('value-from-b');

    // Removing from one does not affect the other
    storageA.remove('shared-key');
    expect(storageA.get('shared-key')).toBeNull();
    expect(storageB.get<string>('shared-key')).toBe('value-from-b');

    // Keys are independent
    storageB.set('extra', 123);
    expect(storageA.keys()).toEqual([]);
    expect(storageB.keys()).toContain('shared-key');
    expect(storageB.keys()).toContain('extra');
    expect(storageB.keys()).toHaveLength(2);

    // Clear from B does not affect other namespaces
    localStorage.setItem('archbase:app-a:resurrected', '"hello"');
    storageB.clear();
    expect(storageB.keys()).toEqual([]);
    expect(storageA.get<string>('resurrected')).toBe('hello');
  });
});
