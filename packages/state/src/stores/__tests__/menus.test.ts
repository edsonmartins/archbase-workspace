import { describe, it, expect, beforeEach } from 'vitest';
import { useMenuRegistryStore } from '../menus';

function getState() {
  return useMenuRegistryStore.getState();
}

describe('MenuRegistry Store', () => {
  beforeEach(() => {
    useMenuRegistryStore.setState({
      applicationMenus: new Map(),
      contextMenus: new Map(),
      windowMenus: new Map(),
    });
  });

  describe('registerMenuItems', () => {
    it('registers application menu items', () => {
      getState().registerMenuItems('editor', {
        application: [
          { command: 'editor.open', group: 'file' },
          { command: 'editor.save', group: 'file' },
        ],
      });
      expect(getState().getApplicationMenuItems()).toHaveLength(2);
      expect(getState().getContextMenuItems()).toHaveLength(0);
    });

    it('registers context menu items', () => {
      getState().registerMenuItems('editor', {
        context: [{ command: 'editor.copy' }, { command: 'editor.paste' }],
      });
      expect(getState().getContextMenuItems()).toHaveLength(2);
    });

    it('registers window menu items', () => {
      getState().registerMenuItems('editor', {
        window: [{ command: 'editor.close' }],
      });
      expect(getState().getWindowMenuItems()).toHaveLength(1);
    });

    it('registers items in multiple locations', () => {
      getState().registerMenuItems('editor', {
        application: [{ command: 'editor.open' }],
        context: [{ command: 'editor.copy' }],
        window: [{ command: 'editor.close' }],
      });
      expect(getState().getApplicationMenuItems()).toHaveLength(1);
      expect(getState().getContextMenuItems()).toHaveLength(1);
      expect(getState().getWindowMenuItems()).toHaveLength(1);
    });

    it('registers items from multiple apps', () => {
      getState().registerMenuItems('editor', {
        context: [{ command: 'editor.copy' }],
      });
      getState().registerMenuItems('notes', {
        context: [{ command: 'notes.delete' }],
      });
      expect(getState().getContextMenuItems()).toHaveLength(2);
    });

    it('sets source on registered items', () => {
      getState().registerMenuItems('editor', {
        application: [{ command: 'editor.open' }],
      });
      const items = getState().getApplicationMenuItems();
      expect(items[0].source).toBe('editor');
    });
  });

  describe('unregisterBySource', () => {
    it('removes all menu items from a source app', () => {
      getState().registerMenuItems('editor', {
        application: [{ command: 'editor.open' }],
        context: [{ command: 'editor.copy' }],
      });
      getState().registerMenuItems('notes', {
        context: [{ command: 'notes.delete' }],
      });
      getState().unregisterBySource('editor');
      expect(getState().getApplicationMenuItems()).toHaveLength(0);
      expect(getState().getContextMenuItems()).toHaveLength(1);
      expect(getState().getContextMenuItems()[0].command).toBe('notes.delete');
    });

    it('is safe when no items from source', () => {
      getState().registerMenuItems('editor', {
        context: [{ command: 'editor.copy' }],
      });
      getState().unregisterBySource('unknown');
      expect(getState().getContextMenuItems()).toHaveLength(1);
    });
  });

  describe('ignores empty arrays', () => {
    it('does not error with empty menus', () => {
      getState().registerMenuItems('editor', {
        application: [],
        context: [],
        window: [],
      });
      expect(getState().getApplicationMenuItems()).toHaveLength(0);
    });
  });
});
