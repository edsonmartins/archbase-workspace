import { useWindowsStore } from '@archbase/workspace-state';

export function createWindowService(appId: string, windowId: string) {
  return {
    open(opts: { title: string; width?: number; height?: number; props?: Record<string, unknown> }) {
      return useWindowsStore.getState().openWindow({
        appId,
        title: opts.title,
        width: opts.width,
        height: opts.height,
        props: opts.props,
      });
    },

    close(wId?: string) {
      useWindowsStore.getState().closeWindow(wId ?? windowId);
    },

    minimize(wId?: string) {
      useWindowsStore.getState().minimizeWindow(wId ?? windowId);
    },

    maximize(wId?: string) {
      const vw = globalThis.innerWidth ?? 1920;
      const vh = globalThis.innerHeight ?? 1080;
      useWindowsStore.getState().maximizeWindow(wId ?? windowId, vw, vh);
    },

    restore(wId?: string) {
      useWindowsStore.getState().restoreWindow(wId ?? windowId);
    },

    setTitle(title: string, wId?: string) {
      const id = wId ?? windowId;
      const win = useWindowsStore.getState().getWindow(id);
      if (!win) return;
      // Update window in store — we need to use the store's internal setter
      useWindowsStore.setState((state) => {
        const windows = new Map(state.windows);
        const existing = windows.get(id);
        if (existing) {
          windows.set(id, { ...existing, title });
        }
        return { windows };
      });
    },

    getAll() {
      const windows = useWindowsStore.getState().getWindowsByAppId(appId);
      return windows.map((w) => ({
        id: w.id,
        title: w.title,
        state: w.state,
      }));
    },
  };
}
