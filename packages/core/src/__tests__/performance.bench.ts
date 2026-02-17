/**
 * Performance Benchmarks for WindowsStore (BLOCO E - Phase 7)
 *
 * Goal: Prove that 50+ windows can operate within 60fps (16ms frame budget).
 *
 * Run with:
 *   pnpm --filter @archbase/workspace-core test -- --bench
 *
 * Uses Vitest bench API to measure throughput of critical store operations.
 */
import { bench, describe, beforeEach } from 'vitest';
import { useWindowsStore } from '@archbase/workspace-state';

function resetStore() {
  useWindowsStore.setState({
    windows: new Map(),
    focusStack: [],
  });
}

function create50Windows() {
  const store = useWindowsStore.getState();
  for (let i = 0; i < 50; i++) {
    store.openWindow({
      appId: `bench-app-${i}`,
      title: `Benchmark Window ${i}`,
    });
  }
}

describe('Window Store Performance', () => {
  beforeEach(() => {
    resetStore();
  });

  bench('create 50 windows', () => {
    resetStore();
    const store = useWindowsStore.getState();
    for (let i = 0; i < 50; i++) {
      store.openWindow({
        appId: `bench-${i}`,
        title: `Window ${i}`,
      });
    }
  });

  bench('updatePosition for all 50 windows', () => {
    resetStore();
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());
    for (const w of windows) {
      store.updatePosition(w.id, {
        x: Math.random() * 1000,
        y: Math.random() * 800,
      });
    }
  });

  bench('updateSize for all 50 windows', () => {
    resetStore();
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());
    for (const w of windows) {
      store.updateSize(w.id, {
        width: 400 + Math.random() * 600,
        height: 300 + Math.random() * 400,
      });
    }
  });

  bench('setBounds for all 50 windows', () => {
    resetStore();
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());
    for (const w of windows) {
      store.setBounds(w.id, {
        x: Math.random() * 1000,
        y: Math.random() * 800,
        width: 400 + Math.random() * 600,
        height: 300 + Math.random() * 400,
      });
    }
  });

  bench('focus cycle all 50 windows', () => {
    resetStore();
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());
    for (const w of windows) {
      store.focusWindow(w.id);
    }
  });

  bench('focusNext 50 times', () => {
    resetStore();
    create50Windows();
    const store = useWindowsStore.getState();
    for (let i = 0; i < 50; i++) {
      store.focusNext();
    }
  });

  bench('focusPrevious 50 times', () => {
    resetStore();
    create50Windows();
    const store = useWindowsStore.getState();
    for (let i = 0; i < 50; i++) {
      store.focusPrevious();
    }
  });

  bench('minimizeAll 50 windows', () => {
    resetStore();
    create50Windows();
    useWindowsStore.getState().minimizeAll();
  });

  bench('tileWindows horizontal with 50 windows', () => {
    resetStore();
    create50Windows();
    useWindowsStore.getState().tileWindows('horizontal', 1920, 1080, 48);
  });

  bench('tileWindows grid with 50 windows', () => {
    resetStore();
    create50Windows();
    useWindowsStore.getState().tileWindows('grid', 1920, 1080, 48);
  });

  bench('cascadeWindows with 50 windows', () => {
    resetStore();
    create50Windows();
    useWindowsStore.getState().cascadeWindows(1920, 1080, 48);
  });

  bench('close all 50 windows individually', () => {
    resetStore();
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());
    for (const w of windows) {
      store.closeWindow(w.id);
    }
  });

  bench('closeAll with 50 windows', () => {
    resetStore();
    create50Windows();
    useWindowsStore.getState().closeAll();
  });

  bench('mixed workload: open, move, focus, minimize, restore', () => {
    resetStore();
    const store = useWindowsStore.getState();

    // Open 50 windows
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      ids.push(
        store.openWindow({
          appId: `mixed-${i}`,
          title: `Mixed ${i}`,
        }),
      );
    }

    // Move all
    for (const id of ids) {
      store.updatePosition(id, { x: Math.random() * 1000, y: Math.random() * 800 });
    }

    // Focus cycle through first 25
    for (let i = 0; i < 25; i++) {
      store.focusWindow(ids[i]);
    }

    // Minimize all
    store.minimizeAll();

    // Restore first 10 by focusing
    for (let i = 0; i < 10; i++) {
      store.focusWindow(ids[i]);
    }
  });
});
