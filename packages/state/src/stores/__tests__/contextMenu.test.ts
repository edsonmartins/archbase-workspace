import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useContextMenuStore } from '../contextMenu';
import type { ContextMenuItem } from '@archbase/workspace-types';

function getState() {
  return useContextMenuStore.getState();
}

const ITEMS: ContextMenuItem[] = [
  { id: 'cut', label: 'Cut', shortcut: 'Cmd+X' },
  { id: 'copy', label: 'Copy', shortcut: 'Cmd+C' },
  { id: 'sep', label: '', separator: true },
  { id: 'paste', label: 'Paste', shortcut: 'Cmd+V' },
];

describe('ContextMenu Store', () => {
  beforeEach(() => {
    getState().close();
  });

  describe('open', () => {
    it('sets visible, position, and items', () => {
      getState().open({ x: 100, y: 200 }, ITEMS);
      expect(getState().visible).toBe(true);
      expect(getState().position).toEqual({ x: 100, y: 200 });
      expect(getState().items).toHaveLength(4);
    });

    it('overwrites previous state', () => {
      getState().open({ x: 10, y: 20 }, [{ id: 'a', label: 'A' }]);
      getState().open({ x: 300, y: 400 }, ITEMS);
      expect(getState().position).toEqual({ x: 300, y: 400 });
      expect(getState().items).toHaveLength(4);
    });
  });

  describe('close', () => {
    it('resets all state', () => {
      getState().open({ x: 100, y: 200 }, ITEMS);
      getState().close();
      expect(getState().visible).toBe(false);
      expect(getState().position).toEqual({ x: 0, y: 0 });
      expect(getState().items).toEqual([]);
    });

    it('is safe to call when already closed', () => {
      getState().close();
      expect(getState().visible).toBe(false);
    });
  });

  describe('initial state', () => {
    it('starts with visible false and empty items', () => {
      expect(getState().visible).toBe(false);
      expect(getState().items).toEqual([]);
    });
  });

  describe('subscribeWithSelector', () => {
    it('supports subscribing to specific state slices', () => {
      const callback = vi.fn();
      const unsub = useContextMenuStore.subscribe(
        (s) => s.visible,
        callback,
      );

      getState().open({ x: 10, y: 20 }, ITEMS);
      expect(callback).toHaveBeenCalledWith(true, false);

      unsub();
    });
  });
});
