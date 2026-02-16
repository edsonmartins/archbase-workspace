import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { RegisteredWidget } from '@archbase/workspace-types';

// ============================================================
// Types
// ============================================================

interface WidgetRegistryState {
  widgets: Map<string, RegisteredWidget>;
}

interface WidgetRegistryActions {
  register: (widget: RegisteredWidget) => void;
  registerBatch: (widgets: RegisteredWidget[]) => void;
  unregister: (id: string) => void;
  unregisterBySource: (appId: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  getWidget: (id: string) => RegisteredWidget | undefined;
  getByLocation: (location: 'statusBar' | 'sidebar' | 'panel') => RegisteredWidget[];
  getAllWidgets: () => RegisteredWidget[];
}

type WidgetRegistryStore = WidgetRegistryState & WidgetRegistryActions;

const MAX_WIDGETS = 200;

// ============================================================
// Store
// ============================================================

export const useWidgetRegistryStore = create<WidgetRegistryStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      widgets: new Map(),

      register: (widget) => {
        set((state) => {
          const widgets = new Map(state.widgets);
          widgets.set(widget.id, widget);
          if (widgets.size > MAX_WIDGETS) {
            const iter = widgets.keys();
            while (widgets.size > MAX_WIDGETS) {
              const oldest = iter.next().value;
              if (oldest !== undefined) widgets.delete(oldest);
            }
          }
          return { widgets };
        });
      },

      registerBatch: (widgetList) => {
        set((state) => {
          const widgets = new Map(state.widgets);
          for (const w of widgetList) {
            widgets.set(w.id, w);
          }
          if (widgets.size > MAX_WIDGETS) {
            const iter = widgets.keys();
            while (widgets.size > MAX_WIDGETS) {
              const oldest = iter.next().value;
              if (oldest !== undefined) widgets.delete(oldest);
            }
          }
          return { widgets };
        });
      },

      unregister: (id) => {
        const { widgets } = get();
        if (!widgets.has(id)) return;
        set((state) => {
          const widgets = new Map(state.widgets);
          widgets.delete(id);
          return { widgets };
        });
      },

      unregisterBySource: (appId) => {
        const { widgets } = get();
        const toRemove: string[] = [];
        widgets.forEach((w) => {
          if (w.source === appId) toRemove.push(w.id);
        });
        if (toRemove.length === 0) return;
        set((state) => {
          const widgets = new Map(state.widgets);
          for (const id of toRemove) {
            widgets.delete(id);
          }
          return { widgets };
        });
      },

      setVisible: (id, visible) => {
        const widget = get().widgets.get(id);
        if (!widget || widget.visible === visible) return;
        set((state) => {
          const widgets = new Map(state.widgets);
          widgets.set(id, { ...widget, visible });
          return { widgets };
        });
      },

      getWidget: (id) => get().widgets.get(id),

      getByLocation: (location) => {
        const result: RegisteredWidget[] = [];
        get().widgets.forEach((w) => {
          if (w.defaultLocation === location && w.visible) result.push(w);
        });
        result.sort((a, b) => a.order - b.order);
        return result;
      },

      getAllWidgets: () => Array.from(get().widgets.values()),
    })),
    { name: 'WidgetRegistryStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

export const useWidget = (id: string) =>
  useWidgetRegistryStore((state) => state.widgets.get(id));

let cachedWidgetsArray: RegisteredWidget[] = [];
let cachedWidgetsMap: Map<string, RegisteredWidget> | null = null;

export const useAllWidgets = () =>
  useWidgetRegistryStore((state) => {
    if (state.widgets !== cachedWidgetsMap) {
      cachedWidgetsMap = state.widgets;
      cachedWidgetsArray = Array.from(state.widgets.values());
    }
    return cachedWidgetsArray;
  });

let cachedStatusBarWidgets: RegisteredWidget[] = [];
let cachedStatusBarMap: Map<string, RegisteredWidget> | null = null;

export const useStatusBarWidgets = () =>
  useWidgetRegistryStore((state) => {
    if (state.widgets === cachedStatusBarMap) return cachedStatusBarWidgets;
    cachedStatusBarMap = state.widgets;
    const result: RegisteredWidget[] = [];
    state.widgets.forEach((w) => {
      if (w.defaultLocation === 'statusBar' && w.visible) result.push(w);
    });
    result.sort((a, b) => a.order - b.order);
    cachedStatusBarWidgets = result;
    return cachedStatusBarWidgets;
  });
