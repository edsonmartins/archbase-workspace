import { create } from 'zustand';
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware';
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import type {
  InstalledPlugin,
  MarketplacePlugin,
  PluginRating,
  PluginUpdate,
  RegistryResponse,
} from '@archbase/workspace-types';
import { idbStateStorage } from '../middleware/idbStorage';
import { useAppRegistryStore } from './registry';
import { detectUpdates } from '../services/marketplaceService';
import { validateManifestSafe } from '../schemas/manifest';

// ============================================================
// Types
// ============================================================

interface MarketplaceStoreState {
  // Persisted (IDB)
  installed: Map<string, InstalledPlugin>;
  ratings: Map<string, PluginRating>;
  registryUrls: string[];

  // Transient
  registry: MarketplacePlugin[];
  categories: string[];
  updates: PluginUpdate[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  lastRegistryFetch: number | null;
  error: string | null;
}

interface MarketplaceStoreActions {
  fetchRegistry(): Promise<void>;
  addRegistryUrl(url: string): void;
  removeRegistryUrl(url: string): void;

  installPlugin(plugin: MarketplacePlugin): Promise<void>;
  uninstallPlugin(pluginId: string): void;
  updatePlugin(pluginId: string): Promise<void>;

  ratePlugin(pluginId: string, rating: number, review?: string): void;

  checkUpdates(): void;

  getInstalled(): InstalledPlugin[];
  isInstalled(pluginId: string): boolean;

  reset(): void;
}

type MarketplaceStore = MarketplaceStoreState & MarketplaceStoreActions;

// ============================================================
// Persistence (IDB)
// ============================================================

interface PersistedMarketplaceState {
  installed: Map<string, InstalledPlugin>;
  ratings: Map<string, PluginRating>;
  registryUrls: string[];
}

const marketplaceIdbStorage: PersistStorage<PersistedMarketplaceState> = {
  async getItem(name: string): Promise<StorageValue<PersistedMarketplaceState> | null> {
    const raw = await idbStateStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.installed && Array.isArray(parsed.state.installed)) {
        parsed.state.installed = new Map(parsed.state.installed);
      }
      if (parsed?.state?.ratings && Array.isArray(parsed.state.ratings)) {
        parsed.state.ratings = new Map(parsed.state.ratings);
      }
      return parsed as StorageValue<PersistedMarketplaceState>;
    } catch {
      return null;
    }
  },
  async setItem(name: string, value: StorageValue<PersistedMarketplaceState>): Promise<void> {
    const serializable = {
      ...value,
      state: {
        ...value.state,
        installed: Array.from(value.state.installed.entries()),
        ratings: Array.from(value.state.ratings.entries()),
      },
    };
    await idbStateStorage.setItem(name, JSON.stringify(serializable));
  },
  async removeItem(name: string): Promise<void> {
    await idbStateStorage.removeItem(name);
  },
};

// ============================================================
// Store
// ============================================================

export const useMarketplaceStore = create<MarketplaceStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Persisted
          installed: new Map(),
          ratings: new Map(),
          registryUrls: ['/registry.json'],

          // Transient
          registry: [],
          categories: [],
          updates: [],
          status: 'idle' as const,
          lastRegistryFetch: null,
          error: null,

          fetchRegistry: async () => {
            const { registryUrls } = get();
            if (registryUrls.length === 0) return;

            set({ status: 'loading', error: null });

            const allPlugins: MarketplacePlugin[] = [];
            const allCategories = new Set<string>();

            const results = await Promise.allSettled(
              registryUrls.map(async (url) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                try {
                  const resp = await fetch(url, { signal: controller.signal });
                  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                  const data: RegistryResponse = await resp.json();

                  // Validate each plugin's manifest
                  for (const plugin of data.plugins) {
                    const result = validateManifestSafe(plugin.manifest);
                    if (result.success) {
                      allPlugins.push(plugin);
                    }
                  }
                  for (const cat of data.categories) {
                    allCategories.add(cat);
                  }
                } finally {
                  clearTimeout(timeout);
                }
              }),
            );

            const hasError = results.some((r) => r.status === 'rejected');

            set({
              registry: allPlugins,
              categories: Array.from(allCategories).sort(),
              status: allPlugins.length > 0 ? 'ready' : hasError ? 'error' : 'ready',
              lastRegistryFetch: Date.now(),
              error: hasError ? 'Some registries failed to load' : null,
            });
          },

          addRegistryUrl: (url) => {
            set((state) => {
              if (state.registryUrls.includes(url)) return state;
              return { registryUrls: [...state.registryUrls, url] };
            });
          },

          removeRegistryUrl: (url) => {
            set((state) => ({
              registryUrls: state.registryUrls.filter((u) => u !== url),
            }));
          },

          installPlugin: async (plugin) => {
            const now = Date.now();
            const installedPlugin: InstalledPlugin = {
              manifest: plugin.manifest,
              downloadUrl: plugin.downloadUrl,
              installedAt: now,
              updatedAt: now,
              autoUpdate: true,
            };

            // Register manifest in the app registry
            const registryStore = useAppRegistryStore.getState();
            registryStore.registerManifest(plugin.manifest, 'registry');

            set((state) => {
              const installed = new Map(state.installed);
              installed.set(plugin.manifest.id, installedPlugin);
              return { installed };
            });
          },

          uninstallPlugin: (pluginId) => {
            // Remove from app registry
            const registryStore = useAppRegistryStore.getState();
            registryStore.unregister(pluginId);

            set((state) => {
              const installed = new Map(state.installed);
              installed.delete(pluginId);
              // Also remove from updates
              const updates = state.updates.filter((u) => u.pluginId !== pluginId);
              return { installed, updates };
            });
          },

          updatePlugin: async (pluginId) => {
            const { updates, registry } = get();
            const update = updates.find((u) => u.pluginId === pluginId);
            if (!update) return;

            const registryPlugin = registry.find((p) => p.manifest.id === pluginId);
            if (!registryPlugin) return;

            // Re-register with new manifest
            const registryStore = useAppRegistryStore.getState();
            registryStore.registerManifest(registryPlugin.manifest, 'registry');

            set((state) => {
              const installed = new Map(state.installed);
              const existing = installed.get(pluginId);
              if (existing) {
                installed.set(pluginId, {
                  ...existing,
                  manifest: registryPlugin.manifest,
                  downloadUrl: registryPlugin.downloadUrl,
                  updatedAt: Date.now(),
                });
              }
              const remainingUpdates = state.updates.filter((u) => u.pluginId !== pluginId);
              return { installed, updates: remainingUpdates };
            });
          },

          ratePlugin: (pluginId, rating, review) => {
            set((state) => {
              const ratings = new Map(state.ratings);
              ratings.set(pluginId, {
                pluginId,
                rating: Math.max(1, Math.min(5, rating)),
                review,
                createdAt: Date.now(),
              });
              return { ratings };
            });
          },

          checkUpdates: () => {
            const { installed, registry } = get();
            const updates = detectUpdates(installed, registry);
            set({ updates });
          },

          getInstalled: () => Array.from(get().installed.values()),

          isInstalled: (pluginId) => get().installed.has(pluginId),

          reset: () => {
            cachedInstalledMap = null;
            cachedInstalledArray = [];
            set({
              installed: new Map(),
              ratings: new Map(),
              registryUrls: ['/registry.json'],
              registry: [],
              categories: [],
              updates: [],
              status: 'idle',
              lastRegistryFetch: null,
              error: null,
            });
          },
        }),
        {
          name: 'archbase:marketplace',
          storage: marketplaceIdbStorage,
          partialize: (state) => ({
            installed: state.installed,
            ratings: state.ratings,
            registryUrls: state.registryUrls,
          }),
          merge: (persistedState, currentState) => {
            const persisted = persistedState as Partial<PersistedMarketplaceState> | undefined;
            return {
              ...currentState,
              installed: persisted?.installed instanceof Map ? persisted.installed : currentState.installed,
              ratings: persisted?.ratings instanceof Map ? persisted.ratings : currentState.ratings,
              registryUrls: persisted?.registryUrls ?? currentState.registryUrls,
            };
          },
        },
      ),
    ),
    { name: 'MarketplaceStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

let cachedInstalledArray: InstalledPlugin[] = [];
let cachedInstalledMap: Map<string, InstalledPlugin> | null = null;

export const useInstalledPlugins = () =>
  useMarketplaceStore((state) => {
    if (state.installed !== cachedInstalledMap) {
      cachedInstalledMap = state.installed;
      cachedInstalledArray = Array.from(state.installed.values());
    }
    return cachedInstalledArray;
  });

export const useMarketplaceRegistry = () =>
  useMarketplaceStore((state) => state.registry);

export const useMarketplaceCategories = () =>
  useMarketplaceStore((state) => state.categories);

export const useMarketplaceUpdates = () =>
  useMarketplaceStore((state) => state.updates);

export const useMarketplaceStatus = () =>
  useMarketplaceStore((state) => state.status);
