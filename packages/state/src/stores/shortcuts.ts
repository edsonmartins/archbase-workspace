import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { KeyCombo, Shortcut, ShortcutScope } from '@archbase/workspace-types';

// ============================================================
// Types
// ============================================================

interface ShortcutsStoreState {
  shortcuts: Map<string, Shortcut>;
}

interface ShortcutsStoreActions {
  register: (shortcut: Shortcut) => void;
  unregister: (id: string) => void;
  enable: (id: string) => void;
  disable: (id: string) => void;
  setCombo: (id: string, combo: KeyCombo) => void;

  // Queries (imperative)
  getShortcut: (id: string) => Shortcut | undefined;
  getByCombo: (combo: KeyCombo) => Shortcut | undefined;
  getAllShortcuts: () => Shortcut[];
  getByScope: (scope: ShortcutScope) => Shortcut[];
  hasConflict: (combo: KeyCombo, excludeId?: string) => boolean;
}

type ShortcutsStore = ShortcutsStoreState & ShortcutsStoreActions;

const MAX_SHORTCUTS = 500;

// ============================================================
// Helpers
// ============================================================

function combosEqual(a: KeyCombo, b: KeyCombo): boolean {
  return (
    a.key === b.key &&
    !!a.ctrl === !!b.ctrl &&
    !!a.meta === !!b.meta &&
    !!a.alt === !!b.alt &&
    !!a.shift === !!b.shift
  );
}

// ============================================================
// Store
// ============================================================

export const useShortcutsStore = create<ShortcutsStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      shortcuts: new Map(),

      register: (shortcut) => {
        set((state) => {
          const shortcuts = new Map(state.shortcuts);
          shortcuts.set(shortcut.id, shortcut);
          if (shortcuts.size > MAX_SHORTCUTS) {
            const iter = shortcuts.keys();
            while (shortcuts.size > MAX_SHORTCUTS) {
              const oldest = iter.next().value;
              if (oldest !== undefined) shortcuts.delete(oldest);
            }
          }
          return { shortcuts };
        });
      },

      unregister: (id) => {
        const { shortcuts } = get();
        if (!shortcuts.has(id)) return;

        set((state) => {
          const shortcuts = new Map(state.shortcuts);
          shortcuts.delete(id);
          return { shortcuts };
        });
      },

      enable: (id) => {
        const { shortcuts } = get();
        const shortcut = shortcuts.get(id);
        if (!shortcut || shortcut.enabled) return;

        set((state) => {
          const shortcuts = new Map(state.shortcuts);
          shortcuts.set(id, { ...shortcut, enabled: true });
          return { shortcuts };
        });
      },

      disable: (id) => {
        const { shortcuts } = get();
        const shortcut = shortcuts.get(id);
        if (!shortcut || !shortcut.enabled) return;

        set((state) => {
          const shortcuts = new Map(state.shortcuts);
          shortcuts.set(id, { ...shortcut, enabled: false });
          return { shortcuts };
        });
      },

      setCombo: (id, combo) => {
        const { shortcuts } = get();
        const shortcut = shortcuts.get(id);
        if (!shortcut) return;

        set((state) => {
          const shortcuts = new Map(state.shortcuts);
          shortcuts.set(id, { ...shortcut, combo });
          return { shortcuts };
        });
      },

      // Queries
      getShortcut: (id) => get().shortcuts.get(id),

      getByCombo: (combo) => {
        for (const shortcut of get().shortcuts.values()) {
          if (combosEqual(shortcut.combo, combo)) return shortcut;
        }
        return undefined;
      },

      getAllShortcuts: () => Array.from(get().shortcuts.values()),

      getByScope: (scope) => {
        const result: Shortcut[] = [];
        get().shortcuts.forEach((s) => {
          if (s.scope === scope) result.push(s);
        });
        return result;
      },

      hasConflict: (combo, excludeId) => {
        for (const shortcut of get().shortcuts.values()) {
          if (excludeId && shortcut.id === excludeId) continue;
          if (combosEqual(shortcut.combo, combo)) return true;
        }
        return false;
      },
    })),
    { name: 'ShortcutsStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

export const useShortcut = (id: string) =>
  useShortcutsStore((state) => state.shortcuts.get(id));

let cachedShortcutsArray: Shortcut[] = [];
let cachedShortcutsMap: Map<string, Shortcut> | null = null;

export const useAllShortcuts = () =>
  useShortcutsStore((state) => {
    if (state.shortcuts !== cachedShortcutsMap) {
      cachedShortcutsMap = state.shortcuts;
      cachedShortcutsArray = Array.from(state.shortcuts.values());
    }
    return cachedShortcutsArray;
  });
