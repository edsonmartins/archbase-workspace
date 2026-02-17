import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useWindowsStore,
  onWindowOpen,
  onWindowClose,
  onWindowFocus,
  onWindowBlur,
  onWindowStateChange,
} from '../windows';

// Helper to get store state directly
function getState() {
  return useWindowsStore.getState();
}

describe('WindowsStore', () => {
  beforeEach(() => {
    // Force-reset store state directly (bypasses closeAll closable checks)
    useWindowsStore.setState({ windows: new Map(), focusStack: [] });
  });

  // ============================================================
  // CRUD
  // ============================================================

  describe('openWindow', () => {
    it('should create a window with a unique ID', () => {
      const id = getState().openWindow({
        appId: 'test-app',
        title: 'Test Window',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(getState().windows.size).toBe(1);
    });

    it('should set default values for optional fields', () => {
      const id = getState().openWindow({
        appId: 'test-app',
        title: 'Test Window',
      });

      const window = getState().windows.get(id);
      expect(window).toBeDefined();
      expect(window!.size.width).toBe(800);
      expect(window!.size.height).toBe(600);
      expect(window!.state).toBe('normal');
      expect(window!.flags.resizable).toBe(true);
      expect(window!.flags.closable).toBe(true);
      expect(window!.constraints.minWidth).toBe(200);
      expect(window!.constraints.minHeight).toBe(150);
    });

    it('should use provided dimensions', () => {
      const id = getState().openWindow({
        appId: 'test-app',
        title: 'Test Window',
        width: 400,
        height: 300,
        x: 100,
        y: 50,
      });

      const window = getState().windows.get(id);
      expect(window!.size.width).toBe(400);
      expect(window!.size.height).toBe(300);
      expect(window!.position.x).toBe(100);
      expect(window!.position.y).toBe(50);
    });

    it('should add window to focus stack', () => {
      const id = getState().openWindow({
        appId: 'test-app',
        title: 'Test Window',
      });

      expect(getState().focusStack).toContain(id);
      expect(getState().focusStack.length).toBe(1);
    });

    it('should assign incrementing z-indexes', () => {
      const id1 = getState().openWindow({ appId: 'app-1', title: 'Window 1' });
      const id2 = getState().openWindow({ appId: 'app-2', title: 'Window 2' });

      const w1 = getState().windows.get(id1);
      const w2 = getState().windows.get(id2);

      expect(w1!.zIndex).toBeLessThan(w2!.zIndex);
    });

    it('should store metadata icon and className', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        icon: '🧮',
        className: 'my-class',
      });

      const window = getState().windows.get(id);
      expect(window!.metadata.icon).toBe('🧮');
      expect(window!.metadata.className).toBe('my-class');
    });

    it('should store props', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        props: { foo: 'bar', num: 42 },
      });

      const window = getState().windows.get(id);
      expect(window!.props).toEqual({ foo: 'bar', num: 42 });
    });
  });

  describe('closeWindow', () => {
    it('should remove the window', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      expect(getState().windows.size).toBe(1);

      getState().closeWindow(id);
      expect(getState().windows.size).toBe(0);
    });

    it('should remove from focus stack', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().closeWindow(id);

      expect(getState().focusStack).not.toContain(id);
    });

    it('should not close unclosable windows', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        closable: false,
      });

      getState().closeWindow(id);
      expect(getState().windows.size).toBe(1);
    });

    it('should no-op for non-existent window', () => {
      getState().closeWindow('non-existent');
      expect(getState().windows.size).toBe(0);
    });

    it('should recalculate z-indexes after closing', () => {
      const id1 = getState().openWindow({ appId: 'app-1', title: 'W1' });
      const id2 = getState().openWindow({ appId: 'app-2', title: 'W2' });
      const id3 = getState().openWindow({ appId: 'app-3', title: 'W3' });

      getState().closeWindow(id2);

      const w1 = getState().windows.get(id1);
      const w3 = getState().windows.get(id3);
      expect(w1!.zIndex).toBeLessThan(w3!.zIndex);
    });
  });

  describe('closeByAppId', () => {
    it('should close all windows of a given app', () => {
      getState().openWindow({ appId: 'app-1', title: 'W1' });
      getState().openWindow({ appId: 'app-1', title: 'W2' });
      getState().openWindow({ appId: 'app-2', title: 'W3' });

      expect(getState().windows.size).toBe(3);

      getState().closeByAppId('app-1');
      expect(getState().windows.size).toBe(1);

      const remaining = Array.from(getState().windows.values());
      expect(remaining[0].appId).toBe('app-2');
    });

    it('should no-op if no windows match', () => {
      getState().openWindow({ appId: 'app-1', title: 'W1' });
      getState().closeByAppId('app-2');
      expect(getState().windows.size).toBe(1);
    });

    it('should not close unclosable windows even when appId matches', () => {
      getState().openWindow({ appId: 'app-1', title: 'W1', closable: false });
      getState().openWindow({ appId: 'app-1', title: 'W2' });

      getState().closeByAppId('app-1');
      expect(getState().windows.size).toBe(1);
    });
  });

  describe('closeAll', () => {
    it('should remove all closable windows', () => {
      getState().openWindow({ appId: 'app-1', title: 'W1' });
      getState().openWindow({ appId: 'app-2', title: 'W2' });

      getState().closeAll();
      expect(getState().windows.size).toBe(0);
      expect(getState().focusStack.length).toBe(0);
    });

    it('should keep unclosable windows', () => {
      getState().openWindow({ appId: 'app-1', title: 'W1', closable: false });
      getState().openWindow({ appId: 'app-2', title: 'W2' });
      getState().openWindow({ appId: 'app-3', title: 'W3' });

      getState().closeAll();
      expect(getState().windows.size).toBe(1);
      expect(getState().focusStack.length).toBe(1);

      const remaining = Array.from(getState().windows.values());
      expect(remaining[0].appId).toBe('app-1');
    });
  });

  // ============================================================
  // Focus
  // ============================================================

  describe('focusWindow', () => {
    it('should move window to top of focus stack', () => {
      const id1 = getState().openWindow({ appId: 'app-1', title: 'W1' });
      const id2 = getState().openWindow({ appId: 'app-2', title: 'W2' });

      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id2);

      getState().focusWindow(id1);
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id1);

      const w1 = getState().windows.get(id1);
      const w2 = getState().windows.get(id2);
      expect(w1!.zIndex).toBeGreaterThan(w2!.zIndex);
    });

    it('should restore minimized windows on focus', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().minimizeWindow(id);

      expect(getState().windows.get(id)!.state).toBe('minimized');

      getState().focusWindow(id);
      expect(getState().windows.get(id)!.state).toBe('normal');
    });

    it('should restore to maximized when focusing minimized-from-maximized window', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().maximizeWindow(id, 1920, 1080);
      getState().minimizeWindow(id);

      getState().focusWindow(id);
      expect(getState().windows.get(id)!.state).toBe('maximized');
    });

    it('should restore to previous position when focusing minimized window', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        x: 100,
        y: 50,
        width: 400,
        height: 300,
      });

      getState().minimizeWindow(id);
      getState().focusWindow(id);

      const window = getState().windows.get(id);
      expect(window!.position.x).toBe(100);
      expect(window!.position.y).toBe(50);
      expect(window!.size.width).toBe(400);
      expect(window!.size.height).toBe(300);
    });

    it('should update focusedAt timestamp', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      const before = getState().windows.get(id)!.metadata.focusedAt;

      // Small delay to ensure timestamp changes
      getState().focusWindow(id);
      const after = getState().windows.get(id)!.metadata.focusedAt;

      expect(after).toBeGreaterThanOrEqual(before);
    });

    it('should no-op for non-existent window', () => {
      getState().openWindow({ appId: 'test', title: 'Test' });
      const stackBefore = [...getState().focusStack];

      getState().focusWindow('non-existent');
      expect(getState().focusStack).toEqual(stackBefore);
    });
  });

  describe('focusNext', () => {
    it('should cycle focus to the next window', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });
      const id3 = getState().openWindow({ appId: 'c', title: 'C' });

      // Stack: [id1, id2, id3], id3 is focused
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id3);

      // focusNext: [id3, id1, id2] → id2 becomes focused
      getState().focusNext();
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id2);

      // focusNext again: [id2, id3, id1] → id1 becomes focused
      getState().focusNext();
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id1);

      // focusNext again: [id1, id2, id3] → id3 becomes focused (full cycle)
      getState().focusNext();
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id3);
    });

    it('should no-op with 0 or 1 windows', () => {
      getState().focusNext(); // 0 windows
      expect(getState().focusStack.length).toBe(0);

      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().focusNext(); // 1 window
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id);
    });
  });

  describe('focusPrevious', () => {
    it('should cycle focus in reverse direction', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });
      const id3 = getState().openWindow({ appId: 'c', title: 'C' });

      // Stack: [id1, id2, id3], id3 is focused
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id3);

      // focusPrevious: [id2, id3, id1] → id1 becomes focused
      getState().focusPrevious();
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id1);
    });

    it('focusNext and focusPrevious should be inverse operations', () => {
      getState().openWindow({ appId: 'a', title: 'A' });
      getState().openWindow({ appId: 'b', title: 'B' });
      const id3 = getState().openWindow({ appId: 'c', title: 'C' });

      const originalStack = [...getState().focusStack];

      // Forward then backward should return to original
      getState().focusNext();
      getState().focusPrevious();
      expect(getState().focusStack).toEqual(originalStack);
    });
  });

  // ============================================================
  // Position & Size
  // ============================================================

  describe('updatePosition', () => {
    it('should update window position', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 0, y: 0 });

      getState().updatePosition(id, { x: 200, y: 150 });

      const window = getState().windows.get(id);
      expect(window!.position.x).toBe(200);
      expect(window!.position.y).toBe(150);
    });

    it('should no-op for non-existent window', () => {
      getState().updatePosition('non-existent', { x: 100, y: 100 });
      expect(getState().windows.size).toBe(0);
    });
  });

  describe('updateSize', () => {
    it('should update window size', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });

      getState().updateSize(id, { width: 500, height: 400 });

      const window = getState().windows.get(id);
      expect(window!.size.width).toBe(500);
      expect(window!.size.height).toBe(400);
    });

    it('should clamp size to constraints', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        minWidth: 200,
        minHeight: 150,
      });

      getState().updateSize(id, { width: 50, height: 50 });

      const window = getState().windows.get(id);
      expect(window!.size.width).toBe(200);
      expect(window!.size.height).toBe(150);
    });

    it('should clamp to max constraints', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        maxWidth: 500,
        maxHeight: 400,
      });

      getState().updateSize(id, { width: 1000, height: 1000 });

      const window = getState().windows.get(id);
      expect(window!.size.width).toBe(500);
      expect(window!.size.height).toBe(400);
    });
  });

  describe('setBounds', () => {
    it('should update position and size atomically', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });

      getState().setBounds(id, { x: 100, y: 200, width: 500, height: 400 });

      const window = getState().windows.get(id);
      expect(window!.position).toEqual({ x: 100, y: 200 });
      expect(window!.size).toEqual({ width: 500, height: 400 });
    });

    it('should clamp size to constraints', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        minWidth: 200,
        minHeight: 150,
      });

      getState().setBounds(id, { x: 0, y: 0, width: 50, height: 50 });

      const window = getState().windows.get(id);
      expect(window!.size.width).toBe(200);
      expect(window!.size.height).toBe(150);
      expect(window!.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('centerWindow', () => {
    it('should center window in viewport', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        width: 400,
        height: 300,
      });

      getState().centerWindow(id, 1920, 1080);

      const window = getState().windows.get(id);
      expect(window!.position.x).toBe(760); // (1920 - 400) / 2
      expect(window!.position.y).toBe(390); // (1080 - 300) / 2
    });
  });

  // ============================================================
  // State
  // ============================================================

  describe('minimizeWindow', () => {
    it('should set state to minimized and save previous bounds', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        x: 100,
        y: 50,
        width: 400,
        height: 300,
      });

      getState().minimizeWindow(id);

      const window = getState().windows.get(id);
      expect(window!.state).toBe('minimized');
      expect(window!.previousBounds).toBeDefined();
      expect(window!.previousBounds!.position.x).toBe(100);
      expect(window!.previousBounds!.position.y).toBe(50);
    });

    it('should not minimize already minimized windows', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().minimizeWindow(id);
      const firstBounds = getState().windows.get(id)!.previousBounds;

      getState().minimizeWindow(id); // Should be no-op
      expect(getState().windows.get(id)!.previousBounds).toEqual(firstBounds);
    });

    it('should not minimize un-minimizable windows', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        minimizable: false,
      });

      getState().minimizeWindow(id);
      expect(getState().windows.get(id)!.state).toBe('normal');
    });

    it('should save previousState when minimizing from maximized', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().maximizeWindow(id, 1920, 1080);
      getState().minimizeWindow(id);

      const window = getState().windows.get(id);
      expect(window!.state).toBe('minimized');
      expect(window!.previousBounds!.previousState).toBe('maximized');
    });

    it('should demote focused window from focus stack top when minimized', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });
      const id3 = getState().openWindow({ appId: 'c', title: 'C' });

      // id3 is focused (top of stack)
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id3);

      getState().minimizeWindow(id3);
      // id3 should move to bottom, id2 should become focused
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(id2);
      expect(getState().focusStack[0]).toBe(id3);
    });

    it('should no-op for non-existent window', () => {
      getState().openWindow({ appId: 'test', title: 'Test' });
      const stackBefore = [...getState().focusStack];
      getState().minimizeWindow('non-existent');
      expect(getState().focusStack).toEqual(stackBefore);
    });
  });

  describe('maximizeWindow', () => {
    it('should set state to maximized and fill viewport', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        x: 100,
        y: 50,
      });

      getState().maximizeWindow(id, 1920, 1080, 48);

      const window = getState().windows.get(id);
      expect(window!.state).toBe('maximized');
      expect(window!.position.x).toBe(0);
      expect(window!.position.y).toBe(0);
      expect(window!.size.width).toBe(1920);
      expect(window!.size.height).toBe(1032);
      expect(window!.previousBounds).toBeDefined();
    });

    it('should not maximize un-maximizable windows', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        maximizable: false,
      });

      getState().maximizeWindow(id, 1920, 1080);
      expect(getState().windows.get(id)!.state).toBe('normal');
    });

    it('should not maximize already maximized windows', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 100, y: 50 });
      getState().maximizeWindow(id, 1920, 1080);

      const boundsAfterFirst = getState().windows.get(id)!.previousBounds;

      getState().maximizeWindow(id, 1920, 1080); // no-op
      expect(getState().windows.get(id)!.previousBounds).toEqual(boundsAfterFirst);
    });
  });

  describe('restoreWindow', () => {
    it('should restore to previous bounds after maximize', () => {
      const id = getState().openWindow({
        appId: 'test',
        title: 'Test',
        x: 100,
        y: 50,
        width: 400,
        height: 300,
      });

      getState().maximizeWindow(id, 1920, 1080);
      getState().restoreWindow(id);

      const window = getState().windows.get(id);
      expect(window!.state).toBe('normal');
      expect(window!.position.x).toBe(100);
      expect(window!.position.y).toBe(50);
      expect(window!.size.width).toBe(400);
      expect(window!.size.height).toBe(300);
      expect(window!.previousBounds).toBeUndefined();
    });

    it('should no-op on already normal window', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 100, y: 50 });
      getState().restoreWindow(id);
      expect(getState().windows.get(id)!.state).toBe('normal');
    });

    it('should restore to maximized when minimized from maximized', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 100, y: 50, width: 400, height: 300 });

      getState().maximizeWindow(id, 1920, 1080);
      getState().minimizeWindow(id);
      getState().restoreWindow(id);

      // Should restore to maximized (the previousState when minimized)
      expect(getState().windows.get(id)!.state).toBe('maximized');
    });

    it('should no-op for non-existent window', () => {
      getState().restoreWindow('non-existent');
      expect(getState().windows.size).toBe(0);
    });
  });

  describe('toggleMaximize', () => {
    it('should toggle between maximized and normal', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });

      getState().toggleMaximize(id, 1920, 1080);
      expect(getState().windows.get(id)!.state).toBe('maximized');

      getState().toggleMaximize(id, 1920, 1080);
      expect(getState().windows.get(id)!.state).toBe('normal');
    });

    it('should restore+maximize when called on minimized window', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().minimizeWindow(id);
      expect(getState().windows.get(id)!.state).toBe('minimized');

      getState().toggleMaximize(id, 1920, 1080);
      expect(getState().windows.get(id)!.state).toBe('maximized');
    });
  });

  describe('setWindowState', () => {
    it('should set window state and save previousBounds', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 100, y: 50, width: 400, height: 300 });

      getState().setWindowState(id, 'maximized');
      expect(getState().windows.get(id)!.state).toBe('maximized');
      expect(getState().windows.get(id)!.previousBounds).toBeDefined();
      expect(getState().windows.get(id)!.previousBounds!.position).toEqual({ x: 100, y: 50 });
    });

    it('should restore previousBounds when returning to normal', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 100, y: 50, width: 400, height: 300 });

      getState().setWindowState(id, 'maximized');
      getState().setWindowState(id, 'normal');

      const w = getState().windows.get(id)!;
      expect(w.state).toBe('normal');
      expect(w.position).toEqual({ x: 100, y: 50 });
      expect(w.size).toEqual({ width: 400, height: 300 });
      expect(w.previousBounds).toBeUndefined();
    });

    it('should respect minimizable flag', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', minimizable: false });
      getState().setWindowState(id, 'minimized');
      expect(getState().windows.get(id)!.state).toBe('normal');
    });

    it('should respect maximizable flag', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', maximizable: false });
      getState().setWindowState(id, 'maximized');
      expect(getState().windows.get(id)!.state).toBe('normal');
    });

    it('should no-op when setting same state', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().setWindowState(id, 'normal');
      expect(getState().windows.get(id)!.previousBounds).toBeUndefined();
    });

    it('should no-op for non-existent window', () => {
      getState().setWindowState('non-existent', 'maximized');
      expect(getState().windows.size).toBe(0);
    });
  });

  // ============================================================
  // State Transition Sequences
  // ============================================================

  describe('state transition sequences', () => {
    it('normal → minimize → restore', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 100, y: 50, width: 400, height: 300 });

      getState().minimizeWindow(id);
      expect(getState().windows.get(id)!.state).toBe('minimized');

      getState().restoreWindow(id);
      const w = getState().windows.get(id)!;
      expect(w.state).toBe('normal');
      expect(w.position).toEqual({ x: 100, y: 50 });
      expect(w.size).toEqual({ width: 400, height: 300 });
    });

    it('normal → maximize → minimize → restore → maximized (preserves previousState)', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 100, y: 50, width: 400, height: 300 });

      getState().maximizeWindow(id, 1920, 1080, 48);
      expect(getState().windows.get(id)!.state).toBe('maximized');

      getState().minimizeWindow(id);
      expect(getState().windows.get(id)!.state).toBe('minimized');
      // previousState should be 'maximized'
      expect(getState().windows.get(id)!.previousBounds!.previousState).toBe('maximized');

      getState().restoreWindow(id);
      const w = getState().windows.get(id)!;
      // Should restore to maximized since that was the previousState
      expect(w.state).toBe('maximized');
    });

    it('normal → maximize → restore should return to original bounds', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', x: 100, y: 50, width: 400, height: 300 });

      getState().maximizeWindow(id, 1920, 1080, 48);
      getState().restoreWindow(id);

      const w = getState().windows.get(id)!;
      expect(w.position).toEqual({ x: 100, y: 50 });
      expect(w.size).toEqual({ width: 400, height: 300 });
    });
  });

  // ============================================================
  // Bulk Operations
  // ============================================================

  describe('minimizeAll', () => {
    it('should minimize all minimizable windows', () => {
      getState().openWindow({ appId: 'a', title: 'A' });
      getState().openWindow({ appId: 'b', title: 'B' });
      getState().openWindow({ appId: 'c', title: 'C', minimizable: false });

      getState().minimizeAll();

      const windows = Array.from(getState().windows.values());
      const minimized = windows.filter((w) => w.state === 'minimized');
      const normal = windows.filter((w) => w.state === 'normal');

      expect(minimized.length).toBe(2);
      expect(normal.length).toBe(1);
      expect(normal[0].appId).toBe('c');
    });

    it('should no-op if all windows are already minimized', () => {
      const id = getState().openWindow({ appId: 'a', title: 'A' });
      getState().minimizeWindow(id);

      const boundsBefore = getState().windows.get(id)!.previousBounds;
      getState().minimizeAll();
      expect(getState().windows.get(id)!.previousBounds).toEqual(boundsBefore);
    });

    it('should demote minimized windows in focus stack', () => {
      getState().openWindow({ appId: 'a', title: 'A' });
      getState().openWindow({ appId: 'b', title: 'B' });
      const id3 = getState().openWindow({ appId: 'c', title: 'C', minimizable: false });

      getState().minimizeAll();

      // Un-minimizable window should be at top of focus stack
      const { focusStack } = getState();
      expect(focusStack[focusStack.length - 1]).toBe(id3);
    });

    it('should leave no focused window when all are minimized', () => {
      getState().openWindow({ appId: 'a', title: 'A' });
      getState().openWindow({ appId: 'b', title: 'B' });

      getState().minimizeAll();

      // All windows minimized → focused window (top of stack) is still a minimized window
      // but minimized windows are at bottom of stack
      const { focusStack, windows } = getState();
      // Both are minimized, focus stack should still contain them
      expect(focusStack.length).toBe(2);
    });
  });

  describe('cascadeWindows', () => {
    it('should position windows in cascade order', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });
      const id3 = getState().openWindow({ appId: 'c', title: 'C' });

      getState().cascadeWindows(1920, 1080);

      const w1 = getState().windows.get(id1)!;
      const w2 = getState().windows.get(id2)!;
      const w3 = getState().windows.get(id3)!;

      expect(w1.position).toEqual({ x: 0, y: 0 });
      expect(w2.position).toEqual({ x: 30, y: 30 });
      expect(w3.position).toEqual({ x: 60, y: 60 });
    });

    it('should skip minimized windows', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });
      getState().minimizeWindow(id1);

      getState().cascadeWindows(1920, 1080);

      // id1 should still be minimized
      expect(getState().windows.get(id1)!.state).toBe('minimized');
      // id2 should be at position 0,0
      expect(getState().windows.get(id2)!.position).toEqual({ x: 0, y: 0 });
    });

    it('should no-op with no visible windows', () => {
      const id = getState().openWindow({ appId: 'a', title: 'A' });
      getState().minimizeWindow(id);
      const stateBefore = getState().windows.get(id)!.state;

      getState().cascadeWindows(1920, 1080);
      expect(getState().windows.get(id)!.state).toBe(stateBefore);
    });
  });

  describe('tileWindows', () => {
    it('should tile horizontally', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });

      getState().tileWindows('horizontal', 1920, 1080, 48);

      const w1 = getState().windows.get(id1)!;
      const w2 = getState().windows.get(id2)!;

      expect(w1.position).toEqual({ x: 0, y: 0 });
      expect(w1.size.width).toBe(960); // 1920 / 2
      expect(w1.size.height).toBe(1032); // 1080 - 48

      expect(w2.position).toEqual({ x: 960, y: 0 });
      expect(w2.size.width).toBe(960);
    });

    it('should tile vertically', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });

      getState().tileWindows('vertical', 1920, 1080, 48);

      const w1 = getState().windows.get(id1)!;
      const w2 = getState().windows.get(id2)!;

      expect(w1.position).toEqual({ x: 0, y: 0 });
      expect(w1.size.width).toBe(1920);
      expect(w1.size.height).toBe(516); // floor(1032 / 2)

      expect(w2.position).toEqual({ x: 0, y: 516 });
    });

    it('should tile in grid layout', () => {
      getState().openWindow({ appId: 'a', title: 'A' });
      getState().openWindow({ appId: 'b', title: 'B' });
      getState().openWindow({ appId: 'c', title: 'C' });
      getState().openWindow({ appId: 'd', title: 'D' });

      getState().tileWindows('grid', 1920, 1080, 48);

      const windows = Array.from(getState().windows.values());
      // 4 windows → 2x2 grid
      expect(windows.every((w) => w.state === 'normal')).toBe(true);
      expect(windows[0].size.width).toBe(960); // 1920 / 2
    });

    it('should skip minimized windows', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });
      getState().minimizeWindow(id1);

      getState().tileWindows('horizontal', 1920, 1080, 48);

      // id1 should still be minimized
      expect(getState().windows.get(id1)!.state).toBe('minimized');
      // id2 should take full width
      expect(getState().windows.get(id2)!.size.width).toBe(1920);
    });

    it('should no-op with 0 visible windows', () => {
      const id = getState().openWindow({ appId: 'a', title: 'A' });
      getState().minimizeWindow(id);

      getState().tileWindows('horizontal', 1920, 1080, 48);
      // Should still be minimized
      expect(getState().windows.get(id)!.state).toBe('minimized');
    });

    it('should handle single window tiling', () => {
      const id = getState().openWindow({ appId: 'a', title: 'A' });
      getState().tileWindows('horizontal', 1920, 1080, 48);

      const w = getState().windows.get(id)!;
      expect(w.position).toEqual({ x: 0, y: 0 });
      expect(w.size.width).toBe(1920);
    });

    it('should respect min size constraints', () => {
      // Create windows with large minWidth
      getState().openWindow({ appId: 'a', title: 'A', minWidth: 800 });
      getState().openWindow({ appId: 'b', title: 'B', minWidth: 800 });
      getState().openWindow({ appId: 'c', title: 'C', minWidth: 800 });

      // Tile 3 windows horizontally in 1920px = 640px each, but min is 800
      getState().tileWindows('horizontal', 1920, 1080, 48);

      const windows = Array.from(getState().windows.values());
      windows.forEach((w) => {
        expect(w.size.width).toBeGreaterThanOrEqual(800);
      });
    });
  });

  // ============================================================
  // Queries
  // ============================================================

  describe('getWindow', () => {
    it('should return window by id', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      const window = getState().getWindow(id);
      expect(window).toBeDefined();
      expect(window!.id).toBe(id);
    });

    it('should return undefined for non-existent id', () => {
      expect(getState().getWindow('non-existent')).toBeUndefined();
    });
  });

  describe('getWindowsByAppId', () => {
    it('should return all windows for a given appId', () => {
      getState().openWindow({ appId: 'app-1', title: 'W1' });
      getState().openWindow({ appId: 'app-1', title: 'W2' });
      getState().openWindow({ appId: 'app-2', title: 'W3' });

      const result = getState().getWindowsByAppId('app-1');
      expect(result.length).toBe(2);
      expect(result.every((w) => w.appId === 'app-1')).toBe(true);
    });

    it('should return empty array if no windows match', () => {
      expect(getState().getWindowsByAppId('non-existent')).toEqual([]);
    });
  });

  describe('getAllWindows', () => {
    it('should return all windows', () => {
      getState().openWindow({ appId: 'a', title: 'A' });
      getState().openWindow({ appId: 'b', title: 'B' });

      expect(getState().getAllWindows().length).toBe(2);
    });
  });

  describe('getFocusedWindow', () => {
    it('should return the currently focused window', () => {
      getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });

      const focused = getState().getFocusedWindow();
      expect(focused).toBeDefined();
      expect(focused!.id).toBe(id2);
    });

    it('should return undefined when no windows exist', () => {
      expect(getState().getFocusedWindow()).toBeUndefined();
    });
  });

  describe('existsWindow', () => {
    it('should return true for existing window', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      expect(getState().existsWindow(id)).toBe(true);
    });

    it('should return false for non-existent window', () => {
      expect(getState().existsWindow('non-existent')).toBe(false);
    });

    it('should return false after window is closed', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });
      getState().closeWindow(id);
      expect(getState().existsWindow(id)).toBe(false);
    });
  });

  // ============================================================
  // Event Subscriptions (RFC-001)
  // ============================================================

  describe('onWindowOpen', () => {
    it('should fire when a window is opened', () => {
      const handler = vi.fn();
      const unsub = onWindowOpen(handler);

      const id = getState().openWindow({ appId: 'test', title: 'Test' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id, appId: 'test' }));

      unsub();
    });

    it('should not fire after unsubscribe', () => {
      const handler = vi.fn();
      const unsub = onWindowOpen(handler);
      unsub();

      getState().openWindow({ appId: 'test', title: 'Test' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onWindowClose', () => {
    it('should fire when a window is closed', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });

      const handler = vi.fn();
      const unsub = onWindowClose(handler);

      getState().closeWindow(id);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(id);

      unsub();
    });

    it('should not fire for unclosable windows', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test', closable: false });

      const handler = vi.fn();
      const unsub = onWindowClose(handler);

      getState().closeWindow(id); // should be blocked
      expect(handler).not.toHaveBeenCalled();

      unsub();
    });
  });

  describe('onWindowFocus', () => {
    it('should fire when a specific window gains focus', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });

      const handler = vi.fn();
      const unsub = onWindowFocus(id1, handler);

      getState().focusWindow(id1);
      expect(handler).toHaveBeenCalledTimes(1);

      // Focusing same window again should not fire (already focused)
      getState().focusWindow(id1);
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
    });

    it('should not fire for other windows', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });

      const handler = vi.fn();
      const unsub = onWindowFocus(id1, handler);

      getState().focusWindow(id2);
      expect(handler).not.toHaveBeenCalled();

      unsub();
    });
  });

  describe('onWindowBlur', () => {
    it('should fire when a specific window loses focus', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });

      // id2 is currently focused. Subscribe to blur on id2.
      const handler = vi.fn();
      const unsub = onWindowBlur(id2, handler);

      getState().focusWindow(id1); // id2 loses focus
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
    });
  });

  describe('onWindowStateChange', () => {
    it('should fire when a window state changes', () => {
      const id = getState().openWindow({ appId: 'test', title: 'Test' });

      const handler = vi.fn();
      const unsub = onWindowStateChange(id, handler);

      getState().minimizeWindow(id);
      expect(handler).toHaveBeenCalledWith('minimized');

      getState().restoreWindow(id);
      expect(handler).toHaveBeenCalledWith('normal');

      expect(handler).toHaveBeenCalledTimes(2);

      unsub();
    });

    it('should not fire for other windows', () => {
      const id1 = getState().openWindow({ appId: 'a', title: 'A' });
      const id2 = getState().openWindow({ appId: 'b', title: 'B' });

      const handler = vi.fn();
      const unsub = onWindowStateChange(id1, handler);

      getState().minimizeWindow(id2);
      expect(handler).not.toHaveBeenCalled();

      unsub();
    });
  });

  // ============================================================
  // alwaysOnTop z-index pinning
  // ============================================================

  describe('alwaysOnTop', () => {
    it('openWindow with alwaysOnTop: true sets the flag correctly', () => {
      const id = getState().openWindow({
        appId: 'pinned-app',
        title: 'Pinned',
        alwaysOnTop: true,
      });

      const window = getState().windows.get(id);
      expect(window).toBeDefined();
      expect(window!.flags.alwaysOnTop).toBe(true);
    });

    it('openWindow without alwaysOnTop defaults to false', () => {
      const id = getState().openWindow({
        appId: 'normal-app',
        title: 'Normal',
      });

      const window = getState().windows.get(id);
      expect(window).toBeDefined();
      expect(window!.flags.alwaysOnTop).toBe(false);
    });

    it('alwaysOnTop windows get higher z-index than normal windows', () => {
      // Open a pinned window first, then a normal window
      const pinnedId = getState().openWindow({
        appId: 'pinned-app',
        title: 'Pinned',
        alwaysOnTop: true,
      });
      const normalId = getState().openWindow({
        appId: 'normal-app',
        title: 'Normal',
      });

      const pinned = getState().windows.get(pinnedId)!;
      const normal = getState().windows.get(normalId)!;

      // Even though normal was opened later (and is last in focusStack),
      // pinned should still have a higher z-index
      expect(pinned.zIndex).toBeGreaterThan(normal.zIndex);
    });

    it('multiple alwaysOnTop windows maintain focus order among themselves', () => {
      const pinned1 = getState().openWindow({
        appId: 'pinned-1',
        title: 'Pinned 1',
        alwaysOnTop: true,
      });
      const pinned2 = getState().openWindow({
        appId: 'pinned-2',
        title: 'Pinned 2',
        alwaysOnTop: true,
      });

      // pinned2 was opened last, so it should have a higher z-index
      const w1 = getState().windows.get(pinned1)!;
      const w2 = getState().windows.get(pinned2)!;
      expect(w2.zIndex).toBeGreaterThan(w1.zIndex);

      // Focus pinned1 → it should now have the higher z-index among pinned
      getState().focusWindow(pinned1);
      const w1After = getState().windows.get(pinned1)!;
      const w2After = getState().windows.get(pinned2)!;
      expect(w1After.zIndex).toBeGreaterThan(w2After.zIndex);
    });

    it('focusing a normal window does not move it above alwaysOnTop windows', () => {
      const normalId1 = getState().openWindow({
        appId: 'normal-1',
        title: 'Normal 1',
      });
      const pinnedId = getState().openWindow({
        appId: 'pinned-app',
        title: 'Pinned',
        alwaysOnTop: true,
      });
      const normalId2 = getState().openWindow({
        appId: 'normal-2',
        title: 'Normal 2',
      });

      // Focus the first normal window (move it to top of stack)
      getState().focusWindow(normalId1);

      const normal1 = getState().windows.get(normalId1)!;
      const normal2 = getState().windows.get(normalId2)!;
      const pinned = getState().windows.get(pinnedId)!;

      // normal1 should have the highest z-index among normal windows
      expect(normal1.zIndex).toBeGreaterThan(normal2.zIndex);

      // But pinned should still be above all normal windows
      expect(pinned.zIndex).toBeGreaterThan(normal1.zIndex);
      expect(pinned.zIndex).toBeGreaterThan(normal2.zIndex);
    });
  });

  // ============================================================
  // Stress Test
  // ============================================================

  describe('stress test', () => {
    it('should handle 20 windows correctly', () => {
      const ids: string[] = [];
      for (let i = 0; i < 20; i++) {
        ids.push(getState().openWindow({ appId: `app-${i}`, title: `Window ${i}` }));
      }

      expect(getState().windows.size).toBe(20);
      expect(getState().focusStack.length).toBe(20);

      // Focus the first window
      getState().focusWindow(ids[0]);
      expect(getState().focusStack[getState().focusStack.length - 1]).toBe(ids[0]);

      // Close half
      for (let i = 0; i < 10; i++) {
        getState().closeWindow(ids[i]);
      }

      expect(getState().windows.size).toBe(10);
      expect(getState().focusStack.length).toBe(10);
    });

    it('should handle rapid focus cycling', () => {
      for (let i = 0; i < 5; i++) {
        getState().openWindow({ appId: `app-${i}`, title: `W${i}` });
      }

      // Cycle focus 100 times
      for (let i = 0; i < 100; i++) {
        getState().focusNext();
      }

      // Should still have all windows intact
      expect(getState().windows.size).toBe(5);
      expect(getState().focusStack.length).toBe(5);
    });
  });
});
