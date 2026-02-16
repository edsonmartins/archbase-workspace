import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCommandRegistryStore } from '../commands';
import { useShortcutsStore } from '../shortcuts';
import type { RegisteredCommand } from '@archbase/workspace-types';

function getState() {
  return useCommandRegistryStore.getState();
}

function makeCommand(overrides: Partial<RegisteredCommand> = {}): RegisteredCommand {
  return {
    id: 'test.command',
    title: 'Test Command',
    source: 'test-app',
    enabled: true,
    ...overrides,
  };
}

describe('CommandRegistry Store', () => {
  beforeEach(() => {
    useCommandRegistryStore.setState({ commands: new Map() });
    useShortcutsStore.setState({ shortcuts: new Map() });
  });

  describe('register', () => {
    it('registers a command', () => {
      getState().register(makeCommand());
      expect(getState().commands.size).toBe(1);
      expect(getState().getCommand('test.command')?.title).toBe('Test Command');
    });

    it('overwrites existing command with same id', () => {
      getState().register(makeCommand());
      getState().register(makeCommand({ title: 'Updated' }));
      expect(getState().commands.size).toBe(1);
      expect(getState().getCommand('test.command')?.title).toBe('Updated');
    });

    it('auto-registers shortcut when keybinding is present', () => {
      getState().register(makeCommand({ keybinding: 'Cmd+K' }));
      const shortcut = useShortcutsStore.getState().getShortcut('cmd:test.command');
      expect(shortcut).toBeDefined();
      expect(shortcut?.combo.key).toBe('k');
      expect(shortcut?.combo.meta).toBe(true);
    });

    it('does not register shortcut when no keybinding', () => {
      getState().register(makeCommand());
      const shortcut = useShortcutsStore.getState().getShortcut('cmd:test.command');
      expect(shortcut).toBeUndefined();
    });
  });

  describe('registerBatch', () => {
    it('registers multiple commands', () => {
      getState().registerBatch([
        makeCommand({ id: 'a', title: 'A' }),
        makeCommand({ id: 'b', title: 'B' }),
        makeCommand({ id: 'c', title: 'C' }),
      ]);
      expect(getState().commands.size).toBe(3);
    });
  });

  describe('unregister', () => {
    it('removes a registered command', () => {
      getState().register(makeCommand());
      getState().unregister('test.command');
      expect(getState().commands.size).toBe(0);
    });

    it('removes associated shortcut', () => {
      getState().register(makeCommand({ keybinding: 'Cmd+K' }));
      expect(useShortcutsStore.getState().shortcuts.size).toBe(1);
      getState().unregister('test.command');
      expect(useShortcutsStore.getState().shortcuts.size).toBe(0);
    });

    it('is no-op for non-existent id', () => {
      getState().register(makeCommand());
      getState().unregister('nonexistent');
      expect(getState().commands.size).toBe(1);
    });
  });

  describe('unregisterBySource', () => {
    it('removes all commands from a source app', () => {
      getState().registerBatch([
        makeCommand({ id: 'a', source: 'app-1' }),
        makeCommand({ id: 'b', source: 'app-1' }),
        makeCommand({ id: 'c', source: 'app-2' }),
      ]);
      getState().unregisterBySource('app-1');
      expect(getState().commands.size).toBe(1);
      expect(getState().getCommand('c')).toBeDefined();
    });

    it('is no-op when no commands from source', () => {
      getState().register(makeCommand({ source: 'app-1' }));
      getState().unregisterBySource('app-2');
      expect(getState().commands.size).toBe(1);
    });
  });

  describe('execute', () => {
    it('calls the handler with arguments', async () => {
      const handler = vi.fn();
      getState().register(makeCommand({ handler }));
      await getState().execute('test.command', 'arg1', 'arg2');
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('does nothing if command is disabled', async () => {
      const handler = vi.fn();
      getState().register(makeCommand({ handler, enabled: false }));
      await getState().execute('test.command');
      expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing if command not found', async () => {
      await expect(getState().execute('nonexistent')).resolves.toBeUndefined();
    });

    it('does nothing if no handler is set', async () => {
      getState().register(makeCommand());
      await expect(getState().execute('test.command')).resolves.toBeUndefined();
    });
  });

  describe('setHandler', () => {
    it('sets a handler on an existing command', () => {
      const handler = vi.fn();
      getState().register(makeCommand());
      getState().setHandler('test.command', handler);
      expect(getState().getCommand('test.command')?.handler).toBe(handler);
    });

    it('is no-op for non-existent command', () => {
      getState().setHandler('nonexistent', vi.fn());
      expect(getState().commands.size).toBe(0);
    });
  });

  describe('setEnabled', () => {
    it('disables a command', () => {
      getState().register(makeCommand({ enabled: true }));
      getState().setEnabled('test.command', false);
      expect(getState().getCommand('test.command')?.enabled).toBe(false);
    });

    it('enables a disabled command', () => {
      getState().register(makeCommand({ enabled: false }));
      getState().setEnabled('test.command', true);
      expect(getState().getCommand('test.command')?.enabled).toBe(true);
    });

    it('is no-op when already in desired state', () => {
      getState().register(makeCommand({ enabled: true }));
      const before = getState().commands;
      getState().setEnabled('test.command', true);
      expect(getState().commands).toBe(before);
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      getState().registerBatch([
        makeCommand({ id: 'app.open', title: 'Open File', category: 'File', source: 'editor' }),
        makeCommand({ id: 'app.save', title: 'Save File', category: 'File', source: 'editor' }),
        makeCommand({ id: 'app.settings', title: 'Open Settings', category: 'General', source: 'core' }),
      ]);
    });

    it('getAllCommands returns all commands', () => {
      expect(getState().getAllCommands()).toHaveLength(3);
    });

    it('getByCategory filters by category', () => {
      expect(getState().getByCategory('File')).toHaveLength(2);
      expect(getState().getByCategory('General')).toHaveLength(1);
      expect(getState().getByCategory('Unknown')).toHaveLength(0);
    });

    it('getBySource filters by source app', () => {
      expect(getState().getBySource('editor')).toHaveLength(2);
      expect(getState().getBySource('core')).toHaveLength(1);
    });

    it('search finds commands by title', () => {
      expect(getState().search('save')).toHaveLength(1);
      expect(getState().search('file')).toHaveLength(2);
    });

    it('search finds commands by id', () => {
      expect(getState().search('app.settings')).toHaveLength(1);
    });

    it('search finds commands by category', () => {
      expect(getState().search('general')).toHaveLength(1);
    });

    it('search is case insensitive', () => {
      expect(getState().search('OPEN')).toHaveLength(2);
    });
  });
});
