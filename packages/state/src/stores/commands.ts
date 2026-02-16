import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { ActivationEvent, CommandHandler, RegisteredCommand } from '@archbase/workspace-types';
import { useShortcutsStore } from './shortcuts';

// ============================================================
// Types
// ============================================================

interface CommandRegistryState {
  commands: Map<string, RegisteredCommand>;
}

interface CommandRegistryActions {
  register: (command: RegisteredCommand) => void;
  registerBatch: (commands: RegisteredCommand[]) => void;
  unregister: (id: string) => void;
  unregisterBySource: (appId: string) => void;
  execute: (id: string, ...args: unknown[]) => Promise<void>;
  setHandler: (id: string, handler: CommandHandler | undefined) => void;
  setEnabled: (id: string, enabled: boolean) => void;

  // Queries (imperative)
  getCommand: (id: string) => RegisteredCommand | undefined;
  getAllCommands: () => RegisteredCommand[];
  getByCategory: (category: string) => RegisteredCommand[];
  getBySource: (appId: string) => RegisteredCommand[];
  search: (query: string) => RegisteredCommand[];
}

type CommandRegistryStore = CommandRegistryState & CommandRegistryActions;

const MAX_COMMANDS = 1000;

// ============================================================
// Helpers
// ============================================================

const MODIFIER_KEYS = new Set(['ctrl', 'control', 'cmd', 'meta', 'alt', 'option', 'shift']);

function registerShortcutForCommand(command: RegisteredCommand): void {
  if (!command.keybinding) return;
  const shortcutsStore = useShortcutsStore.getState();
  const parts = command.keybinding
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);

  // Must have at least one non-modifier key
  const key = parts[parts.length - 1];
  if (!key || MODIFIER_KEYS.has(key)) return;

  const combo = {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    alt: parts.includes('alt') || parts.includes('option'),
    shift: parts.includes('shift'),
  };

  if (!shortcutsStore.hasConflict(combo, `cmd:${command.id}`)) {
    shortcutsStore.register({
      id: `cmd:${command.id}`,
      combo,
      label: command.title,
      scope: 'global',
      enabled: command.enabled,
    });
  }
}

function unregisterShortcutForCommand(commandId: string): void {
  useShortcutsStore.getState().unregister(`cmd:${commandId}`);
}

// ============================================================
// Store
// ============================================================

export const useCommandRegistryStore = create<CommandRegistryStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      commands: new Map(),

      register: (command) => {
        set((state) => {
          const commands = new Map(state.commands);
          commands.set(command.id, command);
          // Evict oldest if over limit
          if (commands.size > MAX_COMMANDS) {
            const iter = commands.keys();
            while (commands.size > MAX_COMMANDS) {
              const oldest = iter.next().value;
              if (oldest !== undefined) commands.delete(oldest);
            }
          }
          return { commands };
        });
        registerShortcutForCommand(command);
      },

      registerBatch: (commands) => {
        set((state) => {
          const map = new Map(state.commands);
          for (const cmd of commands) {
            map.set(cmd.id, cmd);
          }
          // Evict oldest if over limit
          if (map.size > MAX_COMMANDS) {
            const iter = map.keys();
            while (map.size > MAX_COMMANDS) {
              const oldest = iter.next().value;
              if (oldest !== undefined) map.delete(oldest);
            }
          }
          return { commands: map };
        });
        for (const cmd of commands) {
          registerShortcutForCommand(cmd);
        }
      },

      unregister: (id) => {
        const { commands } = get();
        if (!commands.has(id)) return;
        unregisterShortcutForCommand(id);
        set((state) => {
          const commands = new Map(state.commands);
          commands.delete(id);
          return { commands };
        });
      },

      unregisterBySource: (appId) => {
        const { commands } = get();
        const toRemove: string[] = [];
        commands.forEach((cmd) => {
          if (cmd.source === appId) toRemove.push(cmd.id);
        });
        if (toRemove.length === 0) return;
        for (const id of toRemove) {
          unregisterShortcutForCommand(id);
        }
        set((state) => {
          const commands = new Map(state.commands);
          for (const id of toRemove) {
            commands.delete(id);
          }
          return { commands };
        });
      },

      execute: async (id, ...args) => {
        const cmd = get().commands.get(id);
        if (!cmd) return;
        if (!cmd.enabled) return;
        if (cmd.handler) {
          await cmd.handler(...args);
        } else {
          // No handler registered yet — fire activation event to trigger lazy loading.
          // The activation service will activate the app that declared this command.
          const { activationService } = await import('../services/activationService');
          activationService.fireEvent(`onCommand:${id}` as ActivationEvent);
        }
      },

      setHandler: (id, handler) => {
        const cmd = get().commands.get(id);
        if (!cmd) return;
        set((state) => {
          const commands = new Map(state.commands);
          commands.set(id, { ...cmd, handler });
          return { commands };
        });
      },

      setEnabled: (id, enabled) => {
        const cmd = get().commands.get(id);
        if (!cmd || cmd.enabled === enabled) return;
        set((state) => {
          const commands = new Map(state.commands);
          commands.set(id, { ...cmd, enabled });
          return { commands };
        });
        // Sync shortcut enabled state
        const shortcutsStore = useShortcutsStore.getState();
        const shortcut = shortcutsStore.getShortcut(`cmd:${id}`);
        if (shortcut) {
          if (enabled) shortcutsStore.enable(`cmd:${id}`);
          else shortcutsStore.disable(`cmd:${id}`);
        }
      },

      // Queries
      getCommand: (id) => get().commands.get(id),

      getAllCommands: () => Array.from(get().commands.values()),

      getByCategory: (category) => {
        const result: RegisteredCommand[] = [];
        get().commands.forEach((cmd) => {
          if (cmd.category === category) result.push(cmd);
        });
        return result;
      },

      getBySource: (appId) => {
        const result: RegisteredCommand[] = [];
        get().commands.forEach((cmd) => {
          if (cmd.source === appId) result.push(cmd);
        });
        return result;
      },

      search: (query) => {
        const q = query.toLowerCase();
        const result: RegisteredCommand[] = [];
        get().commands.forEach((cmd) => {
          if (
            cmd.title.toLowerCase().includes(q) ||
            cmd.id.toLowerCase().includes(q) ||
            (cmd.category && cmd.category.toLowerCase().includes(q))
          ) {
            result.push(cmd);
          }
        });
        return result;
      },
    })),
    { name: 'CommandRegistryStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

export const useCommand = (id: string) =>
  useCommandRegistryStore((state) => state.commands.get(id));

let cachedCommandsArray: RegisteredCommand[] = [];
let cachedCommandsMap: Map<string, RegisteredCommand> | null = null;

export const useAllCommands = () =>
  useCommandRegistryStore((state) => {
    if (state.commands !== cachedCommandsMap) {
      cachedCommandsMap = state.commands;
      cachedCommandsArray = Array.from(state.commands.values());
    }
    return cachedCommandsArray;
  });

// ============================================================
// Event Subscriptions
// ============================================================

export const onCommandRegistered = (handler: (command: RegisteredCommand) => void) =>
  useCommandRegistryStore.subscribe(
    (state) => state.commands,
    (current, previous) => {
      current.forEach((cmd, id) => {
        if (!previous.has(id)) handler(cmd);
      });
    },
  );

export const onCommandUnregistered = (handler: (id: string) => void) =>
  useCommandRegistryStore.subscribe(
    (state) => state.commands,
    (current, previous) => {
      previous.forEach((_, id) => {
        if (!current.has(id)) handler(id);
      });
    },
  );
