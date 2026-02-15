import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  WorkspaceWindow,
  WindowOptions,
  WindowPosition,
  WindowSize,
  WindowState,
  WindowBounds,
  TileLayout,
  Unsubscribe,
} from '@archbase/workspace-types';

interface WindowsStoreState {
  windows: Map<string, WorkspaceWindow>;
  focusStack: string[];
}

interface WindowsStoreActions {
  // CRUD
  openWindow: (options: WindowOptions) => string;
  closeWindow: (id: string) => void;
  closeByAppId: (appId: string) => void;
  closeAll: () => void;

  // Focus
  focusWindow: (id: string) => void;
  focusNext: () => void;
  focusPrevious: () => void;

  // Position & Size
  updatePosition: (id: string, position: WindowPosition) => void;
  updateSize: (id: string, size: WindowSize) => void;
  setBounds: (id: string, bounds: WindowBounds) => void;
  centerWindow: (id: string, viewportWidth: number, viewportHeight: number) => void;

  // State
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string, viewportWidth: number, viewportHeight: number, taskbarHeight?: number) => void;
  restoreWindow: (id: string) => void;
  toggleMaximize: (id: string, viewportWidth: number, viewportHeight: number, taskbarHeight?: number) => void;
  setWindowState: (id: string, state: WindowState) => void;

  // Bulk operations
  minimizeAll: () => void;
  cascadeWindows: (viewportWidth: number, viewportHeight: number, taskbarHeight?: number) => void;
  tileWindows: (layout: TileLayout, viewportWidth: number, viewportHeight: number, taskbarHeight?: number) => void;

  // Queries (non-hook, for imperative use)
  getWindow: (id: string) => WorkspaceWindow | undefined;
  getWindowsByAppId: (appId: string) => WorkspaceWindow[];
  getAllWindows: () => WorkspaceWindow[];
  getFocusedWindow: () => WorkspaceWindow | undefined;
  existsWindow: (id: string) => boolean;
}

type WindowsStore = WindowsStoreState & WindowsStoreActions;

function recalcZIndexes(windows: Map<string, WorkspaceWindow>, focusStack: string[]): Map<string, WorkspaceWindow> {
  const updated = new Map(windows);
  const focusSet = new Set(focusStack);
  focusStack.forEach((wid, index) => {
    const w = updated.get(wid);
    if (w) {
      updated.set(wid, { ...w, zIndex: index });
    }
  });
  // Ensure windows not in focusStack get z-index 0
  updated.forEach((w, wid) => {
    if (!focusSet.has(wid)) {
      updated.set(wid, { ...w, zIndex: 0 });
    }
  });
  return updated;
}

export const useWindowsStore = create<WindowsStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      windows: new Map(),
      focusStack: [],

      // ============================================================
      // CRUD
      // ============================================================

      openWindow: (options) => {
        const id = crypto.randomUUID();
        const { focusStack, windows } = get();

        const newWindow: WorkspaceWindow = {
          id,
          appId: options.appId,
          title: options.title,
          position: {
            x: options.x ?? (50 + Math.random() * 200),
            y: options.y ?? (50 + Math.random() * 150),
          },
          size: {
            width: options.width ?? 800,
            height: options.height ?? 600,
          },
          constraints: {
            minWidth: options.minWidth ?? 200,
            minHeight: options.minHeight ?? 150,
            maxWidth: options.maxWidth ?? Infinity,
            maxHeight: options.maxHeight ?? Infinity,
          },
          zIndex: focusStack.length,
          state: options.state ?? 'normal',
          flags: {
            resizable: options.resizable ?? true,
            maximizable: options.maximizable ?? true,
            minimizable: options.minimizable ?? true,
            closable: options.closable ?? true,
          },
          props: options.props ?? {},
          metadata: {
            icon: options.icon,
            className: options.className,
            createdAt: Date.now(),
            focusedAt: Date.now(),
          },
        };

        const newWindows = new Map(windows);
        newWindows.set(id, newWindow);
        const newFocusStack = [...focusStack, id];

        set({
          windows: recalcZIndexes(newWindows, newFocusStack),
          focusStack: newFocusStack,
        });

        return id;
      },

      closeWindow: (id) => {
        const { windows, focusStack } = get();
        const window = windows.get(id);
        if (!window) return;
        if (!window.flags.closable) return;

        const newWindows = new Map(windows);
        newWindows.delete(id);
        const newFocusStack = focusStack.filter((wid) => wid !== id);

        set({
          windows: recalcZIndexes(newWindows, newFocusStack),
          focusStack: newFocusStack,
        });
      },

      closeByAppId: (appId) => {
        const { windows, focusStack } = get();
        const idsToClose: string[] = [];
        windows.forEach((w) => {
          if (w.appId === appId && w.flags.closable) {
            idsToClose.push(w.id);
          }
        });

        if (idsToClose.length === 0) return;

        const closeSet = new Set(idsToClose);
        const newWindows = new Map(windows);
        idsToClose.forEach((id) => newWindows.delete(id));
        const newFocusStack = focusStack.filter((id) => !closeSet.has(id));

        set({
          windows: recalcZIndexes(newWindows, newFocusStack),
          focusStack: newFocusStack,
        });
      },

      closeAll: () => {
        const { windows, focusStack } = get();
        const newWindows = new Map<string, WorkspaceWindow>();
        const keepIds = new Set<string>();

        windows.forEach((w, id) => {
          if (!w.flags.closable) {
            newWindows.set(id, w);
            keepIds.add(id);
          }
        });

        const newFocusStack = keepIds.size > 0
          ? focusStack.filter((id) => keepIds.has(id))
          : [];

        set({
          windows: newFocusStack.length > 0 ? recalcZIndexes(newWindows, newFocusStack) : newWindows,
          focusStack: newFocusStack,
        });
      },

      // ============================================================
      // Focus
      // ============================================================

      focusWindow: (id) => {
        const { windows, focusStack } = get();
        const window = windows.get(id);
        if (!window) return;

        const newFocusStack = focusStack.filter((wid) => wid !== id);
        newFocusStack.push(id);

        const newWindows = new Map(windows);
        if (window.state === 'minimized') {
          const targetState = window.previousBounds?.previousState ?? 'normal';
          const restored: WorkspaceWindow = {
            ...window,
            state: targetState,
            position: window.previousBounds?.position ?? window.position,
            size: window.previousBounds?.size ?? window.size,
            previousBounds: undefined,
            metadata: { ...window.metadata, focusedAt: Date.now() },
          };
          newWindows.set(id, restored);
        } else {
          newWindows.set(id, {
            ...window,
            metadata: { ...window.metadata, focusedAt: Date.now() },
          });
        }

        set({
          windows: recalcZIndexes(newWindows, newFocusStack),
          focusStack: newFocusStack,
        });
      },

      focusNext: () => {
        const { focusStack, windows } = get();
        if (focusStack.length < 2) return;

        // Rotate: move currently focused (last) to bottom, focus new top
        // [A, B, C] → [C, A, B] → B becomes focused
        const current = focusStack[focusStack.length - 1];
        const newStack = [current, ...focusStack.slice(0, -1)];

        const newFocusedId = newStack[newStack.length - 1];
        const newWindows = new Map(windows);
        const focused = newWindows.get(newFocusedId);
        if (focused) {
          newWindows.set(newFocusedId, {
            ...focused,
            metadata: { ...focused.metadata, focusedAt: Date.now() },
          });
        }

        set({
          windows: recalcZIndexes(newWindows, newStack),
          focusStack: newStack,
        });
      },

      focusPrevious: () => {
        const { focusStack, windows } = get();
        if (focusStack.length < 2) return;

        // Rotate opposite: move bottom to top (focus it)
        // [A, B, C] → [B, C, A] → A becomes focused
        const bottom = focusStack[0];
        const newStack = [...focusStack.slice(1), bottom];

        const newWindows = new Map(windows);
        const focused = newWindows.get(bottom);
        if (focused) {
          newWindows.set(bottom, {
            ...focused,
            metadata: { ...focused.metadata, focusedAt: Date.now() },
          });
        }

        set({
          windows: recalcZIndexes(newWindows, newStack),
          focusStack: newStack,
        });
      },

      // ============================================================
      // Position & Size
      // ============================================================

      updatePosition: (id, position) => {
        const { windows } = get();
        const window = windows.get(id);
        if (!window) return;

        const newWindows = new Map(windows);
        newWindows.set(id, { ...window, position });
        set({ windows: newWindows });
      },

      updateSize: (id, size) => {
        const { windows } = get();
        const window = windows.get(id);
        if (!window) return;

        const clampedSize = {
          width: Math.max(window.constraints.minWidth, Math.min(size.width, window.constraints.maxWidth)),
          height: Math.max(window.constraints.minHeight, Math.min(size.height, window.constraints.maxHeight)),
        };

        const newWindows = new Map(windows);
        newWindows.set(id, { ...window, size: clampedSize });
        set({ windows: newWindows });
      },

      setBounds: (id, bounds) => {
        const { windows } = get();
        const window = windows.get(id);
        if (!window) return;

        const clampedSize = {
          width: Math.max(window.constraints.minWidth, Math.min(bounds.width, window.constraints.maxWidth)),
          height: Math.max(window.constraints.minHeight, Math.min(bounds.height, window.constraints.maxHeight)),
        };

        const newWindows = new Map(windows);
        newWindows.set(id, {
          ...window,
          position: { x: bounds.x, y: bounds.y },
          size: clampedSize,
        });
        set({ windows: newWindows });
      },

      centerWindow: (id, viewportWidth, viewportHeight) => {
        const { windows } = get();
        const window = windows.get(id);
        if (!window) return;

        const newWindows = new Map(windows);
        newWindows.set(id, {
          ...window,
          position: {
            x: Math.round((viewportWidth - window.size.width) / 2),
            y: Math.round((viewportHeight - window.size.height) / 2),
          },
        });
        set({ windows: newWindows });
      },

      // ============================================================
      // State
      // ============================================================

      minimizeWindow: (id) => {
        const { windows, focusStack } = get();
        const window = windows.get(id);
        if (!window || !window.flags.minimizable || window.state === 'minimized') return;

        const newWindows = new Map(windows);
        newWindows.set(id, {
          ...window,
          state: 'minimized',
          previousBounds: {
            position: window.position,
            size: window.size,
            previousState: window.state,
          },
        });

        // Demote minimized window: move to bottom of focus stack
        const isFocused = focusStack[focusStack.length - 1] === id;
        if (isFocused && focusStack.length > 1) {
          const newFocusStack = [id, ...focusStack.filter((wid) => wid !== id)];
          set({
            windows: recalcZIndexes(newWindows, newFocusStack),
            focusStack: newFocusStack,
          });
        } else {
          set({ windows: newWindows });
        }
      },

      maximizeWindow: (id, viewportWidth, viewportHeight, taskbarHeight = 48) => {
        const { windows } = get();
        const window = windows.get(id);
        if (!window || !window.flags.maximizable) return;
        if (window.state === 'maximized') return;

        const newWindows = new Map(windows);
        newWindows.set(id, {
          ...window,
          state: 'maximized',
          previousBounds: {
            position: window.position,
            size: window.size,
            previousState: window.state,
          },
          position: { x: 0, y: 0 },
          size: {
            width: viewportWidth,
            height: viewportHeight - taskbarHeight,
          },
        });
        set({ windows: newWindows });
      },

      restoreWindow: (id) => {
        const { windows } = get();
        const window = windows.get(id);
        if (!window || window.state === 'normal') return;

        const targetState = window.previousBounds?.previousState ?? 'normal';

        const newWindows = new Map(windows);
        newWindows.set(id, {
          ...window,
          state: targetState,
          position: window.previousBounds?.position ?? window.position,
          size: window.previousBounds?.size ?? window.size,
          previousBounds: undefined,
        });
        set({ windows: newWindows });
      },

      toggleMaximize: (id, viewportWidth, viewportHeight, taskbarHeight = 48) => {
        const { windows } = get();
        const window = windows.get(id);
        if (!window) return;

        if (window.state === 'maximized') {
          get().restoreWindow(id);
        } else if (window.state === 'minimized') {
          get().restoreWindow(id);
          get().maximizeWindow(id, viewportWidth, viewportHeight, taskbarHeight);
        } else {
          get().maximizeWindow(id, viewportWidth, viewportHeight, taskbarHeight);
        }
      },

      setWindowState: (id, state) => {
        const { windows } = get();
        const window = windows.get(id);
        if (!window) return;
        if (window.state === state) return;

        // Respect flags
        if (state === 'minimized' && !window.flags.minimizable) return;
        if (state === 'maximized' && !window.flags.maximizable) return;

        const newWindows = new Map(windows);
        const updated: WorkspaceWindow = { ...window, state };

        // Save previousBounds when leaving 'normal' state
        if (window.state === 'normal' && state !== 'normal') {
          updated.previousBounds = {
            position: window.position,
            size: window.size,
            previousState: window.state,
          };
        }

        // Restore previousBounds when returning to 'normal'
        if (state === 'normal' && window.previousBounds) {
          updated.position = window.previousBounds.position;
          updated.size = window.previousBounds.size;
          updated.previousBounds = undefined;
        }

        newWindows.set(id, updated);
        set({ windows: newWindows });
      },

      // ============================================================
      // Bulk Operations
      // ============================================================

      minimizeAll: () => {
        const { windows, focusStack } = get();
        const newWindows = new Map(windows);
        let changed = false;
        const minimizedIds = new Set<string>();

        newWindows.forEach((w, id) => {
          if (w.flags.minimizable && w.state !== 'minimized') {
            newWindows.set(id, {
              ...w,
              state: 'minimized',
              previousBounds: {
                position: w.position,
                size: w.size,
                previousState: w.state,
              },
            });
            minimizedIds.add(id);
            changed = true;
          }
        });

        if (changed) {
          // Reorder focus stack: move all newly minimized windows to the bottom
          const nonMinimized = focusStack.filter((id) => !minimizedIds.has(id));
          const minimized = focusStack.filter((id) => minimizedIds.has(id));
          const newFocusStack = [...minimized, ...nonMinimized];

          set({
            windows: recalcZIndexes(newWindows, newFocusStack),
            focusStack: newFocusStack,
          });
        }
      },

      cascadeWindows: (viewportWidth, viewportHeight, taskbarHeight = 48) => {
        const { windows, focusStack } = get();
        const newWindows = new Map(windows);
        const CASCADE_OFFSET_X = 30;
        const CASCADE_OFFSET_Y = 30;

        // Only cascade non-minimized windows in focus order
        const visibleIds = focusStack.filter((id) => {
          const w = windows.get(id);
          return w && w.state !== 'minimized';
        });

        if (visibleIds.length === 0) return;

        const availableHeight = viewportHeight - taskbarHeight;

        visibleIds.forEach((id, index) => {
          const w = newWindows.get(id);
          if (!w) return;

          // Respect constraints when restoring original size
          const width = Math.max(w.constraints.minWidth, Math.min(w.size.width, w.constraints.maxWidth));
          const height = Math.max(w.constraints.minHeight, Math.min(w.size.height, w.constraints.maxHeight));

          // Wrap cascade when windows would extend below the available area
          const rawY = CASCADE_OFFSET_Y * index;
          const y = rawY + height > availableHeight ? rawY % Math.max(availableHeight - height, CASCADE_OFFSET_Y) : rawY;

          newWindows.set(id, {
            ...w,
            state: 'normal',
            position: {
              x: CASCADE_OFFSET_X * index,
              y,
            },
            size: { width, height },
            previousBounds: undefined,
          });
        });

        set({ windows: recalcZIndexes(newWindows, focusStack) });
      },

      tileWindows: (layout, viewportWidth, viewportHeight, taskbarHeight = 48) => {
        const { windows, focusStack } = get();
        const newWindows = new Map(windows);
        const availableHeight = viewportHeight - taskbarHeight;

        // Only tile non-minimized windows
        const visibleIds = focusStack.filter((id) => {
          const w = windows.get(id);
          return w && w.state !== 'minimized';
        });

        const count = visibleIds.length;
        if (count === 0) return;

        visibleIds.forEach((id, index) => {
          const w = newWindows.get(id);
          if (!w) return;

          let position: WindowPosition;
          let size: WindowSize;

          if (layout === 'horizontal') {
            const tileWidth = Math.floor(viewportWidth / count);
            position = { x: tileWidth * index, y: 0 };
            size = { width: tileWidth, height: availableHeight };
          } else if (layout === 'vertical') {
            const tileHeight = Math.floor(availableHeight / count);
            position = { x: 0, y: tileHeight * index };
            size = { width: viewportWidth, height: tileHeight };
          } else {
            // grid
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            const col = index % cols;
            const row = Math.floor(index / cols);
            const tileWidth = Math.floor(viewportWidth / cols);
            const tileHeight = Math.floor(availableHeight / rows);
            position = { x: tileWidth * col, y: tileHeight * row };
            size = { width: tileWidth, height: tileHeight };
          }

          // Respect constraints
          const clampedSize = {
            width: Math.max(w.constraints.minWidth, Math.min(size.width, w.constraints.maxWidth)),
            height: Math.max(w.constraints.minHeight, Math.min(size.height, w.constraints.maxHeight)),
          };

          newWindows.set(id, {
            ...w,
            state: 'normal',
            position,
            size: clampedSize,
            previousBounds: undefined,
          });
        });

        set({ windows: recalcZIndexes(newWindows, focusStack) });
      },

      // ============================================================
      // Queries (imperative, non-reactive)
      // ============================================================

      getWindow: (id) => get().windows.get(id),

      getWindowsByAppId: (appId) => {
        const result: WorkspaceWindow[] = [];
        get().windows.forEach((w) => {
          if (w.appId === appId) result.push(w);
        });
        return result;
      },

      getAllWindows: () => Array.from(get().windows.values()),

      getFocusedWindow: () => {
        const { windows, focusStack } = get();
        const focusedId = focusStack[focusStack.length - 1];
        return focusedId ? windows.get(focusedId) : undefined;
      },

      existsWindow: (id) => get().windows.has(id),
    })),
    { name: 'WindowsStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

export const useWindow = (id: string) =>
  useWindowsStore((state) => state.windows.get(id));

export const useFocusedWindowId = () =>
  useWindowsStore((state) => state.focusStack[state.focusStack.length - 1]);

// Stable selector: memoizes the array reference to avoid unnecessary re-renders
let cachedWindowsArray: WorkspaceWindow[] = [];
let cachedWindowsMap: Map<string, WorkspaceWindow> | null = null;

export const useAllWindows = () =>
  useWindowsStore((state) => {
    if (state.windows !== cachedWindowsMap) {
      cachedWindowsMap = state.windows;
      cachedWindowsArray = Array.from(state.windows.values());
    }
    return cachedWindowsArray;
  });

// ============================================================
// Event Subscriptions (RFC-001: WindowService Events)
// ============================================================

/**
 * Subscribe to window open events.
 * Fires when a new window is added to the store.
 */
export function onWindowOpen(handler: (window: WorkspaceWindow) => void): Unsubscribe {
  let prevIds = new Set(useWindowsStore.getState().windows.keys());

  return useWindowsStore.subscribe(
    (state) => state.windows,
    (windows) => {
      windows.forEach((w, id) => {
        if (!prevIds.has(id)) handler(w);
      });
      prevIds = new Set(windows.keys());
    },
  );
}

/**
 * Subscribe to window close events.
 * Fires when a window is removed from the store.
 */
export function onWindowClose(handler: (id: string) => void): Unsubscribe {
  let prevIds = new Set(useWindowsStore.getState().windows.keys());

  return useWindowsStore.subscribe(
    (state) => state.windows,
    (windows) => {
      const currentIds = new Set(windows.keys());
      prevIds.forEach((id) => {
        if (!currentIds.has(id)) handler(id);
      });
      prevIds = currentIds;
    },
  );
}

/**
 * Subscribe to focus events for a specific window.
 * Fires when the window becomes the focused (top of stack) window.
 */
export function onWindowFocus(id: string, handler: () => void): Unsubscribe {
  return useWindowsStore.subscribe(
    (state) => state.focusStack[state.focusStack.length - 1],
    (focusedId, prevFocusedId) => {
      if (focusedId === id && prevFocusedId !== id) handler();
    },
  );
}

/**
 * Subscribe to blur events for a specific window.
 * Fires when the window loses focus (was focused, now another is).
 */
export function onWindowBlur(id: string, handler: () => void): Unsubscribe {
  return useWindowsStore.subscribe(
    (state) => state.focusStack[state.focusStack.length - 1],
    (focusedId, prevFocusedId) => {
      if (prevFocusedId === id && focusedId !== id) handler();
    },
  );
}

/**
 * Subscribe to state change events for a specific window.
 * Fires when the window's state (normal/minimized/maximized) changes.
 */
export function onWindowStateChange(id: string, handler: (state: WindowState) => void): Unsubscribe {
  return useWindowsStore.subscribe(
    (state) => state.windows.get(id)?.state,
    (newState, prevState) => {
      if (newState && newState !== prevState) handler(newState);
    },
  );
}
