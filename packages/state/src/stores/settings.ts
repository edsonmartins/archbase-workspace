import { create } from 'zustand';
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware';
import type { PersistStorage, StorageValue } from 'zustand/middleware';
import type { Setting, SettingValue, SettingsEntry } from '@archbase/workspace-types';
import { idbStateStorage } from '../middleware/idbStorage';

// ============================================================
// Types
// ============================================================

interface SettingsStoreState {
  values: Map<string, SettingsEntry>;
}

interface SettingsStoreActions {
  registerSettings: (appId: string, settings: Setting[]) => void;
  unregisterBySource: (appId: string) => void;
  getValue: <T extends SettingValue>(key: string) => T | undefined;
  setValue: (key: string, value: SettingValue) => void;
  resetToDefault: (key: string) => void;
  resetAll: () => void;
  getAllSettings: () => SettingsEntry[];
  getBySource: (appId: string) => SettingsEntry[];
}

type SettingsStore = SettingsStoreState & SettingsStoreActions;

const MAX_SETTINGS = 2000;

// Custom PersistStorage that handles Map ↔ Array serialization
type PersistedSettingsState = Pick<SettingsStoreState, 'values'>;

const settingsIdbStorage: PersistStorage<PersistedSettingsState> = {
  async getItem(name: string): Promise<StorageValue<PersistedSettingsState> | null> {
    const raw = await idbStateStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.values && Array.isArray(parsed.state.values)) {
        parsed.state.values = new Map(parsed.state.values);
      }
      return parsed as StorageValue<PersistedSettingsState>;
    } catch {
      return null;
    }
  },
  async setItem(name: string, value: StorageValue<PersistedSettingsState>): Promise<void> {
    const serializable = {
      ...value,
      state: {
        ...value.state,
        values: Array.from(value.state.values.entries()),
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

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          values: new Map(),

          registerSettings: (appId, settings) => {
            set((state) => {
              const values = new Map(state.values);
              for (const setting of settings) {
                if (!values.has(setting.key)) {
                  values.set(setting.key, {
                    key: setting.key,
                    value: setting.default,
                    source: appId,
                    schema: setting,
                  });
                } else {
                  // Preserve persisted value but update schema/source
                  const existing = values.get(setting.key)!;
                  if (!existing.schema) {
                    values.set(setting.key, {
                      ...existing,
                      source: appId,
                      schema: setting,
                    });
                  }
                }
              }
              // Evict oldest if over limit
              if (values.size > MAX_SETTINGS) {
                const iter = values.keys();
                while (values.size > MAX_SETTINGS) {
                  const oldest = iter.next().value;
                  if (oldest !== undefined) values.delete(oldest);
                }
              }
              return { values };
            });
          },

          unregisterBySource: (appId) => {
            const { values } = get();
            const toRemove: string[] = [];
            values.forEach((entry) => {
              if (entry.source === appId) toRemove.push(entry.key);
            });
            if (toRemove.length === 0) return;
            set((state) => {
              const values = new Map(state.values);
              for (const key of toRemove) {
                values.delete(key);
              }
              return { values };
            });
          },

          getValue: <T extends SettingValue>(key: string): T | undefined => {
            const entry = get().values.get(key);
            if (!entry) return undefined;
            return entry.value as T;
          },

          setValue: (key, value) => {
            const entry = get().values.get(key);
            if (!entry) return;
            set((state) => {
              const values = new Map(state.values);
              values.set(key, { ...entry, value });
              return { values };
            });
          },

          resetToDefault: (key) => {
            const entry = get().values.get(key);
            if (!entry) return;
            set((state) => {
              const values = new Map(state.values);
              values.set(key, { ...entry, value: entry.schema.default });
              return { values };
            });
          },

          resetAll: () => {
            set((state) => {
              const values = new Map(state.values);
              values.forEach((entry, key) => {
                values.set(key, { ...entry, value: entry.schema.default });
              });
              return { values };
            });
          },

          getAllSettings: () => Array.from(get().values.values()),

          getBySource: (appId) => {
            const result: SettingsEntry[] = [];
            get().values.forEach((entry) => {
              if (entry.source === appId) result.push(entry);
            });
            return result;
          },
        }),
        {
          name: 'archbase:settings',
          storage: settingsIdbStorage,
          partialize: (state) => ({
            values: state.values,
          }),
          merge: (persistedState, currentState) => {
            const persisted = persistedState as Partial<SettingsStoreState> | undefined;
            if (persisted?.values instanceof Map && currentState.values instanceof Map) {
              // Merge: keep current entries, overlay persisted values on top
              const merged = new Map(currentState.values);
              persisted.values.forEach((entry, key) => {
                merged.set(key, entry);
              });
              return { ...currentState, values: merged };
            }
            return { ...currentState, ...persisted };
          },
        },
      ),
    ),
    { name: 'SettingsStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

export const useSetting = (key: string) =>
  useSettingsStore((state) => state.values.get(key));

let cachedSettingsArray: SettingsEntry[] = [];
let cachedSettingsMap: Map<string, SettingsEntry> | null = null;

export const useAllSettings = () =>
  useSettingsStore((state) => {
    if (state.values !== cachedSettingsMap) {
      cachedSettingsMap = state.values;
      cachedSettingsArray = Array.from(state.values.values());
    }
    return cachedSettingsArray;
  });

// ============================================================
// Event Subscriptions
// ============================================================

export const onSettingChanged = (key: string, handler: (value: SettingValue) => void) =>
  useSettingsStore.subscribe(
    (state) => state.values.get(key)?.value,
    (current) => {
      if (current !== undefined) handler(current);
    },
  );
