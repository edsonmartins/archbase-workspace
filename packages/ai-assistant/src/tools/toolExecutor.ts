import {
  useWindowsStore,
  useAppRegistryStore,
  registryQueries,
  useCommandRegistryStore,
  useNotificationsStore,
  useSettingsStore,
} from '@archbase/workspace-state';
import type { ToolCallResult } from '../types';

const DEFAULT_VIEWPORT_WIDTH = 1920;
const DEFAULT_VIEWPORT_HEIGHT = 1080;
const DEFAULT_TASKBAR_HEIGHT = 48;

export function resolveWindowId(identifier: string): string | null {
  const windowsState = useWindowsStore.getState();

  // Exact ID match
  const byId = windowsState.getWindow(identifier);
  if (byId) return identifier;

  // Case-insensitive title match
  const lower = identifier.toLowerCase();
  const allWindows = windowsState.getAllWindows();
  const byTitle = allWindows.find((w) => w.title.toLowerCase().includes(lower));
  return byTitle?.id ?? null;
}

export function resolveAppId(name: string): string | null {
  // Exact ID match
  const byId = registryQueries.getApp(name);
  if (byId) return name;

  // Name match
  const byName = registryQueries.getAppByName(name);
  if (byName) return byName.id;

  // Case-insensitive displayName match
  const lower = name.toLowerCase();
  const allApps = registryQueries.getAllApps();
  const byDisplayName = allApps.find((a) => (a.displayName || '').toLowerCase().includes(lower));
  return byDisplayName?.id ?? null;
}

function getFocusedWindowId(): string | null {
  const focused = useWindowsStore.getState().getFocusedWindow();
  return focused?.id ?? null;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: string; success: boolean }> {
  const windowsStore = useWindowsStore.getState();
  const commandsStore = useCommandRegistryStore.getState();
  const notificationsStore = useNotificationsStore.getState();
  const settingsStore = useSettingsStore.getState();

  switch (name) {
    case 'open_app': {
      const appName = args.name as string;
      const appId = resolveAppId(appName);
      if (!appId) return { result: `App "${appName}" not found.`, success: false };
      const manifest = registryQueries.getApp(appId);
      if (!manifest) return { result: `App "${appName}" not found.`, success: false };
      const displayName = manifest.displayName || manifest.name;
      const windowId = windowsStore.openWindow({
        appId,
        title: displayName,
        width: manifest.window?.defaultWidth,
        height: manifest.window?.defaultHeight,
      });
      return { result: `Opened "${displayName}" (window: ${windowId}).`, success: true };
    }

    case 'close_window': {
      const identifier = args.identifier as string | undefined;
      const windowId = identifier ? resolveWindowId(identifier) : getFocusedWindowId();
      if (!windowId) return { result: `Window "${identifier ?? 'focused'}" not found.`, success: false };
      const win = windowsStore.getWindow(windowId);
      const title = win?.title ?? windowId;
      windowsStore.closeWindow(windowId);
      // Verify the window was actually closed
      const stillExists = windowsStore.getWindow(windowId);
      if (stillExists) return { result: `Window "${title}" could not be closed.`, success: false };
      return { result: `Closed window "${title}".`, success: true };
    }

    case 'focus_window': {
      const identifier = args.identifier as string;
      const windowId = resolveWindowId(identifier);
      if (!windowId) return { result: `Window "${identifier}" not found.`, success: false };
      windowsStore.focusWindow(windowId);
      const win = windowsStore.getWindow(windowId);
      return { result: `Focused window "${win?.title ?? windowId}".`, success: true };
    }

    case 'minimize_window': {
      const identifier = args.identifier as string | undefined;
      const windowId = identifier ? resolveWindowId(identifier) : getFocusedWindowId();
      if (!windowId) return { result: `Window "${identifier ?? 'focused'}" not found.`, success: false };
      windowsStore.minimizeWindow(windowId);
      const win = windowsStore.getWindow(windowId);
      return { result: `Minimized window "${win?.title ?? windowId}".`, success: true };
    }

    case 'maximize_window': {
      const identifier = args.identifier as string | undefined;
      const windowId = identifier ? resolveWindowId(identifier) : getFocusedWindowId();
      if (!windowId) return { result: `Window "${identifier ?? 'focused'}" not found.`, success: false };
      windowsStore.maximizeWindow(
        windowId,
        DEFAULT_VIEWPORT_WIDTH,
        DEFAULT_VIEWPORT_HEIGHT,
        DEFAULT_TASKBAR_HEIGHT,
      );
      const win = windowsStore.getWindow(windowId);
      return { result: `Maximized window "${win?.title ?? windowId}".`, success: true };
    }

    case 'restore_window': {
      const identifier = args.identifier as string | undefined;
      const windowId = identifier ? resolveWindowId(identifier) : getFocusedWindowId();
      if (!windowId) return { result: `Window "${identifier ?? 'focused'}" not found.`, success: false };
      windowsStore.restoreWindow(windowId);
      const win = windowsStore.getWindow(windowId);
      return { result: `Restored window "${win?.title ?? windowId}".`, success: true };
    }

    case 'tile_windows': {
      const layout = args.layout as 'horizontal' | 'vertical' | 'grid';
      windowsStore.tileWindows(
        layout,
        DEFAULT_VIEWPORT_WIDTH,
        DEFAULT_VIEWPORT_HEIGHT,
        DEFAULT_TASKBAR_HEIGHT,
      );
      return { result: `Tiled windows in ${layout} layout.`, success: true };
    }

    case 'cascade_windows': {
      windowsStore.cascadeWindows(
        DEFAULT_VIEWPORT_WIDTH,
        DEFAULT_VIEWPORT_HEIGHT,
        DEFAULT_TASKBAR_HEIGHT,
      );
      return { result: 'Cascaded all windows.', success: true };
    }

    case 'minimize_all': {
      windowsStore.minimizeAll();
      return { result: 'Minimized all windows.', success: true };
    }

    case 'execute_command': {
      const commandId = args.commandId as string;
      const cmd = commandsStore.getCommand(commandId);
      if (!cmd) return { result: `Command "${commandId}" not found.`, success: false };
      await commandsStore.execute(commandId);
      return { result: `Executed command "${cmd.title}".`, success: true };
    }

    case 'list_windows': {
      const allWindows = windowsStore.getAllWindows();
      if (allWindows.length === 0) return { result: 'No windows are open.', success: true };
      const focusedWin = windowsStore.getFocusedWindow();
      const list = allWindows.map((w) => {
        const focused = focusedWin?.id === w.id ? ' [FOCUSED]' : '';
        return `- "${w.title}" (${w.state})${focused}`;
      });
      return { result: `Open windows:\n${list.join('\n')}`, success: true };
    }

    case 'list_apps': {
      const allApps = registryQueries.getAllApps();
      if (allApps.length === 0) return { result: 'No apps available.', success: true };
      const list = allApps.map((a) => `- ${a.icon || ''} ${a.displayName || a.name} (${a.id})`);
      return { result: `Available apps:\n${list.join('\n')}`, success: true };
    }

    case 'send_notification': {
      const title = args.title as string;
      const message = args.message as string | undefined;
      const type = (args.type as 'info' | 'success' | 'warning' | 'error') || 'info';
      notificationsStore.notify({ type, title, message });
      return { result: `Sent ${type} notification: "${title}".`, success: true };
    }

    case 'get_setting': {
      const key = args.key as string;
      const value = settingsStore.getValue(key);
      if (value === undefined) return { result: `Setting "${key}" is not set.`, success: true };
      return { result: `Setting "${key}" = ${JSON.stringify(value)}`, success: true };
    }

    case 'set_setting': {
      const key = args.key as string;
      const value = args.value as string | number | boolean;
      settingsStore.setValue(key, value);
      return { result: `Set "${key}" to ${JSON.stringify(value)}.`, success: true };
    }

    default:
      return { result: `Unknown tool: "${name}".`, success: false };
  }
}

export async function executeToolCalls(
  calls: Array<{ id: string; name: string; arguments: string }>,
): Promise<ToolCallResult[]> {
  return Promise.all(
    calls.map(async (call) => {
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(call.arguments);
      } catch {
        return {
          toolCallId: call.id,
          name: call.name,
          result: `Invalid JSON arguments: ${call.arguments}`,
          success: false,
        };
      }
      const { result, success } = await executeTool(call.name, args);
      return { toolCallId: call.id, name: call.name, result, success };
    }),
  );
}
