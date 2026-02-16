import { useWindowsStore } from '@archbase/workspace-state';
import { registryQueries } from '@archbase/workspace-state';
import { useCommandRegistryStore } from '@archbase/workspace-state';

const MAX_COMMANDS_IN_CONTEXT = 50;

export function buildSystemPrompt(): string {
  const windowsState = useWindowsStore.getState();
  const commandsState = useCommandRegistryStore.getState();

  const allWindows = windowsState.getAllWindows();
  const focusedWindow = windowsState.getFocusedWindow();
  const allApps = registryQueries.getAllApps();
  const allCommands = commandsState.getAllCommands().slice(0, MAX_COMMANDS_IN_CONTEXT);

  const windowsList = allWindows.map((w) => {
    const focused = focusedWindow?.id === w.id ? ' [FOCUSED]' : '';
    return `  - "${w.title}" (id: ${w.id}, app: ${w.appId}, state: ${w.state})${focused}`;
  });

  const appsList = allApps.map((a) => {
    return `  - ${a.displayName} (id: ${a.id}, icon: ${a.icon || 'none'})`;
  });

  const commandsList = allCommands.map((c) => {
    const kb = c.keybinding ? ` [${c.keybinding}]` : '';
    return `  - ${c.id}: "${c.title}"${kb}`;
  });

  return `You are an AI Desktop Assistant for Archbase Workspace — a multi-app workspace with window management.

Your role is to help users manage their workspace by opening apps, arranging windows, executing commands, and answering questions about the workspace.

## Current Workspace State

### Open Windows (${allWindows.length})
${windowsList.length > 0 ? windowsList.join('\n') : '  (none)'}

### Available Apps (${allApps.length})
${appsList.length > 0 ? appsList.join('\n') : '  (none)'}

### Available Commands (${allCommands.length})
${commandsList.length > 0 ? commandsList.join('\n') : '  (none)'}

## Guidelines
- Use tools to perform actions. Do not just describe what you would do.
- When the user asks to open an app, use the open_app tool.
- When the user asks to close/minimize/maximize a window, use the corresponding tool.
- When the user mentions a window by name, match it case-insensitively against window titles.
- When the user mentions an app by name, match it against displayName or app id.
- Be concise and helpful. Confirm actions after performing them.
- If a tool call fails, explain the error and suggest alternatives.`;
}

export function getWorkspaceSnapshot(): {
  windows: Array<{ id: string; title: string; appId: string; state: string; focused: boolean }>;
  apps: Array<{ id: string; name: string; icon: string }>;
  commandCount: number;
} {
  const windowsState = useWindowsStore.getState();
  const commandsState = useCommandRegistryStore.getState();

  const focusedWindow = windowsState.getFocusedWindow();

  return {
    windows: windowsState.getAllWindows().map((w) => ({
      id: w.id,
      title: w.title,
      appId: w.appId,
      state: w.state,
      focused: focusedWindow?.id === w.id,
    })),
    apps: registryQueries.getAllApps().map((a) => ({
      id: a.id,
      name: a.displayName || a.name,
      icon: a.icon || '',
    })),
    commandCount: commandsState.getAllCommands().length,
  };
}
