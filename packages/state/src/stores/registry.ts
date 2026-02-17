import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { AppManifest, ManifestSource, Unsubscribe } from '@archbase/workspace-types';
import { validateManifestSafe } from '../schemas/manifest';
import { processContributions, removeContributions } from '../services/contributionProcessor';
import { isPlatformCompatible } from '../utils/platformCompat';

// ============================================================
// Constants
// ============================================================

const MAX_ERRORS = 100;

// ============================================================
// Registry Error
// ============================================================

export interface RegistryError {
  manifestId?: string;
  message: string;
  timestamp: number;
}

// ============================================================
// Store State & Actions
// ============================================================

interface RegistryStoreState {
  apps: Map<string, AppManifest>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errors: RegistryError[];
  lastDiscoveryAt: number | null;
}

interface RegistryStoreActions {
  /** Validate and register a single manifest. Returns the manifest id or null if invalid. */
  registerManifest: (raw: unknown, source?: ManifestSource) => string | null;

  /** Batch-register manifests. Returns array of successfully registered ids. */
  registerManifests: (manifests: unknown[]) => string[];

  /** Fetch a manifest from a URL, validate, and register it. */
  discoverFromUrl: (url: string) => Promise<string | null>;

  /** Fetch manifests from multiple URLs in parallel. Returns array of registered ids. */
  discoverFromUrls: (urls: string[]) => Promise<string[]>;

  /** Remove a manifest from the registry. */
  unregister: (id: string) => void;

  /** Clear all registered manifests and reset state. */
  clearAll: () => void;

  /** Clear accumulated errors. */
  clearErrors: () => void;

  /** Set registry status. */
  setStatus: (status: RegistryStoreState['status']) => void;
}

// ============================================================
// Queries (non-reactive)
// ============================================================

export interface RegistryQueries {
  getApp: (id: string) => AppManifest | undefined;
  getAppByName: (name: string) => AppManifest | undefined;
  getAllApps: () => AppManifest[];
  hasApp: (id: string) => boolean;
}

// ============================================================
// Helpers
// ============================================================

function appendError(errors: RegistryError[], error: RegistryError): RegistryError[] {
  const next = [...errors, error];
  return next.length > MAX_ERRORS ? next.slice(-MAX_ERRORS) : next;
}

// ============================================================
// Store
// ============================================================

export const useAppRegistryStore = create<RegistryStoreState & RegistryStoreActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      apps: new Map(),
      status: 'idle',
      errors: [],
      lastDiscoveryAt: null,

      registerManifest: (raw, source) => {
        const result = validateManifestSafe(raw);
        if (!result.success) {
          const msg = result.error.issues.map((i) => i.message).join('; ');
          set((state) => ({
            errors: appendError(state.errors, {
              manifestId: (raw as Record<string, unknown>)?.id as string | undefined,
              message: `Validation failed: ${msg}`,
              timestamp: Date.now(),
            }),
          }));
          return null;
        }

        // Cast is safe: Zod validates activationEvents format at runtime,
        // but z.string().refine() infers as string rather than template literal types.
        const manifest = { ...result.data, source: source ?? result.data.source } as AppManifest;

        // Platform compatibility warning
        if (!isPlatformCompatible(manifest.platform)) {
          console.warn(`[AppRegistry] "${manifest.id}" may not be compatible with current platform.`);
        }
        // Dependency check warning
        if (manifest.dependencies) {
          for (const depId of Object.keys(manifest.dependencies)) {
            if (!get().apps.has(depId)) {
              console.warn(`[AppRegistry] "${manifest.id}" depends on "${depId}" which is not registered.`);
            }
          }
        }

        set((state) => {
          const apps = new Map(state.apps);
          apps.set(manifest.id, manifest);
          return { apps };
        });

        processContributions(manifest);

        return manifest.id;
      },

      registerManifests: (manifests) => {
        const { registerManifest } = get();
        const ids: string[] = [];
        for (const raw of manifests) {
          const id = registerManifest(raw);
          if (id) ids.push(id);
        }
        return ids;
      },

      discoverFromUrl: async (url) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          const { registerManifest } = get();
          return registerManifest(data, 'remote');
        } catch (err) {
          const message =
            err instanceof DOMException && err.name === 'AbortError'
              ? `Timeout fetching ${url}`
              : `Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`;

          set((state) => ({
            errors: appendError(state.errors, { message, timestamp: Date.now() }),
          }));
          return null;
        } finally {
          clearTimeout(timeout);
        }
      },

      discoverFromUrls: async (urls) => {
        set({ status: 'loading' });

        const results = await Promise.allSettled(
          urls.map(async (url) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            try {
              const response = await fetch(url, { signal: controller.signal });
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              const data = await response.json();
              const { registerManifest } = get();
              return registerManifest(data, 'remote');
            } catch (err) {
              const message =
                err instanceof DOMException && err.name === 'AbortError'
                  ? `Timeout fetching ${url}`
                  : `Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`;

              set((state) => ({
                errors: appendError(state.errors, { message, timestamp: Date.now() }),
              }));
              return null;
            } finally {
              clearTimeout(timeout);
            }
          }),
        );

        const ids: string[] = [];
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            ids.push(result.value);
          }
        }

        const now = Date.now();
        if (ids.length > 0) {
          set({ status: 'ready', lastDiscoveryAt: now });
        } else {
          set({ status: 'error', lastDiscoveryAt: now });
        }

        return ids;
      },

      unregister: (id) => {
        removeContributions(id);
        set((state) => {
          const apps = new Map(state.apps);
          apps.delete(id);
          return { apps };
        });
      },

      clearAll: () => {
        const apps = get().apps;
        apps.forEach((_, id) => removeContributions(id));
        set({ apps: new Map(), errors: [], status: 'idle', lastDiscoveryAt: null });
      },

      clearErrors: () => {
        set({ errors: [] });
      },

      setStatus: (status) => {
        set({ status });
      },
    })),
    { name: 'AppRegistryStore' },
  ),
);

// ============================================================
// React Selector Hooks
// ============================================================

/** Get a single app manifest by id */
export function useApp(id: string): AppManifest | undefined {
  return useAppRegistryStore((state) => state.apps.get(id));
}

/** Get all registered apps as an array (memoized per-reference) */
let cachedAppsArray: AppManifest[] = [];
let cachedAppsMap: Map<string, AppManifest> | null = null;

function appsToArray(apps: Map<string, AppManifest>): AppManifest[] {
  if (apps === cachedAppsMap) return cachedAppsArray;
  cachedAppsMap = apps;
  cachedAppsArray = Array.from(apps.values());
  return cachedAppsArray;
}

export function useAllApps(): AppManifest[] {
  return useAppRegistryStore((state) => appsToArray(state.apps));
}

/** Get the registry status */
export function useRegistryStatus(): RegistryStoreState['status'] {
  return useAppRegistryStore((state) => state.status);
}

/** Get registry errors */
export function useRegistryErrors(): RegistryError[] {
  return useAppRegistryStore((state) => state.errors);
}

// ============================================================
// Non-reactive Queries
// ============================================================

export const registryQueries: RegistryQueries = {
  getApp: (id) => useAppRegistryStore.getState().apps.get(id),
  getAppByName: (name) => {
    const apps = useAppRegistryStore.getState().apps;
    for (const app of apps.values()) {
      if (app.name === name) return app;
    }
    return undefined;
  },
  getAllApps: () => Array.from(useAppRegistryStore.getState().apps.values()),
  hasApp: (id) => useAppRegistryStore.getState().apps.has(id),
};

// ============================================================
// Event Subscriptions
// ============================================================

export function onAppRegistered(handler: (app: AppManifest) => void): Unsubscribe {
  return useAppRegistryStore.subscribe(
    (state) => state.apps,
    (apps, prevApps) => {
      apps.forEach((app, id) => {
        if (!prevApps.has(id)) handler(app);
      });
    },
  );
}

export function onAppUnregistered(handler: (id: string) => void): Unsubscribe {
  return useAppRegistryStore.subscribe(
    (state) => state.apps,
    (apps, prevApps) => {
      prevApps.forEach((_, id) => {
        if (!apps.has(id)) handler(id);
      });
    },
  );
}
