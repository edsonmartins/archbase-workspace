/**
 * Frame Budget Tests for WindowsStore (BLOCO E - Phase 7)
 *
 * Goal: Prove that all critical window operations with 50+ windows
 * complete within the 60fps frame budget (16ms per frame).
 *
 * Each test creates 50 windows, performs the operation, and asserts
 * that the elapsed time stays within the allowed frame budget.
 *
 * Budget allocations:
 * - Bulk creation (50 windows):   5 frames (80ms) -- one-time setup cost
 * - Move all 50:                  1 frame  (16ms) -- must be real-time
 * - Resize all 50:                1 frame  (16ms) -- must be real-time
 * - Focus cycle 50:               2 frames (32ms) -- z-index recalc each time
 * - Minimize all:                 1 frame  (16ms) -- single batch operation
 * - Tile 50:                      1 frame  (16ms) -- single batch operation
 * - Cascade 50:                   1 frame  (16ms) -- single batch operation
 * - Close all 50 individually:    2 frames (32ms) -- sequential deletes
 * - closeAll batch:               1 frame  (16ms) -- single batch operation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useWindowsStore } from '@archbase/workspace-state';

const FRAME_BUDGET_MS = 16; // 60fps = 16.67ms per frame

function resetStore() {
  useWindowsStore.setState({
    windows: new Map(),
    focusStack: [],
  });
}

function create50Windows(): string[] {
  const store = useWindowsStore.getState();
  const ids: string[] = [];
  for (let i = 0; i < 50; i++) {
    ids.push(
      store.openWindow({
        appId: `bench-app-${i}`,
        title: `Window ${i}`,
      }),
    );
  }
  return ids;
}

describe('Frame Budget Tests (50 windows @ 60fps)', () => {
  beforeEach(() => {
    resetStore();
  });

  // ------------------------------------------------------------------
  // Creation
  // ------------------------------------------------------------------

  it('creates 50 windows within 5-frame budget (80ms)', () => {
    const start = performance.now();
    const ids = create50Windows();
    const elapsed = performance.now() - start;

    expect(useWindowsStore.getState().windows.size).toBe(50);
    expect(ids.length).toBe(50);
    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 5);
    console.log(`  Create 50 windows: ${elapsed.toFixed(2)}ms`);
  });

  // ------------------------------------------------------------------
  // Position & Size
  // ------------------------------------------------------------------

  it('moves all 50 windows within 1-frame budget (16ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());

    const start = performance.now();
    for (const w of windows) {
      store.updatePosition(w.id, {
        x: Math.random() * 1000,
        y: Math.random() * 800,
      });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  Move 50 windows: ${elapsed.toFixed(2)}ms`);
  });

  it('resizes all 50 windows within 1-frame budget (16ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());

    const start = performance.now();
    for (const w of windows) {
      store.updateSize(w.id, {
        width: 400 + Math.random() * 600,
        height: 300 + Math.random() * 400,
      });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  Resize 50 windows: ${elapsed.toFixed(2)}ms`);
  });

  it('sets bounds for all 50 windows within 1-frame budget (16ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());

    const start = performance.now();
    for (const w of windows) {
      store.setBounds(w.id, {
        x: Math.random() * 1000,
        y: Math.random() * 800,
        width: 400 + Math.random() * 600,
        height: 300 + Math.random() * 400,
      });
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  SetBounds 50 windows: ${elapsed.toFixed(2)}ms`);
  });

  // ------------------------------------------------------------------
  // Focus
  // ------------------------------------------------------------------

  it('focus cycles 50 windows within 2-frame budget (32ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());

    const start = performance.now();
    for (const w of windows) {
      store.focusWindow(w.id);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 2);
    console.log(`  Focus cycle 50 windows: ${elapsed.toFixed(2)}ms`);
  });

  it('focusNext 50 times within 2-frame budget (32ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      store.focusNext();
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 2);
    console.log(`  FocusNext x50: ${elapsed.toFixed(2)}ms`);
  });

  it('focusPrevious 50 times within 2-frame budget (32ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      store.focusPrevious();
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 2);
    console.log(`  FocusPrevious x50: ${elapsed.toFixed(2)}ms`);
  });

  // ------------------------------------------------------------------
  // State changes
  // ------------------------------------------------------------------

  it('minimizes all 50 windows within 1-frame budget (16ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();

    const start = performance.now();
    store.minimizeAll();
    const elapsed = performance.now() - start;

    // Verify all are minimized
    const windows = Array.from(useWindowsStore.getState().windows.values());
    expect(windows.every((w) => w.state === 'minimized')).toBe(true);

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  MinimizeAll 50: ${elapsed.toFixed(2)}ms`);
  });

  it('minimizes then restores 50 windows individually within 2-frame budget each', () => {
    const ids = create50Windows();
    const store = useWindowsStore.getState();

    // Minimize all individually
    const startMin = performance.now();
    for (const id of ids) {
      store.minimizeWindow(id);
    }
    const elapsedMin = performance.now() - startMin;

    expect(elapsedMin).toBeLessThan(FRAME_BUDGET_MS * 2);
    console.log(`  Minimize 50 individually: ${elapsedMin.toFixed(2)}ms`);

    // Restore all individually
    const startRestore = performance.now();
    for (const id of ids) {
      store.restoreWindow(id);
    }
    const elapsedRestore = performance.now() - startRestore;

    expect(elapsedRestore).toBeLessThan(FRAME_BUDGET_MS * 2);
    console.log(`  Restore 50 individually: ${elapsedRestore.toFixed(2)}ms`);
  });

  // ------------------------------------------------------------------
  // Tiling & Cascade
  // ------------------------------------------------------------------

  it('tiles 50 windows horizontally within 1-frame budget (16ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();

    const start = performance.now();
    store.tileWindows('horizontal', 1920, 1080, 48);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  Tile horizontal 50: ${elapsed.toFixed(2)}ms`);
  });

  it('tiles 50 windows vertically within 1-frame budget (16ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();

    const start = performance.now();
    store.tileWindows('vertical', 1920, 1080, 48);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  Tile vertical 50: ${elapsed.toFixed(2)}ms`);
  });

  it('tiles 50 windows in grid within 1-frame budget (16ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();

    const start = performance.now();
    store.tileWindows('grid', 1920, 1080, 48);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  Tile grid 50: ${elapsed.toFixed(2)}ms`);
  });

  it('cascades 50 windows within 1-frame budget (16ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();

    const start = performance.now();
    store.cascadeWindows(1920, 1080, 48);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  Cascade 50: ${elapsed.toFixed(2)}ms`);
  });

  // ------------------------------------------------------------------
  // Close
  // ------------------------------------------------------------------

  it('closes all 50 windows individually within 2-frame budget (32ms)', () => {
    create50Windows();
    const store = useWindowsStore.getState();
    const windows = Array.from(store.windows.values());

    const start = performance.now();
    for (const w of windows) {
      store.closeWindow(w.id);
    }
    const elapsed = performance.now() - start;

    expect(useWindowsStore.getState().windows.size).toBe(0);
    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 2);
    console.log(`  Close 50 individually: ${elapsed.toFixed(2)}ms`);
  });

  it('closeAll 50 windows in batch within 1-frame budget (16ms)', () => {
    create50Windows();

    const start = performance.now();
    useWindowsStore.getState().closeAll();
    const elapsed = performance.now() - start;

    expect(useWindowsStore.getState().windows.size).toBe(0);
    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS);
    console.log(`  CloseAll batch 50: ${elapsed.toFixed(2)}ms`);
  });

  // ------------------------------------------------------------------
  // Mixed Workload
  // ------------------------------------------------------------------

  it('mixed workload (open + move + focus + minimize + tile) within 10-frame budget (160ms)', () => {
    const start = performance.now();

    // Phase 1: Create 50 windows
    const store = useWindowsStore.getState();
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      ids.push(
        store.openWindow({
          appId: `mixed-${i}`,
          title: `Mixed ${i}`,
        }),
      );
    }

    // Phase 2: Move all
    for (const id of ids) {
      store.updatePosition(id, {
        x: Math.random() * 1000,
        y: Math.random() * 800,
      });
    }

    // Phase 3: Focus cycle first 25
    for (let i = 0; i < 25; i++) {
      store.focusWindow(ids[i]);
    }

    // Phase 4: Minimize all
    store.minimizeAll();

    // Phase 5: Restore first 10 by focusing
    for (let i = 0; i < 10; i++) {
      store.focusWindow(ids[i]);
    }

    // Phase 6: Tile remaining visible
    store.tileWindows('grid', 1920, 1080, 48);

    const elapsed = performance.now() - start;

    expect(useWindowsStore.getState().windows.size).toBe(50);
    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 10);
    console.log(`  Mixed workload: ${elapsed.toFixed(2)}ms`);
  });

  // ------------------------------------------------------------------
  // Scale Test: 100 windows
  // ------------------------------------------------------------------

  it('scales to 100 windows: create within 10-frame budget (160ms)', () => {
    const store = useWindowsStore.getState();

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      store.openWindow({
        appId: `scale-${i}`,
        title: `Scale ${i}`,
      });
    }
    const elapsed = performance.now() - start;

    expect(useWindowsStore.getState().windows.size).toBe(100);
    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 10);
    console.log(`  Create 100 windows: ${elapsed.toFixed(2)}ms`);
  });

  it('scales to 100 windows: tileWindows grid within 2-frame budget (32ms)', () => {
    const store = useWindowsStore.getState();
    for (let i = 0; i < 100; i++) {
      store.openWindow({
        appId: `scale-${i}`,
        title: `Scale ${i}`,
      });
    }

    const start = performance.now();
    store.tileWindows('grid', 1920, 1080, 48);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 2);
    console.log(`  Tile grid 100: ${elapsed.toFixed(2)}ms`);
  });

  it('scales to 100 windows: cascadeWindows within 2-frame budget (32ms)', () => {
    const store = useWindowsStore.getState();
    for (let i = 0; i < 100; i++) {
      store.openWindow({
        appId: `scale-${i}`,
        title: `Scale ${i}`,
      });
    }

    const start = performance.now();
    store.cascadeWindows(1920, 1080, 48);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(FRAME_BUDGET_MS * 2);
    console.log(`  Cascade 100: ${elapsed.toFixed(2)}ms`);
  });

  // ------------------------------------------------------------------
  // Query Performance
  // ------------------------------------------------------------------

  it('getWindow, getAllWindows, getWindowsByAppId queries are near-instant with 50 windows', () => {
    create50Windows();
    const store = useWindowsStore.getState();
    const allWindows = store.getAllWindows();
    const firstId = allWindows[0].id;

    const startGet = performance.now();
    for (let i = 0; i < 1000; i++) {
      store.getWindow(firstId);
    }
    const elapsedGet = performance.now() - startGet;

    const startAll = performance.now();
    for (let i = 0; i < 1000; i++) {
      store.getAllWindows();
    }
    const elapsedAll = performance.now() - startAll;

    const startByApp = performance.now();
    for (let i = 0; i < 1000; i++) {
      store.getWindowsByAppId('bench-app-0');
    }
    const elapsedByApp = performance.now() - startByApp;

    // 1000 queries should be well under 16ms
    expect(elapsedGet).toBeLessThan(FRAME_BUDGET_MS);
    expect(elapsedAll).toBeLessThan(FRAME_BUDGET_MS);
    expect(elapsedByApp).toBeLessThan(FRAME_BUDGET_MS);

    console.log(`  getWindow x1000: ${elapsedGet.toFixed(2)}ms`);
    console.log(`  getAllWindows x1000: ${elapsedAll.toFixed(2)}ms`);
    console.log(`  getWindowsByAppId x1000: ${elapsedByApp.toFixed(2)}ms`);
  });
});
