import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerStorageProvider,
  getStorageProvider,
  setDefaultProvider,
  listStorageProviders,
  LocalStorageProvider,
} from '../services/storageProviderRegistry';
import type { StorageProvider } from '../services/storageProviderRegistry';

describe('StorageProviderRegistry', () => {
  it('has localStorage registered by default', () => {
    expect(listStorageProviders()).toContain('localStorage');
  });

  it('returns the localStorage provider by default', () => {
    const provider = getStorageProvider();
    expect(provider.name).toBe('localStorage');
  });

  it('throws for unregistered provider', () => {
    expect(() => getStorageProvider('nonexistent')).toThrow(
      'Storage provider "nonexistent" not registered',
    );
  });

  it('registers and retrieves a custom provider', () => {
    const custom: StorageProvider = {
      name: 'custom-test',
      get: async () => null,
      set: async () => {},
      remove: async () => {},
      clear: async () => {},
      keys: async () => [],
    };
    registerStorageProvider(custom);
    expect(getStorageProvider('custom-test')).toBe(custom);
    expect(listStorageProviders()).toContain('custom-test');
  });

  it('setDefaultProvider changes default', () => {
    const custom: StorageProvider = {
      name: 'custom-default',
      get: async () => null,
      set: async () => {},
      remove: async () => {},
      clear: async () => {},
      keys: async () => [],
    };
    registerStorageProvider(custom);
    setDefaultProvider('custom-default');
    expect(getStorageProvider().name).toBe('custom-default');
    // Reset
    setDefaultProvider('localStorage');
  });

  it('setDefaultProvider throws for unregistered name', () => {
    expect(() => setDefaultProvider('nope')).toThrow(
      'Storage provider "nope" not registered',
    );
  });
});

describe('LocalStorageProvider', () => {
  const provider = new LocalStorageProvider('test-prefix:');

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for missing key', async () => {
    expect(await provider.get('missing')).toBeNull();
  });

  it('stores and retrieves a value', async () => {
    await provider.set('name', 'Bob');
    expect(await provider.get<string>('name')).toBe('Bob');
  });

  it('removes a key', async () => {
    await provider.set('temp', 'val');
    await provider.remove('temp');
    expect(await provider.get('temp')).toBeNull();
  });

  it('lists keys with prefix', async () => {
    await provider.set('a', 1);
    await provider.set('b', 2);
    localStorage.setItem('other', 'ignored');
    expect((await provider.keys()).sort()).toEqual(['a', 'b']);
  });

  it('clears only prefixed keys', async () => {
    await provider.set('x', 1);
    localStorage.setItem('other', 'kept');
    await provider.clear();
    expect(await provider.keys()).toEqual([]);
    expect(localStorage.getItem('other')).toBe('kept');
  });
});
