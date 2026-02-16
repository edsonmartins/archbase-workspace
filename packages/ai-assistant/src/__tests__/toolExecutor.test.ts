import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWindowsStore } from '@archbase/workspace-state';
import { useAppRegistryStore } from '@archbase/workspace-state';
import { useCommandRegistryStore } from '@archbase/workspace-state';
import { useNotificationsStore } from '@archbase/workspace-state';
import { useSettingsStore } from '@archbase/workspace-state';
import { executeTool, executeToolCalls, resolveWindowId, resolveAppId } from '../tools/toolExecutor';

function resetStores() {
  const ws = useWindowsStore.getState();
  for (const w of ws.getAllWindows()) {
    ws.closeWindow(w.id);
  }
  const rs = useAppRegistryStore.getState();
  for (const app of rs.apps.values()) {
    rs.unregister(app.id);
  }
}

function registerTestApp() {
  useAppRegistryStore.getState().registerManifest({
    id: 'test.calculator',
    name: 'calculator',
    version: '1.0.0',
    entrypoint: './App.tsx',
    remoteEntry: 'http://localhost:3002/mf-manifest.json',
    displayName: 'Calculator',
    icon: '🧮',
    source: 'local',
    window: { defaultWidth: 320, defaultHeight: 480 },
  });
}

describe('toolExecutor', () => {
  beforeEach(() => {
    resetStores();
  });

  describe('resolveWindowId', () => {
    it('resolves by exact ID', () => {
      const id = useWindowsStore.getState().openWindow({ appId: 'app', title: 'Test' });
      expect(resolveWindowId(id)).toBe(id);
    });

    it('resolves by partial title (case-insensitive)', () => {
      const id = useWindowsStore.getState().openWindow({ appId: 'app', title: 'My Calculator' });
      expect(resolveWindowId('calculator')).toBe(id);
    });

    it('returns null for non-existent window', () => {
      expect(resolveWindowId('nonexistent')).toBeNull();
    });
  });

  describe('resolveAppId', () => {
    it('resolves by exact ID', () => {
      registerTestApp();
      expect(resolveAppId('test.calculator')).toBe('test.calculator');
    });

    it('resolves by MF name', () => {
      registerTestApp();
      expect(resolveAppId('calculator')).toBe('test.calculator');
    });

    it('resolves by displayName (case-insensitive)', () => {
      registerTestApp();
      expect(resolveAppId('calc')).toBe('test.calculator');
    });

    it('returns null for non-existent app', () => {
      expect(resolveAppId('nonexistent')).toBeNull();
    });
  });

  describe('open_app', () => {
    it('opens an app by name', async () => {
      registerTestApp();
      const result = await executeTool('open_app', { name: 'Calculator' });
      expect(result.success).toBe(true);
      expect(result.result).toContain('Opened "Calculator"');
      expect(useWindowsStore.getState().getAllWindows()).toHaveLength(1);
    });

    it('fails for unknown app', async () => {
      const result = await executeTool('open_app', { name: 'Unknown' });
      expect(result.success).toBe(false);
      expect(result.result).toContain('not found');
    });
  });

  describe('close_window', () => {
    it('closes a window by title', async () => {
      useWindowsStore.getState().openWindow({ appId: 'app', title: 'My Window' });
      const result = await executeTool('close_window', { identifier: 'My Window' });
      expect(result.success).toBe(true);
      expect(useWindowsStore.getState().getAllWindows()).toHaveLength(0);
    });

    it('fails for non-existent window', async () => {
      const result = await executeTool('close_window', { identifier: 'Nope' });
      expect(result.success).toBe(false);
    });
  });

  describe('focus_window', () => {
    it('focuses a window by title', async () => {
      const id = useWindowsStore.getState().openWindow({ appId: 'app', title: 'Target' });
      const result = await executeTool('focus_window', { identifier: 'Target' });
      expect(result.success).toBe(true);
      expect(useWindowsStore.getState().getFocusedWindow()?.id).toBe(id);
    });

    it('fails for non-existent window', async () => {
      const result = await executeTool('focus_window', { identifier: 'Nope' });
      expect(result.success).toBe(false);
    });
  });

  describe('minimize_window', () => {
    it('minimizes a window by title', async () => {
      const id = useWindowsStore.getState().openWindow({ appId: 'app', title: 'Win' });
      const result = await executeTool('minimize_window', { identifier: 'Win' });
      expect(result.success).toBe(true);
      expect(useWindowsStore.getState().getWindow(id)?.state).toBe('minimized');
    });
  });

  describe('maximize_window', () => {
    it('maximizes a window by title', async () => {
      const id = useWindowsStore.getState().openWindow({ appId: 'app', title: 'Win' });
      const result = await executeTool('maximize_window', { identifier: 'Win' });
      expect(result.success).toBe(true);
      expect(useWindowsStore.getState().getWindow(id)?.state).toBe('maximized');
    });
  });

  describe('restore_window', () => {
    it('restores a minimized window', async () => {
      const id = useWindowsStore.getState().openWindow({ appId: 'app', title: 'Win' });
      useWindowsStore.getState().minimizeWindow(id);
      const result = await executeTool('restore_window', { identifier: 'Win' });
      expect(result.success).toBe(true);
      expect(useWindowsStore.getState().getWindow(id)?.state).toBe('normal');
    });
  });

  describe('tile_windows', () => {
    it('tiles windows horizontally', async () => {
      useWindowsStore.getState().openWindow({ appId: 'app', title: 'W1' });
      useWindowsStore.getState().openWindow({ appId: 'app', title: 'W2' });
      const result = await executeTool('tile_windows', { layout: 'horizontal' });
      expect(result.success).toBe(true);
      expect(result.result).toContain('horizontal');
    });
  });

  describe('cascade_windows', () => {
    it('cascades windows', async () => {
      useWindowsStore.getState().openWindow({ appId: 'app', title: 'W1' });
      const result = await executeTool('cascade_windows', {});
      expect(result.success).toBe(true);
      expect(result.result).toContain('Cascaded');
    });
  });

  describe('minimize_all', () => {
    it('minimizes all windows', async () => {
      const id1 = useWindowsStore.getState().openWindow({ appId: 'app', title: 'W1' });
      const id2 = useWindowsStore.getState().openWindow({ appId: 'app', title: 'W2' });
      const result = await executeTool('minimize_all', {});
      expect(result.success).toBe(true);
      expect(useWindowsStore.getState().getWindow(id1)?.state).toBe('minimized');
      expect(useWindowsStore.getState().getWindow(id2)?.state).toBe('minimized');
    });
  });

  describe('execute_command', () => {
    it('executes a registered command', async () => {
      const handler = vi.fn();
      useCommandRegistryStore.getState().register({
        id: 'test.run',
        title: 'Run Test',
        category: 'Test',
        source: 'test',
        enabled: true,
        handler,
      });
      const result = await executeTool('execute_command', { commandId: 'test.run' });
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('fails for unknown command', async () => {
      const result = await executeTool('execute_command', { commandId: 'nope' });
      expect(result.success).toBe(false);
    });
  });

  describe('list_windows', () => {
    it('lists open windows', async () => {
      useWindowsStore.getState().openWindow({ appId: 'app', title: 'Window A' });
      useWindowsStore.getState().openWindow({ appId: 'app', title: 'Window B' });
      const result = await executeTool('list_windows', {});
      expect(result.success).toBe(true);
      expect(result.result).toContain('Window A');
      expect(result.result).toContain('Window B');
    });

    it('returns empty message when no windows', async () => {
      const result = await executeTool('list_windows', {});
      expect(result.success).toBe(true);
      expect(result.result).toContain('No windows');
    });
  });

  describe('list_apps', () => {
    it('lists available apps', async () => {
      registerTestApp();
      const result = await executeTool('list_apps', {});
      expect(result.success).toBe(true);
      expect(result.result).toContain('Calculator');
    });

    it('returns empty message when no apps', async () => {
      const result = await executeTool('list_apps', {});
      expect(result.success).toBe(true);
      expect(result.result).toContain('No apps');
    });
  });

  describe('send_notification', () => {
    it('sends a notification', async () => {
      const result = await executeTool('send_notification', {
        title: 'Hello',
        message: 'World',
        type: 'success',
      });
      expect(result.success).toBe(true);
      expect(result.result).toContain('success');
    });
  });

  describe('get_setting / set_setting', () => {
    it('gets and sets a setting', async () => {
      useSettingsStore.getState().registerSettings('test', [
        { key: 'test.theme', type: 'string', default: 'dark', description: 'Theme' },
      ]);
      const getResult = await executeTool('get_setting', { key: 'test.theme' });
      expect(getResult.success).toBe(true);
      expect(getResult.result).toContain('dark');

      const setResult = await executeTool('set_setting', { key: 'test.theme', value: 'light' });
      expect(setResult.success).toBe(true);

      const getResult2 = await executeTool('get_setting', { key: 'test.theme' });
      expect(getResult2.result).toContain('light');
    });

    it('returns not set for unknown key', async () => {
      const result = await executeTool('get_setting', { key: 'unknown.key' });
      expect(result.result).toContain('not set');
    });
  });

  describe('unknown tool', () => {
    it('returns error for unknown tool name', async () => {
      const result = await executeTool('nonexistent_tool', {});
      expect(result.success).toBe(false);
      expect(result.result).toContain('Unknown tool');
    });
  });

  describe('executeToolCalls', () => {
    it('executes multiple tools in parallel', async () => {
      useWindowsStore.getState().openWindow({ appId: 'app', title: 'W1' });
      useWindowsStore.getState().openWindow({ appId: 'app', title: 'W2' });

      const results = await executeToolCalls([
        { id: 'call-1', name: 'list_windows', arguments: '{}' },
        { id: 'call-2', name: 'list_apps', arguments: '{}' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].toolCallId).toBe('call-1');
      expect(results[1].toolCallId).toBe('call-2');
    });

    it('handles invalid JSON arguments', async () => {
      const results = await executeToolCalls([
        { id: 'call-1', name: 'open_app', arguments: 'not json' },
      ]);
      expect(results[0].success).toBe(false);
      expect(results[0].result).toContain('Invalid JSON');
    });
  });
});
