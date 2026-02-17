import { describe, it, expect, beforeEach } from 'vitest';
import { idbStateStorage } from '../idbStorage';

describe('idbStateStorage', () => {
  beforeEach(async () => {
    await idbStateStorage.removeItem('test-key');
  });

  it('returns null for missing key', async () => {
    expect(await idbStateStorage.getItem('nonexistent')).toBeNull();
  });

  it('round-trip: setItem then getItem', async () => {
    const data = JSON.stringify({ theme: 'dark', language: 'en' });
    await idbStateStorage.setItem('test-key', data);
    expect(await idbStateStorage.getItem('test-key')).toBe(data);
  });

  it('removeItem deletes the entry', async () => {
    await idbStateStorage.setItem('test-key', '"hello"');
    await idbStateStorage.removeItem('test-key');
    expect(await idbStateStorage.getItem('test-key')).toBeNull();
  });

  it('overwrites existing value', async () => {
    await idbStateStorage.setItem('test-key', '"first"');
    await idbStateStorage.setItem('test-key', '"second"');
    expect(await idbStateStorage.getItem('test-key')).toBe('"second"');
  });
});
