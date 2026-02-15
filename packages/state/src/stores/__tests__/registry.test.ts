import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useAppRegistryStore,
  registryQueries,
  onAppRegistered,
  onAppUnregistered,
} from '../registry';

const VALID_MANIFEST = {
  id: 'dev.archbase.test-app',
  name: 'test_app',
  version: '0.1.0',
  entrypoint: './src/App.tsx',
  remoteEntry: 'http://localhost:3001/mf-manifest.json',
  displayName: 'Test App',
  icon: 'flask',
};

const VALID_MANIFEST_2 = {
  id: 'dev.archbase.another-app',
  name: 'another_app',
  version: '1.0.0',
  entrypoint: './src/App.tsx',
  remoteEntry: 'http://localhost:3002/mf-manifest.json',
};

const VALID_MANIFEST_3 = {
  id: 'dev.archbase.third-app',
  name: 'third_app',
  version: '0.5.0',
  entrypoint: './src/App.tsx',
  remoteEntry: 'http://localhost:3003/mf-manifest.json',
};

const INVALID_MANIFEST = {
  id: 'BAD ID',
  name: '',
  version: 'not-semver',
};

function getState() {
  return useAppRegistryStore.getState();
}

describe('AppRegistry Store', () => {
  beforeEach(() => {
    getState().clearAll();
  });

  describe('registerManifest', () => {
    it('registers a valid manifest and returns its id', () => {
      const id = getState().registerManifest(VALID_MANIFEST);
      expect(id).toBe('dev.archbase.test-app');
      expect(getState().apps.size).toBe(1);
      expect(getState().apps.get('dev.archbase.test-app')?.name).toBe('test_app');
    });

    it('returns null for invalid manifest', () => {
      const id = getState().registerManifest(INVALID_MANIFEST);
      expect(id).toBeNull();
      expect(getState().apps.size).toBe(0);
    });

    it('accumulates errors for invalid manifests', () => {
      getState().registerManifest(INVALID_MANIFEST);
      getState().registerManifest({ id: 'bad' });
      expect(getState().errors.length).toBe(2);
    });

    it('overwrites existing manifest with same id', () => {
      getState().registerManifest(VALID_MANIFEST);
      const updated = { ...VALID_MANIFEST, version: '2.0.0' };
      getState().registerManifest(updated);
      expect(getState().apps.size).toBe(1);
      expect(getState().apps.get('dev.archbase.test-app')?.version).toBe('2.0.0');
    });

    it('sets source when provided', () => {
      getState().registerManifest(VALID_MANIFEST, 'remote');
      expect(getState().apps.get('dev.archbase.test-app')?.source).toBe('remote');
    });

    it('preserves source from manifest data when no explicit source', () => {
      getState().registerManifest({ ...VALID_MANIFEST, source: 'registry' });
      expect(getState().apps.get('dev.archbase.test-app')?.source).toBe('registry');
    });
  });

  describe('registerManifests', () => {
    it('registers multiple valid manifests', () => {
      const ids = getState().registerManifests([VALID_MANIFEST, VALID_MANIFEST_2]);
      expect(ids).toEqual(['dev.archbase.test-app', 'dev.archbase.another-app']);
      expect(getState().apps.size).toBe(2);
    });

    it('skips invalid manifests and registers valid ones', () => {
      const ids = getState().registerManifests([VALID_MANIFEST, INVALID_MANIFEST, VALID_MANIFEST_2]);
      expect(ids).toEqual(['dev.archbase.test-app', 'dev.archbase.another-app']);
      expect(getState().apps.size).toBe(2);
      expect(getState().errors.length).toBe(1);
    });

    it('returns empty array when all manifests are invalid', () => {
      const ids = getState().registerManifests([INVALID_MANIFEST, { bad: true }]);
      expect(ids).toEqual([]);
    });
  });

  describe('discoverFromUrl', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('fetches, validates, and registers manifest from URL', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(VALID_MANIFEST),
        }),
      );

      const id = await getState().discoverFromUrl('http://example.com/manifest.json');
      expect(id).toBe('dev.archbase.test-app');
      expect(getState().apps.size).toBe(1);
    });

    it('does not update lastDiscoveryAt (only discoverFromUrls does)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(VALID_MANIFEST),
        }),
      );

      await getState().discoverFromUrl('http://example.com/manifest.json');
      expect(getState().lastDiscoveryAt).toBeNull();
    });

    it('returns null and adds error on HTTP error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }),
      );

      const id = await getState().discoverFromUrl('http://example.com/bad.json');
      expect(id).toBeNull();
      expect(getState().errors.length).toBe(1);
      expect(getState().errors[0].message).toContain('404');
    });

    it('returns null and adds error on non-JSON response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.reject(new Error('invalid json')),
        }),
      );

      const id = await getState().discoverFromUrl('http://example.com/bad');
      expect(id).toBeNull();
      expect(getState().errors.length).toBeGreaterThanOrEqual(1);
    });

    it('returns null and adds error on fetch failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const id = await getState().discoverFromUrl('http://unreachable.com/manifest.json');
      expect(id).toBeNull();
      expect(getState().errors.length).toBe(1);
      expect(getState().errors[0].message).toContain('Network error');
    });

    it('handles abort timeout', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const id = await getState().discoverFromUrl('http://slow.com/manifest.json');
      expect(id).toBeNull();
      expect(getState().errors[0].message).toContain('Timeout');
    });

    it('handles non-Error thrown values', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue('string error'));

      const id = await getState().discoverFromUrl('http://example.com/bad');
      expect(id).toBeNull();
      expect(getState().errors[0].message).toContain('string error');
    });
  });

  describe('discoverFromUrls', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('discovers from multiple URLs in parallel', async () => {
      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          callCount++;
          const manifest = callCount === 1 ? VALID_MANIFEST : VALID_MANIFEST_2;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(manifest),
          });
        }),
      );

      const ids = await getState().discoverFromUrls(['http://a.com/m.json', 'http://b.com/m.json']);
      expect(ids).toHaveLength(2);
      expect(getState().status).toBe('ready');
      expect(getState().lastDiscoveryAt).not.toBeNull();
    });

    it('sets status to error when all URLs fail', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

      const ids = await getState().discoverFromUrls(['http://bad1.com', 'http://bad2.com']);
      expect(ids).toEqual([]);
      expect(getState().status).toBe('error');
      expect(getState().lastDiscoveryAt).not.toBeNull();
    });

    it('sets status to ready on partial success', async () => {
      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(VALID_MANIFEST),
            });
          }
          return Promise.reject(new Error('fail'));
        }),
      );

      const ids = await getState().discoverFromUrls(['http://a.com/m.json', 'http://bad.com']);
      expect(ids).toHaveLength(1);
      expect(getState().status).toBe('ready');
      expect(getState().errors.length).toBe(1);
    });

    it('does not interfere with discoverFromUrl status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(VALID_MANIFEST),
        }),
      );

      // discoverFromUrl should not touch lastDiscoveryAt or status
      await getState().discoverFromUrl('http://example.com/m.json');
      expect(getState().status).toBe('idle');
      expect(getState().lastDiscoveryAt).toBeNull();
    });
  });

  describe('error accumulation limit', () => {
    it('caps errors at 100 entries', () => {
      for (let i = 0; i < 120; i++) {
        getState().registerManifest({ id: `BAD ${i}`, name: '', version: 'x' });
      }
      expect(getState().errors.length).toBe(100);
      // Last error should be from the most recent call
      expect(getState().errors[99].message).toContain('Validation failed');
    });
  });

  describe('clearErrors', () => {
    it('clears all errors without affecting apps', () => {
      getState().registerManifest(VALID_MANIFEST);
      getState().registerManifest(INVALID_MANIFEST);
      expect(getState().errors.length).toBe(1);
      expect(getState().apps.size).toBe(1);

      getState().clearErrors();

      expect(getState().errors).toEqual([]);
      expect(getState().apps.size).toBe(1);
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      getState().registerManifests([VALID_MANIFEST, VALID_MANIFEST_2]);
    });

    it('getApp returns manifest by id', () => {
      expect(registryQueries.getApp('dev.archbase.test-app')?.name).toBe('test_app');
    });

    it('getApp returns undefined for unknown id', () => {
      expect(registryQueries.getApp('unknown')).toBeUndefined();
    });

    it('getAppByName finds manifest by name', () => {
      expect(registryQueries.getAppByName('another_app')?.id).toBe('dev.archbase.another-app');
    });

    it('getAppByName returns undefined for unknown name', () => {
      expect(registryQueries.getAppByName('nonexistent')).toBeUndefined();
    });

    it('getAllApps returns all manifests', () => {
      const all = registryQueries.getAllApps();
      expect(all).toHaveLength(2);
    });

    it('hasApp returns true for registered app', () => {
      expect(registryQueries.hasApp('dev.archbase.test-app')).toBe(true);
    });

    it('hasApp returns false for unregistered app', () => {
      expect(registryQueries.hasApp('unknown')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('removes a registered manifest', () => {
      getState().registerManifest(VALID_MANIFEST);
      expect(getState().apps.size).toBe(1);
      getState().unregister('dev.archbase.test-app');
      expect(getState().apps.size).toBe(0);
    });

    it('no-op for non-existent id', () => {
      getState().registerManifest(VALID_MANIFEST);
      getState().unregister('nonexistent');
      expect(getState().apps.size).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('resets all state', () => {
      getState().registerManifests([VALID_MANIFEST, VALID_MANIFEST_2]);
      getState().registerManifest(INVALID_MANIFEST);
      getState().setStatus('ready');

      getState().clearAll();

      expect(getState().apps.size).toBe(0);
      expect(getState().errors).toEqual([]);
      expect(getState().status).toBe('idle');
      expect(getState().lastDiscoveryAt).toBeNull();
    });
  });

  describe('event subscriptions', () => {
    it('onAppRegistered fires when a new app is registered', () => {
      const handler = vi.fn();
      const unsub = onAppRegistered(handler);

      getState().registerManifest(VALID_MANIFEST);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: 'dev.archbase.test-app' }));

      unsub();
    });

    it('onAppRegistered does not fire for overwrite', () => {
      getState().registerManifest(VALID_MANIFEST);

      const handler = vi.fn();
      const unsub = onAppRegistered(handler);

      // Overwrite same id
      getState().registerManifest({ ...VALID_MANIFEST, version: '2.0.0' });
      expect(handler).not.toHaveBeenCalled();

      unsub();
    });

    it('onAppUnregistered fires when an app is removed', () => {
      getState().registerManifest(VALID_MANIFEST);

      const handler = vi.fn();
      const unsub = onAppUnregistered(handler);

      getState().unregister('dev.archbase.test-app');
      expect(handler).toHaveBeenCalledWith('dev.archbase.test-app');

      unsub();
    });

    it('onAppUnregistered does not fire for non-existent id', () => {
      getState().registerManifest(VALID_MANIFEST);

      const handler = vi.fn();
      const unsub = onAppUnregistered(handler);

      getState().unregister('nonexistent');
      expect(handler).not.toHaveBeenCalled();

      unsub();
    });

    it('unsubscribe stops future notifications', () => {
      const handler = vi.fn();
      const unsub = onAppRegistered(handler);
      unsub();

      getState().registerManifest(VALID_MANIFEST);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
