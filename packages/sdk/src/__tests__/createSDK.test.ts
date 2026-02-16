import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorkspaceSDK } from '../createSDK';
import { useWindowsStore } from '@archbase/workspace-state';
import { useCommandRegistryStore } from '@archbase/workspace-state';
import { useNotificationsStore } from '@archbase/workspace-state';
import { useSettingsStore } from '@archbase/workspace-state';
import { useShortcutsStore } from '@archbase/workspace-state';
import { useContextMenuStore } from '@archbase/workspace-state';

function resetStores() {
  useWindowsStore.setState({ windows: new Map(), focusStack: [] });
  useCommandRegistryStore.setState({ commands: new Map() });
  useNotificationsStore.setState({ notifications: new Map() });
  useSettingsStore.setState({ values: new Map() });
  useShortcutsStore.setState({ shortcuts: new Map() });
  useContextMenuStore.setState({ visible: false, position: { x: 0, y: 0 }, items: [] });
}

describe('createWorkspaceSDK', () => {
  beforeEach(resetStores);

  it('creates an SDK instance with correct appId and windowId', () => {
    const sdk = createWorkspaceSDK('test-app', 'win-1');
    expect(sdk.appId).toBe('test-app');
    expect(sdk.windowId).toBe('win-1');
  });

  describe('windows service', () => {
    it('opens a new window', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const id = sdk.windows.open({ title: 'New Window' });
      expect(id).toBeTruthy();
      const win = useWindowsStore.getState().getWindow(id);
      expect(win?.title).toBe('New Window');
      expect(win?.appId).toBe('test-app');
    });

    it('closes the current window', () => {
      const windowId = useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'Test' });
      const sdk = createWorkspaceSDK('test-app', windowId);
      sdk.windows.close();
      expect(useWindowsStore.getState().existsWindow(windowId)).toBe(false);
    });

    it('getAll returns only windows from this app', () => {
      useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'A' });
      useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'B' });
      useWindowsStore.getState().openWindow({ appId: 'other-app', title: 'C' });
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const windows = sdk.windows.getAll();
      expect(windows).toHaveLength(2);
    });

    it('setTitle updates the window title', () => {
      const windowId = useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'Old' });
      const sdk = createWorkspaceSDK('test-app', windowId);
      sdk.windows.setTitle('New Title');
      expect(useWindowsStore.getState().getWindow(windowId)?.title).toBe('New Title');
    });

    it('setTitle is a no-op for non-existent window', () => {
      const sdk = createWorkspaceSDK('test-app', 'non-existent-win');
      // Should not throw
      sdk.windows.setTitle('Title');
      expect(useWindowsStore.getState().windows.size).toBe(0);
    });
  });

  describe('commands service', () => {
    it('registers a command handler', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const handler = vi.fn();
      sdk.commands.register('test.action', handler);
      const cmd = useCommandRegistryStore.getState().getCommand('test.action');
      expect(cmd).toBeDefined();
      expect(cmd?.source).toBe('test-app');
    });

    it('unregister callback clears the handler', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const handler = vi.fn();
      const unregister = sdk.commands.register('test.action', handler);
      unregister();
      // Command still exists but handler is cleared
      const cmd = useCommandRegistryStore.getState().getCommand('test.action');
      expect(cmd).toBeDefined();
      expect(cmd?.handler).toBeUndefined();
    });

    it('unregistered command handler does not execute', async () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const handler = vi.fn();
      const unregister = sdk.commands.register('test.action', handler);
      unregister();
      await sdk.commands.execute('test.action');
      expect(handler).not.toHaveBeenCalled();
    });

    it('executes a command', async () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const handler = vi.fn();
      sdk.commands.register('test.action', handler);
      await sdk.commands.execute('test.action', 'arg1');
      expect(handler).toHaveBeenCalledWith('arg1');
    });
  });

  describe('notifications service', () => {
    it('creates info notification', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const id = sdk.notifications.info('Hello', 'World');
      expect(id).toBeTruthy();
      const notifications = useNotificationsStore.getState().notifications;
      expect(notifications.size).toBe(1);
      const n = notifications.get(id);
      expect(n?.type).toBe('info');
      expect(n?.title).toBe('Hello');
    });

    it('creates success notification', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const id = sdk.notifications.success('Done');
      const n = useNotificationsStore.getState().notifications.get(id);
      expect(n?.type).toBe('success');
    });

    it('creates warning notification', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const id = sdk.notifications.warning('Caution');
      const n = useNotificationsStore.getState().notifications.get(id);
      expect(n?.type).toBe('warning');
    });

    it('creates error notification', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const id = sdk.notifications.error('Failed');
      const n = useNotificationsStore.getState().notifications.get(id);
      expect(n?.type).toBe('error');
    });

    it('dismisses a notification', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const id = sdk.notifications.info('Test');
      sdk.notifications.dismiss(id);
      expect(useNotificationsStore.getState().notifications.size).toBe(0);
    });
  });

  describe('settings service', () => {
    it('gets a setting value', () => {
      useSettingsStore.getState().registerSettings('test-app', [
        { key: 'test.theme', type: 'string', default: 'dark', description: 'Theme' },
      ]);
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      expect(sdk.settings.get('test.theme')).toBe('dark');
    });

    it('returns undefined for non-existent key', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      expect(sdk.settings.get('nonexistent.key')).toBeUndefined();
    });

    it('sets a setting value', () => {
      useSettingsStore.getState().registerSettings('test-app', [
        { key: 'test.theme', type: 'string', default: 'dark', description: 'Theme' },
      ]);
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      sdk.settings.set('test.theme', 'light');
      expect(sdk.settings.get('test.theme')).toBe('light');
    });

    it('onChange fires when setting changes', () => {
      useSettingsStore.getState().registerSettings('test-app', [
        { key: 'test.font', type: 'number', default: 14, description: 'Font size' },
      ]);
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const handler = vi.fn();
      const unsubscribe = sdk.settings.onChange('test.font', handler);

      sdk.settings.set('test.font', 18);
      expect(handler).toHaveBeenCalledWith(18);

      unsubscribe();
    });

    it('onChange unsubscribe stops notifications', () => {
      useSettingsStore.getState().registerSettings('test-app', [
        { key: 'test.color', type: 'string', default: 'red', description: 'Color' },
      ]);
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const handler = vi.fn();
      const unsubscribe = sdk.settings.onChange('test.color', handler);

      unsubscribe();
      sdk.settings.set('test.color', 'blue');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('storage service', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('stores and retrieves values scoped by appId', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      sdk.storage.set('notes', [{ id: 1, text: 'hello' }]);
      const retrieved = sdk.storage.get<Array<{ id: number; text: string }>>('notes');
      expect(retrieved).toEqual([{ id: 1, text: 'hello' }]);
    });

    it('returns null for missing keys', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      expect(sdk.storage.get('nonexistent')).toBeNull();
    });

    it('scopes storage by appId', () => {
      const sdk1 = createWorkspaceSDK('app-1', 'win-1');
      const sdk2 = createWorkspaceSDK('app-2', 'win-1');
      sdk1.storage.set('key', 'value1');
      sdk2.storage.set('key', 'value2');
      expect(sdk1.storage.get('key')).toBe('value1');
      expect(sdk2.storage.get('key')).toBe('value2');
    });

    it('removes a key', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      sdk.storage.set('key', 'value');
      sdk.storage.remove('key');
      expect(sdk.storage.get('key')).toBeNull();
    });

    it('clears only this app\'s keys', () => {
      const sdk1 = createWorkspaceSDK('app-1', 'win-1');
      const sdk2 = createWorkspaceSDK('app-2', 'win-1');
      sdk1.storage.set('a', 1);
      sdk1.storage.set('b', 2);
      sdk2.storage.set('c', 3);
      sdk1.storage.clear();
      expect(sdk1.storage.get('a')).toBeNull();
      expect(sdk2.storage.get('c')).toBe(3);
    });

    it('lists keys for this app', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      sdk.storage.set('x', 1);
      sdk.storage.set('y', 2);
      expect(sdk.storage.keys().sort()).toEqual(['x', 'y']);
    });
  });

  describe('windows lifecycle (minimize/maximize/restore)', () => {
    it('minimizes the current window', () => {
      const windowId = useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'Test' });
      const sdk = createWorkspaceSDK('test-app', windowId);
      sdk.windows.minimize();
      expect(useWindowsStore.getState().getWindow(windowId)?.state).toBe('minimized');
    });

    it('maximizes the current window', () => {
      const windowId = useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'Test' });
      const sdk = createWorkspaceSDK('test-app', windowId);
      sdk.windows.maximize();
      expect(useWindowsStore.getState().getWindow(windowId)?.state).toBe('maximized');
    });

    it('restores a minimized window', () => {
      const windowId = useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'Test' });
      const sdk = createWorkspaceSDK('test-app', windowId);
      sdk.windows.minimize();
      sdk.windows.restore();
      expect(useWindowsStore.getState().getWindow(windowId)?.state).toBe('normal');
    });
  });

  describe('contextMenu service', () => {
    it('opens a context menu', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      sdk.contextMenu.show({ x: 100, y: 200 }, [
        { id: 'copy', label: 'Copy', action: () => {} },
      ]);
      const state = useContextMenuStore.getState();
      expect(state.visible).toBe(true);
      expect(state.position).toEqual({ x: 100, y: 200 });
      expect(state.items).toHaveLength(1);
    });
  });

  describe('permissions service (base SDK fail-closed stubs)', () => {
    it('check always returns denied', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      expect(sdk.permissions.check('notifications')).toBe('denied');
    });

    it('request always resolves to false', async () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      const result = await sdk.permissions.request('storage');
      expect(result).toBe(false);
    });

    it('list always returns empty array', () => {
      const sdk = createWorkspaceSDK('test-app', 'win-1');
      expect(sdk.permissions.list()).toEqual([]);
    });
  });
});
