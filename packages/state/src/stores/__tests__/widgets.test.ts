import { describe, it, expect, beforeEach } from 'vitest';
import { useWidgetRegistryStore } from '../widgets';
import type { RegisteredWidget } from '@archbase/workspace-types';

function getState() {
  return useWidgetRegistryStore.getState();
}

function makeWidget(overrides: Partial<RegisteredWidget> = {}): RegisteredWidget {
  return {
    id: 'test.widget',
    title: 'Test Widget',
    component: 'TestWidget',
    defaultLocation: 'statusBar',
    source: 'test-app',
    visible: true,
    order: 0,
    ...overrides,
  };
}

describe('WidgetRegistry Store', () => {
  beforeEach(() => {
    useWidgetRegistryStore.setState({ widgets: new Map() });
  });

  describe('register', () => {
    it('registers a widget', () => {
      getState().register(makeWidget());
      expect(getState().widgets.size).toBe(1);
      expect(getState().getWidget('test.widget')?.title).toBe('Test Widget');
    });

    it('overwrites existing widget with same id', () => {
      getState().register(makeWidget());
      getState().register(makeWidget({ title: 'Updated' }));
      expect(getState().widgets.size).toBe(1);
      expect(getState().getWidget('test.widget')?.title).toBe('Updated');
    });
  });

  describe('registerBatch', () => {
    it('registers multiple widgets', () => {
      getState().registerBatch([
        makeWidget({ id: 'a' }),
        makeWidget({ id: 'b' }),
        makeWidget({ id: 'c' }),
      ]);
      expect(getState().widgets.size).toBe(3);
    });
  });

  describe('unregister', () => {
    it('removes a registered widget', () => {
      getState().register(makeWidget());
      getState().unregister('test.widget');
      expect(getState().widgets.size).toBe(0);
    });

    it('is no-op for non-existent id', () => {
      getState().register(makeWidget());
      getState().unregister('nonexistent');
      expect(getState().widgets.size).toBe(1);
    });
  });

  describe('unregisterBySource', () => {
    it('removes all widgets from a source app', () => {
      getState().registerBatch([
        makeWidget({ id: 'a', source: 'app-1' }),
        makeWidget({ id: 'b', source: 'app-1' }),
        makeWidget({ id: 'c', source: 'app-2' }),
      ]);
      getState().unregisterBySource('app-1');
      expect(getState().widgets.size).toBe(1);
      expect(getState().getWidget('c')).toBeDefined();
    });

    it('is no-op when no widgets from source', () => {
      getState().register(makeWidget({ source: 'app-1' }));
      getState().unregisterBySource('app-2');
      expect(getState().widgets.size).toBe(1);
    });
  });

  describe('setVisible', () => {
    it('hides a widget', () => {
      getState().register(makeWidget({ visible: true }));
      getState().setVisible('test.widget', false);
      expect(getState().getWidget('test.widget')?.visible).toBe(false);
    });

    it('shows a hidden widget', () => {
      getState().register(makeWidget({ visible: false }));
      getState().setVisible('test.widget', true);
      expect(getState().getWidget('test.widget')?.visible).toBe(true);
    });

    it('is no-op when already in desired state', () => {
      getState().register(makeWidget({ visible: true }));
      const before = getState().widgets;
      getState().setVisible('test.widget', true);
      expect(getState().widgets).toBe(before);
    });
  });

  describe('getByLocation', () => {
    beforeEach(() => {
      getState().registerBatch([
        makeWidget({ id: 'status-1', defaultLocation: 'statusBar', order: 1 }),
        makeWidget({ id: 'status-2', defaultLocation: 'statusBar', order: 0 }),
        makeWidget({ id: 'sidebar-1', defaultLocation: 'sidebar', order: 0 }),
        makeWidget({ id: 'hidden', defaultLocation: 'statusBar', visible: false, order: 2 }),
      ]);
    });

    it('returns widgets for a specific location', () => {
      expect(getState().getByLocation('statusBar')).toHaveLength(2);
      expect(getState().getByLocation('sidebar')).toHaveLength(1);
      expect(getState().getByLocation('panel')).toHaveLength(0);
    });

    it('excludes hidden widgets', () => {
      const statusBar = getState().getByLocation('statusBar');
      expect(statusBar.find((w) => w.id === 'hidden')).toBeUndefined();
    });

    it('sorts by order', () => {
      const statusBar = getState().getByLocation('statusBar');
      expect(statusBar[0].id).toBe('status-2');
      expect(statusBar[1].id).toBe('status-1');
    });
  });

  describe('getAllWidgets', () => {
    it('returns all widgets including hidden', () => {
      getState().registerBatch([
        makeWidget({ id: 'a', visible: true }),
        makeWidget({ id: 'b', visible: false }),
      ]);
      expect(getState().getAllWidgets()).toHaveLength(2);
    });
  });
});
