import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { MenuContributions, RegisteredMenuItem } from '@archbase/workspace-types';

// ============================================================
// Types
// ============================================================

interface MenuRegistryState {
  applicationMenus: Map<string, RegisteredMenuItem>;
  contextMenus: Map<string, RegisteredMenuItem>;
  windowMenus: Map<string, RegisteredMenuItem>;
}

interface MenuRegistryActions {
  registerMenuItems: (appId: string, menus: MenuContributions) => void;
  unregisterBySource: (appId: string) => void;
  getApplicationMenuItems: () => RegisteredMenuItem[];
  getContextMenuItems: () => RegisteredMenuItem[];
  getWindowMenuItems: () => RegisteredMenuItem[];
}

type MenuRegistryStore = MenuRegistryState & MenuRegistryActions;

// ============================================================
// Helpers
// ============================================================

function addItems(
  map: Map<string, RegisteredMenuItem>,
  items: { command: string; group?: string; when?: string }[],
  appId: string,
): Map<string, RegisteredMenuItem> {
  const result = new Map(map);
  for (const item of items) {
    const key = `${appId}:${item.command}`;
    result.set(key, { ...item, source: appId });
  }
  return result;
}

function removeBySource(map: Map<string, RegisteredMenuItem>, appId: string): Map<string, RegisteredMenuItem> {
  const result = new Map(map);
  result.forEach((item, key) => {
    if (item.source === appId) result.delete(key);
  });
  return result;
}

// ============================================================
// Store
// ============================================================

export const useMenuRegistryStore = create<MenuRegistryStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      applicationMenus: new Map(),
      contextMenus: new Map(),
      windowMenus: new Map(),

      registerMenuItems: (appId, menus) => {
        set((state) => {
          const updates: Partial<MenuRegistryState> = {};
          if (menus.application?.length) {
            updates.applicationMenus = addItems(state.applicationMenus, menus.application, appId);
          }
          if (menus.context?.length) {
            updates.contextMenus = addItems(state.contextMenus, menus.context, appId);
          }
          if (menus.window?.length) {
            updates.windowMenus = addItems(state.windowMenus, menus.window, appId);
          }
          return updates;
        });
      },

      unregisterBySource: (appId) => {
        set((state) => ({
          applicationMenus: removeBySource(state.applicationMenus, appId),
          contextMenus: removeBySource(state.contextMenus, appId),
          windowMenus: removeBySource(state.windowMenus, appId),
        }));
      },

      getApplicationMenuItems: () => Array.from(get().applicationMenus.values()),
      getContextMenuItems: () => Array.from(get().contextMenus.values()),
      getWindowMenuItems: () => Array.from(get().windowMenus.values()),
    })),
    { name: 'MenuRegistryStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

let cachedAppMenus: RegisteredMenuItem[] = [];
let cachedAppMenusMap: Map<string, RegisteredMenuItem> | null = null;

export const useApplicationMenuItems = () =>
  useMenuRegistryStore((state) => {
    if (state.applicationMenus !== cachedAppMenusMap) {
      cachedAppMenusMap = state.applicationMenus;
      cachedAppMenus = Array.from(state.applicationMenus.values());
    }
    return cachedAppMenus;
  });

let cachedCtxMenus: RegisteredMenuItem[] = [];
let cachedCtxMenusMap: Map<string, RegisteredMenuItem> | null = null;

export const useContextMenuItems = () =>
  useMenuRegistryStore((state) => {
    if (state.contextMenus !== cachedCtxMenusMap) {
      cachedCtxMenusMap = state.contextMenus;
      cachedCtxMenus = Array.from(state.contextMenus.values());
    }
    return cachedCtxMenus;
  });
