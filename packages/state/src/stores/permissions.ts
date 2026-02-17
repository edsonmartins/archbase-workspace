import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Permission, PermissionGrant, PermissionRecord } from '@archbase/workspace-types';

// ============================================================
// Types
// ============================================================

export interface PendingPrompt {
  id: string;
  appId: string;
  appDisplayName: string;
  appIcon?: string;
  permission: Permission;
  resolve: (grant: PermissionGrant) => void;
}

interface PermissionsStoreState {
  /** Map<appId, Map<Permission, PermissionRecord>> */
  grants: Map<string, Map<Permission, PermissionRecord>>;
  /** Currently active permission prompt (max one at a time) */
  pendingPrompt: PendingPrompt | null;
  /** Queue of prompts waiting to be shown */
  promptQueue: PendingPrompt[];
}

interface PermissionsStoreActions {
  checkPermission: (appId: string, permission: Permission) => PermissionGrant;
  grant: (appId: string, permission: Permission) => void;
  deny: (appId: string, permission: Permission) => void;
  getAppPermissions: (appId: string) => PermissionRecord[];
  resetApp: (appId: string) => void;
  resetAll: () => void;
  requestPermission: (
    appId: string,
    appDisplayName: string,
    appIcon: string | undefined,
    permission: Permission,
  ) => Promise<PermissionGrant>;
  resolvePrompt: (grant: PermissionGrant) => void;
}

type PermissionsStore = PermissionsStoreState & PermissionsStoreActions;

// ============================================================
// localStorage Persistence
// ============================================================

const STORAGE_KEY = 'archbase:permissions';

interface SerializedGrants {
  [appId: string]: Array<{ permission: Permission; grant: PermissionGrant; decidedAt: number }>;
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** All valid Permission values — single source of truth for validation and listing */
export const ALL_PERMISSIONS: readonly Permission[] = [
  'notifications', 'storage', 'clipboard.read', 'clipboard.write',
  'filesystem.read', 'filesystem.write', 'network', 'camera', 'microphone',
  'collaboration',
] as const;

const VALID_PERMISSIONS: ReadonlySet<string> = new Set<Permission>(ALL_PERMISSIONS);

const VALID_GRANTS: ReadonlySet<string> = new Set<PermissionGrant>([
  'granted', 'denied', 'prompt',
]);

function isValidPermissionRecord(entry: unknown): entry is PermissionRecord {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.permission === 'string' &&
    VALID_PERMISSIONS.has(e.permission) &&
    typeof e.grant === 'string' &&
    VALID_GRANTS.has(e.grant) &&
    typeof e.decidedAt === 'number'
  );
}

function hydrateFromStorage(): Map<string, Map<Permission, PermissionRecord>> {
  const grants = new Map<string, Map<Permission, PermissionRecord>>();
  try {
    const storage = getStorage();
    if (!storage) return grants;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return grants;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return grants;
    for (const [appId, entries] of Object.entries(data)) {
      if (!Array.isArray(entries)) continue;
      const appGrants = new Map<Permission, PermissionRecord>();
      for (const entry of entries) {
        if (isValidPermissionRecord(entry)) {
          appGrants.set(entry.permission, entry);
        }
      }
      if (appGrants.size > 0) {
        grants.set(appId, appGrants);
      }
    }
  } catch {
    // Corrupted data or no storage — start fresh
  }
  return grants;
}

function persistToStorage(grants: Map<string, Map<Permission, PermissionRecord>>): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const data: SerializedGrants = {};
    grants.forEach((appGrants, appId) => {
      data[appId] = Array.from(appGrants.values());
    });
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

// ============================================================
// Store
// ============================================================

// Note: idCounter is module-scoped and intentionally never reset.
// IDs only need to be unique within a session, not sequential from 0.
// Design decision: No TTL/expiry on grants. Once granted/denied,
// a permission persists until explicitly reset via resetApp/resetAll.
// A future TTL mechanism can be added by checking decidedAt in checkPermission.
let idCounter = 0;

export const usePermissionsStore = create<PermissionsStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      grants: hydrateFromStorage(),
      pendingPrompt: null,
      promptQueue: [],

      checkPermission: (appId, permission) => {
        const appGrants = get().grants.get(appId);
        if (!appGrants) return 'prompt';
        const record = appGrants.get(permission);
        return record?.grant ?? 'prompt';
      },

      grant: (appId, permission) => {
        set((state) => {
          const grants = new Map(state.grants);
          const appGrants = new Map(grants.get(appId) ?? new Map());
          appGrants.set(permission, {
            permission,
            grant: 'granted',
            decidedAt: Date.now(),
          });
          grants.set(appId, appGrants);
          return { grants };
        });
        persistToStorage(get().grants);
      },

      deny: (appId, permission) => {
        set((state) => {
          const grants = new Map(state.grants);
          const appGrants = new Map(grants.get(appId) ?? new Map());
          appGrants.set(permission, {
            permission,
            grant: 'denied',
            decidedAt: Date.now(),
          });
          grants.set(appId, appGrants);
          return { grants };
        });
        persistToStorage(get().grants);
      },

      getAppPermissions: (appId) => {
        const appGrants = get().grants.get(appId);
        if (!appGrants) return [];
        return Array.from(appGrants.values());
      },

      resetApp: (appId) => {
        // Resolve any pending/queued prompts for this app as 'denied'
        const { pendingPrompt, promptQueue } = get();
        if (pendingPrompt?.appId === appId) {
          pendingPrompt.resolve('denied');
          // Pop next non-matching prompt from queue
          const remaining = promptQueue.filter((p) => {
            if (p.appId === appId) { p.resolve('denied'); return false; }
            return true;
          });
          const nextPrompt = remaining.shift() ?? null;
          set((state) => {
            const grants = new Map(state.grants);
            grants.delete(appId);
            return { grants, pendingPrompt: nextPrompt, promptQueue: remaining };
          });
        } else {
          // Resolve any queued prompts for this app
          const remaining = promptQueue.filter((p) => {
            if (p.appId === appId) { p.resolve('denied'); return false; }
            return true;
          });
          set((state) => {
            const grants = new Map(state.grants);
            grants.delete(appId);
            return { grants, promptQueue: remaining };
          });
        }
        persistToStorage(get().grants);
      },

      resetAll: () => {
        // Resolve all pending/queued prompts as 'denied'
        const { pendingPrompt, promptQueue } = get();
        if (pendingPrompt) pendingPrompt.resolve('denied');
        for (const p of promptQueue) p.resolve('denied');

        set({
          grants: new Map<string, Map<Permission, PermissionRecord>>(),
          pendingPrompt: null,
          promptQueue: [],
        });
        persistToStorage(get().grants);
      },

      requestPermission: (appId, appDisplayName, appIcon, permission) => {
        const { checkPermission, pendingPrompt, promptQueue } = get();
        const current = checkPermission(appId, permission);

        if (current === 'granted' || current === 'denied') {
          return Promise.resolve(current);
        }

        // Deduplicate: check if there's already a pending/queued prompt for same app+permission
        const isDuplicate =
          (pendingPrompt?.appId === appId && pendingPrompt?.permission === permission) ||
          promptQueue.some((p) => p.appId === appId && p.permission === permission);

        if (isDuplicate) {
          // Return a promise that resolves when the existing prompt is resolved.
          // Includes a 60s timeout to prevent indefinite leaks if the prompt is never resolved.
          return new Promise<PermissionGrant>((resolve) => {
            let timer: ReturnType<typeof setTimeout> | undefined;
            const unsub = usePermissionsStore.subscribe(
              (state) => state.grants,
              () => {
                const grant = get().checkPermission(appId, permission);
                if (grant !== 'prompt') {
                  if (timer) clearTimeout(timer);
                  unsub();
                  resolve(grant);
                }
              },
            );
            timer = setTimeout(() => {
              unsub();
              resolve('denied');
            }, 60_000);
          });
        }

        return new Promise<PermissionGrant>((resolve) => {
          const prompt: PendingPrompt = {
            id: `prompt-${++idCounter}`,
            appId,
            appDisplayName,
            appIcon,
            permission,
            resolve,
          };

          // Atomic check-and-set to prevent two synchronous calls from
          // both seeing pendingPrompt as null and overwriting each other
          set((state) => {
            if (state.pendingPrompt) {
              return { promptQueue: [...state.promptQueue, prompt] };
            }
            return { pendingPrompt: prompt };
          });
        });
      },

      resolvePrompt: (grant) => {
        const { pendingPrompt, promptQueue } = get();
        if (!pendingPrompt) return;

        const { appId, permission, resolve } = pendingPrompt;

        // Only accept 'granted' or 'denied' (not 'prompt')
        const effectiveGrant: PermissionGrant = grant === 'granted' ? 'granted' : 'denied';

        // Record the decision
        if (effectiveGrant === 'granted') {
          get().grant(appId, permission);
        } else {
          get().deny(appId, permission);
        }

        // Resolve the promise
        resolve(effectiveGrant);

        // Pop next prompt from queue, skipping any that are already decided
        const remaining = [...promptQueue];
        let nextPrompt: PendingPrompt | null = null;

        while (remaining.length > 0) {
          const candidate = remaining.shift()!;
          const candidateGrant = get().checkPermission(candidate.appId, candidate.permission);
          if (candidateGrant !== 'prompt') {
            // Already decided (e.g., same app+permission resolved above)
            candidate.resolve(candidateGrant);
          } else {
            nextPrompt = candidate;
            break;
          }
        }

        if (nextPrompt) {
          set({ pendingPrompt: nextPrompt, promptQueue: remaining });
        } else {
          set({ pendingPrompt: null, promptQueue: remaining });
        }
      },
    })),
    { name: 'PermissionsStore' },
  ),
);

// ============================================================
// React Selector Hooks
// ============================================================

export const usePendingPrompt = () =>
  usePermissionsStore((state) => state.pendingPrompt);
