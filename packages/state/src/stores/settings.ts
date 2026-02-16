import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { Setting, SettingValue, SettingsEntry } from '@archbase/workspace-types';

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

// ============================================================
// Store
// ============================================================

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
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
    })),
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
