import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMarketplaceStore } from '../marketplace';
import { useAppRegistryStore } from '../registry';
import type {
  MarketplacePlugin,
  InstalledPlugin,
  RegistryResponse,
} from '@archbase/workspace-types';
import * as manifestSchema from '../../schemas/manifest';

// Helper to get store state directly
function getState() {
  return useMarketplaceStore.getState();
}

// Mock registry store actions
vi.mock('../registry', () => ({
  useAppRegistryStore: {
    getState: vi.fn(() => ({
      registerManifest: vi.fn(),
      unregister: vi.fn(),
    })),
  },
}));

// Mock validate function
vi.spyOn(manifestSchema, 'validateManifestSafe');

describe('MarketplaceStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    getState().reset();
    vi.clearAllMocks();

    // Mock validateManifestSafe to return success by default
    vi.mocked(manifestSchema.validateManifestSafe).mockImplementation((data: unknown) => ({
      success: true,
      data: data as any,
    }));
  });

  // ============================================================
  // Initial State
  // ============================================================

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = getState();

      expect(state.installed).toBeInstanceOf(Map);
      expect(state.installed.size).toBe(0);
      expect(state.ratings).toBeInstanceOf(Map);
      expect(state.ratings.size).toBe(0);
      expect(state.registryUrls).toEqual(['/registry.json']);
      expect(state.registry).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.updates).toEqual([]);
      expect(state.status).toBe('idle');
      expect(state.lastRegistryFetch).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  // ============================================================
  // installPlugin
  // ============================================================

  describe('installPlugin', () => {
    const mockPlugin: MarketplacePlugin = {
      manifest: {
        id: 'com.test.plugin',
        name: 'test-plugin',
        version: '1.0.0',
        entrypoint: './index.js',
        remoteEntry: 'http://localhost:3001/remoteEntry.js',
      },
      downloadUrl: 'http://localhost:3001/plugin.zip',
      publishedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
      downloads: 100,
      rating: 4.5,
      ratingCount: 10,
      categories: ['productivity'],
      featured: false,
    };

    it('should install plugin and add to installed map', async () => {
      await getState().installPlugin(mockPlugin);

      const installed = getState().installed;
      expect(installed.size).toBe(1);
      expect(installed.has('com.test.plugin')).toBe(true);

      const installedPlugin = installed.get('com.test.plugin');
      expect(installedPlugin).toBeDefined();
      expect(installedPlugin?.manifest).toEqual(mockPlugin.manifest);
      expect(installedPlugin?.downloadUrl).toBe(mockPlugin.downloadUrl);
      expect(installedPlugin?.autoUpdate).toBe(true);
      expect(installedPlugin?.installedAt).toBeTypeOf('number');
      expect(installedPlugin?.updatedAt).toBeTypeOf('number');
    });

    it('should call registerManifest on registry store', async () => {
      const mockRegisterManifest = vi.fn();
      vi.mocked(useAppRegistryStore.getState).mockReturnValue({
        registerManifest: mockRegisterManifest,
        unregister: vi.fn(),
      } as any);

      await getState().installPlugin(mockPlugin);

      expect(mockRegisterManifest).toHaveBeenCalledWith(mockPlugin.manifest, 'registry');
      expect(mockRegisterManifest).toHaveBeenCalledTimes(1);
    });

    it('should set installedAt and updatedAt to same timestamp', async () => {
      await getState().installPlugin(mockPlugin);

      const installedPlugin = getState().installed.get('com.test.plugin');
      expect(installedPlugin?.installedAt).toBe(installedPlugin?.updatedAt);
    });
  });

  // ============================================================
  // uninstallPlugin
  // ============================================================

  describe('uninstallPlugin', () => {
    const mockPlugin: MarketplacePlugin = {
      manifest: {
        id: 'com.test.plugin',
        name: 'test-plugin',
        version: '1.0.0',
        entrypoint: './index.js',
        remoteEntry: 'http://localhost:3001/remoteEntry.js',
      },
      downloadUrl: 'http://localhost:3001/plugin.zip',
      publishedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
      downloads: 100,
      rating: 4.5,
      ratingCount: 10,
      categories: ['productivity'],
      featured: false,
    };

    it('should remove plugin from installed map', async () => {
      await getState().installPlugin(mockPlugin);
      expect(getState().installed.size).toBe(1);

      getState().uninstallPlugin('com.test.plugin');
      expect(getState().installed.size).toBe(0);
      expect(getState().installed.has('com.test.plugin')).toBe(false);
    });

    it('should call unregister on registry store', () => {
      const mockUnregister = vi.fn();
      vi.mocked(useAppRegistryStore.getState).mockReturnValue({
        registerManifest: vi.fn(),
        unregister: mockUnregister,
      } as any);

      getState().uninstallPlugin('com.test.plugin');

      expect(mockUnregister).toHaveBeenCalledWith('com.test.plugin');
      expect(mockUnregister).toHaveBeenCalledTimes(1);
    });

    it('should remove plugin from updates list', async () => {
      // Manually set state with plugin in updates
      useMarketplaceStore.setState({
        updates: [
          {
            pluginId: 'com.test.plugin',
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            downloadUrl: 'http://localhost:3001/plugin.zip',
          },
        ],
      });

      expect(getState().updates.length).toBe(1);

      getState().uninstallPlugin('com.test.plugin');

      expect(getState().updates.length).toBe(0);
    });

    it('should not throw if plugin is not installed', () => {
      expect(() => getState().uninstallPlugin('non.existent.plugin')).not.toThrow();
    });
  });

  // ============================================================
  // ratePlugin
  // ============================================================

  describe('ratePlugin', () => {
    it('should add rating to ratings map', () => {
      getState().ratePlugin('com.test.plugin', 4, 'Great plugin!');

      const ratings = getState().ratings;
      expect(ratings.size).toBe(1);
      expect(ratings.has('com.test.plugin')).toBe(true);

      const rating = ratings.get('com.test.plugin');
      expect(rating?.pluginId).toBe('com.test.plugin');
      expect(rating?.rating).toBe(4);
      expect(rating?.review).toBe('Great plugin!');
      expect(rating?.createdAt).toBeTypeOf('number');
    });

    it('should clamp rating to 1-5 range (lower bound)', () => {
      getState().ratePlugin('com.test.plugin', 0);

      const rating = getState().ratings.get('com.test.plugin');
      expect(rating?.rating).toBe(1);
    });

    it('should clamp rating to 1-5 range (upper bound)', () => {
      getState().ratePlugin('com.test.plugin', 10);

      const rating = getState().ratings.get('com.test.plugin');
      expect(rating?.rating).toBe(5);
    });

    it('should allow rating without review', () => {
      getState().ratePlugin('com.test.plugin', 3);

      const rating = getState().ratings.get('com.test.plugin');
      expect(rating?.rating).toBe(3);
      expect(rating?.review).toBeUndefined();
    });

    it('should update existing rating', () => {
      getState().ratePlugin('com.test.plugin', 3, 'Good');
      const firstRating = getState().ratings.get('com.test.plugin');

      getState().ratePlugin('com.test.plugin', 5, 'Excellent!');
      const secondRating = getState().ratings.get('com.test.plugin');

      expect(getState().ratings.size).toBe(1);
      expect(secondRating?.rating).toBe(5);
      expect(secondRating?.review).toBe('Excellent!');
      expect(secondRating?.createdAt).toBeGreaterThanOrEqual(firstRating!.createdAt);
    });
  });

  // ============================================================
  // isInstalled
  // ============================================================

  describe('isInstalled', () => {
    const mockPlugin: MarketplacePlugin = {
      manifest: {
        id: 'com.test.plugin',
        name: 'test-plugin',
        version: '1.0.0',
        entrypoint: './index.js',
        remoteEntry: 'http://localhost:3001/remoteEntry.js',
      },
      downloadUrl: 'http://localhost:3001/plugin.zip',
      publishedAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
      downloads: 100,
      rating: 4.5,
      ratingCount: 10,
      categories: ['productivity'],
      featured: false,
    };

    it('should return true for installed plugin', async () => {
      await getState().installPlugin(mockPlugin);
      expect(getState().isInstalled('com.test.plugin')).toBe(true);
    });

    it('should return false for non-installed plugin', () => {
      expect(getState().isInstalled('com.nonexistent.plugin')).toBe(false);
    });
  });

  // ============================================================
  // getInstalled
  // ============================================================

  describe('getInstalled', () => {
    it('should return empty array when no plugins installed', () => {
      expect(getState().getInstalled()).toEqual([]);
    });

    it('should return array of installed plugins', async () => {
      const mockPlugin1: MarketplacePlugin = {
        manifest: {
          id: 'com.test.plugin1',
          name: 'test-plugin-1',
          version: '1.0.0',
          entrypoint: './index.js',
          remoteEntry: 'http://localhost:3001/remoteEntry.js',
        },
        downloadUrl: 'http://localhost:3001/plugin1.zip',
        publishedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        downloads: 100,
        rating: 4.5,
        ratingCount: 10,
        categories: ['productivity'],
        featured: false,
      };

      const mockPlugin2: MarketplacePlugin = {
        manifest: {
          id: 'com.test.plugin2',
          name: 'test-plugin-2',
          version: '2.0.0',
          entrypoint: './index.js',
          remoteEntry: 'http://localhost:3002/remoteEntry.js',
        },
        downloadUrl: 'http://localhost:3002/plugin2.zip',
        publishedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        downloads: 200,
        rating: 4.8,
        ratingCount: 20,
        categories: ['utilities'],
        featured: true,
      };

      await getState().installPlugin(mockPlugin1);
      await getState().installPlugin(mockPlugin2);

      const installed = getState().getInstalled();
      expect(installed).toHaveLength(2);
      expect(installed.map(p => p.manifest.id)).toContain('com.test.plugin1');
      expect(installed.map(p => p.manifest.id)).toContain('com.test.plugin2');
    });
  });

  // ============================================================
  // addRegistryUrl / removeRegistryUrl
  // ============================================================

  describe('addRegistryUrl', () => {
    it('should add new registry URL', () => {
      getState().addRegistryUrl('https://example.com/registry.json');

      expect(getState().registryUrls).toContain('https://example.com/registry.json');
      expect(getState().registryUrls).toHaveLength(2); // initial + new
    });

    it('should not add duplicate URLs', () => {
      getState().addRegistryUrl('https://example.com/registry.json');
      getState().addRegistryUrl('https://example.com/registry.json');

      const urls = getState().registryUrls.filter(u => u === 'https://example.com/registry.json');
      expect(urls).toHaveLength(1);
    });

    it('should not modify state if URL already exists', () => {
      const initialUrls = getState().registryUrls;
      getState().addRegistryUrl('/registry.json'); // Already exists in initial state

      expect(getState().registryUrls).toBe(initialUrls); // Same reference, no change
    });
  });

  describe('removeRegistryUrl', () => {
    it('should remove registry URL', () => {
      getState().addRegistryUrl('https://example.com/registry.json');
      expect(getState().registryUrls).toContain('https://example.com/registry.json');

      getState().removeRegistryUrl('https://example.com/registry.json');
      expect(getState().registryUrls).not.toContain('https://example.com/registry.json');
    });

    it('should not throw if URL does not exist', () => {
      expect(() => getState().removeRegistryUrl('https://nonexistent.com/registry.json')).not.toThrow();
    });

    it('should be able to remove default registry URL', () => {
      expect(getState().registryUrls).toContain('/registry.json');

      getState().removeRegistryUrl('/registry.json');
      expect(getState().registryUrls).not.toContain('/registry.json');
    });
  });

  // ============================================================
  // checkUpdates
  // ============================================================

  describe('checkUpdates', () => {
    it('should detect available updates', async () => {
      const mockPlugin: MarketplacePlugin = {
        manifest: {
          id: 'com.test.plugin',
          name: 'test-plugin',
          version: '1.0.0',
          entrypoint: './index.js',
          remoteEntry: 'http://localhost:3001/remoteEntry.js',
        },
        downloadUrl: 'http://localhost:3001/plugin.zip',
        publishedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        downloads: 100,
        rating: 4.5,
        ratingCount: 10,
        categories: ['productivity'],
        featured: false,
      };

      // Install old version
      await getState().installPlugin(mockPlugin);

      // Set registry with new version
      const newVersionPlugin: MarketplacePlugin = {
        ...mockPlugin,
        manifest: { ...mockPlugin.manifest, version: '2.0.0' },
      };

      useMarketplaceStore.setState({ registry: [newVersionPlugin] });

      // Check updates
      getState().checkUpdates();

      const updates = getState().updates;
      expect(updates).toHaveLength(1);
      expect(updates[0].pluginId).toBe('com.test.plugin');
      expect(updates[0].currentVersion).toBe('1.0.0');
      expect(updates[0].latestVersion).toBe('2.0.0');
    });

    it('should not detect updates for current versions', async () => {
      const mockPlugin: MarketplacePlugin = {
        manifest: {
          id: 'com.test.plugin',
          name: 'test-plugin',
          version: '1.0.0',
          entrypoint: './index.js',
          remoteEntry: 'http://localhost:3001/remoteEntry.js',
        },
        downloadUrl: 'http://localhost:3001/plugin.zip',
        publishedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        downloads: 100,
        rating: 4.5,
        ratingCount: 10,
        categories: ['productivity'],
        featured: false,
      };

      await getState().installPlugin(mockPlugin);
      useMarketplaceStore.setState({ registry: [mockPlugin] });

      getState().checkUpdates();

      expect(getState().updates).toHaveLength(0);
    });

    it('should clear updates for non-installed plugins', async () => {
      // Manually set an update
      useMarketplaceStore.setState({
        updates: [
          {
            pluginId: 'com.nonexistent.plugin',
            currentVersion: '1.0.0',
            latestVersion: '2.0.0',
            downloadUrl: 'http://localhost:3001/plugin.zip',
          },
        ],
        registry: [],
      });

      getState().checkUpdates();

      expect(getState().updates).toHaveLength(0);
    });
  });

  // ============================================================
  // reset
  // ============================================================

  describe('reset', () => {
    it('should clear all state to initial values', async () => {
      const mockPlugin: MarketplacePlugin = {
        manifest: {
          id: 'com.test.plugin',
          name: 'test-plugin',
          version: '1.0.0',
          entrypoint: './index.js',
          remoteEntry: 'http://localhost:3001/remoteEntry.js',
        },
        downloadUrl: 'http://localhost:3001/plugin.zip',
        publishedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        downloads: 100,
        rating: 4.5,
        ratingCount: 10,
        categories: ['productivity'],
        featured: false,
      };

      // Populate store with data
      await getState().installPlugin(mockPlugin);
      getState().ratePlugin('com.test.plugin', 5);
      getState().addRegistryUrl('https://example.com/registry.json');
      useMarketplaceStore.setState({
        registry: [mockPlugin],
        categories: ['productivity'],
        updates: [],
        status: 'ready',
        lastRegistryFetch: Date.now(),
      });

      // Reset
      getState().reset();

      // Verify initial state
      const state = getState();
      expect(state.installed.size).toBe(0);
      expect(state.ratings.size).toBe(0);
      expect(state.registryUrls).toEqual(['/registry.json']);
      expect(state.registry).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.updates).toEqual([]);
      expect(state.status).toBe('idle');
      expect(state.lastRegistryFetch).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  // ============================================================
  // fetchRegistry
  // ============================================================

  describe('fetchRegistry', () => {
    beforeEach(() => {
      // Mock global fetch
      global.fetch = vi.fn();
    });

    it('should fetch registry data and update state', async () => {
      const mockRegistryResponse: RegistryResponse = {
        version: 1,
        lastUpdated: '2026-02-16T00:00:00Z',
        plugins: [
          {
            manifest: {
              id: 'com.test.plugin',
              name: 'test-plugin',
              version: '1.0.0',
              entrypoint: './index.js',
              remoteEntry: 'http://localhost:3001/remoteEntry.js',
            },
            downloadUrl: 'http://localhost:3001/plugin.zip',
            publishedAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
            downloads: 100,
            rating: 4.5,
            ratingCount: 10,
            categories: ['productivity'],
            featured: false,
          },
        ],
        categories: ['productivity', 'utilities'],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockRegistryResponse,
      } as Response);

      await getState().fetchRegistry();

      expect(getState().status).toBe('ready');
      expect(getState().registry).toHaveLength(1);
      expect(getState().registry[0].manifest.id).toBe('com.test.plugin');
      expect(getState().categories).toEqual(['productivity', 'utilities']);
      expect(getState().lastRegistryFetch).toBeTypeOf('number');
      expect(getState().error).toBeNull();
    });

    it('should validate manifests and filter invalid ones', async () => {
      const mockRegistryResponse: RegistryResponse = {
        version: 1,
        lastUpdated: '2026-02-16T00:00:00Z',
        plugins: [
          {
            manifest: {
              id: 'com.test.plugin',
              name: 'test-plugin',
              version: '1.0.0',
              entrypoint: './index.js',
              remoteEntry: 'http://localhost:3001/remoteEntry.js',
            },
            downloadUrl: 'http://localhost:3001/plugin.zip',
            publishedAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
            downloads: 100,
            rating: 4.5,
            ratingCount: 10,
            categories: ['productivity'],
            featured: false,
          },
          {
            manifest: {
              id: 'invalid-plugin',
              name: 'invalid',
              version: 'bad-version',
              entrypoint: './index.js',
              remoteEntry: 'http://localhost:3002/remoteEntry.js',
            },
            downloadUrl: 'http://localhost:3002/plugin.zip',
            publishedAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
            downloads: 50,
            rating: 3.0,
            ratingCount: 5,
            categories: ['utilities'],
            featured: false,
          },
        ],
        categories: ['productivity', 'utilities'],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockRegistryResponse,
      } as Response);

      // Mock validation: first succeeds, second fails
      vi.mocked(manifestSchema.validateManifestSafe)
        .mockReturnValueOnce({ success: true, data: mockRegistryResponse.plugins[0].manifest as any })
        .mockReturnValueOnce({ success: false, error: new Error('Invalid version') as any });

      await getState().fetchRegistry();

      // Only valid plugin should be in registry
      expect(getState().registry).toHaveLength(1);
      expect(getState().registry[0].manifest.id).toBe('com.test.plugin');
    });

    it('should set loading status during fetch', async () => {
      vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {})); // Never resolves

      const fetchPromise = getState().fetchRegistry();

      // Check status immediately after calling
      expect(getState().status).toBe('loading');

      // Clean up
      await Promise.race([fetchPromise, new Promise(resolve => setTimeout(resolve, 100))]);
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await getState().fetchRegistry();

      expect(getState().status).toBe('error');
      expect(getState().error).toBe('Some registries failed to load');
    });

    it('should handle HTTP errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await getState().fetchRegistry();

      expect(getState().status).toBe('error');
      expect(getState().error).toBe('Some registries failed to load');
    });

    it('should fetch from multiple registry URLs', async () => {
      const mockResponse1: RegistryResponse = {
        version: 1,
        lastUpdated: '2026-02-16T00:00:00Z',
        plugins: [
          {
            manifest: {
              id: 'com.test.plugin1',
              name: 'test-plugin-1',
              version: '1.0.0',
              entrypoint: './index.js',
              remoteEntry: 'http://localhost:3001/remoteEntry.js',
            },
            downloadUrl: 'http://localhost:3001/plugin.zip',
            publishedAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
            downloads: 100,
            rating: 4.5,
            ratingCount: 10,
            categories: ['productivity'],
            featured: false,
          },
        ],
        categories: ['productivity'],
      };

      const mockResponse2: RegistryResponse = {
        version: 1,
        lastUpdated: '2026-02-16T00:00:00Z',
        plugins: [
          {
            manifest: {
              id: 'com.test.plugin2',
              name: 'test-plugin-2',
              version: '2.0.0',
              entrypoint: './index.js',
              remoteEntry: 'http://localhost:3002/remoteEntry.js',
            },
            downloadUrl: 'http://localhost:3002/plugin.zip',
            publishedAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
            downloads: 200,
            rating: 4.8,
            ratingCount: 20,
            categories: ['utilities'],
            featured: true,
          },
        ],
        categories: ['utilities'],
      };

      getState().addRegistryUrl('https://registry2.example.com/registry.json');

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        } as Response);

      await getState().fetchRegistry();

      expect(getState().registry).toHaveLength(2);
      expect(getState().categories).toEqual(['productivity', 'utilities']);
    });

    it('should not fetch if no registry URLs configured', async () => {
      getState().removeRegistryUrl('/registry.json');

      await getState().fetchRegistry();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(getState().status).toBe('idle');
    });
  });
});
