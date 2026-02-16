import { describe, it, expect, beforeEach } from 'vitest';
import { useWindowsStore } from '@archbase/workspace-state';
import { useAppRegistryStore } from '@archbase/workspace-state';
import { useCommandRegistryStore } from '@archbase/workspace-state';
import { buildSystemPrompt, getWorkspaceSnapshot } from '../context/contextBuilder';

function resetStores() {
  // Reset windows
  const ws = useWindowsStore.getState();
  for (const w of ws.getAllWindows()) {
    ws.closeWindow(w.id);
  }
  // Reset registry
  const rs = useAppRegistryStore.getState();
  for (const app of rs.apps.values()) {
    rs.unregister(app.id);
  }
  // Reset commands - unregister all
  const cs = useCommandRegistryStore.getState();
  for (const cmd of cs.getAllCommands()) {
    cs.unregister(cmd.id);
  }
}

describe('contextBuilder', () => {
  beforeEach(() => {
    resetStores();
  });

  describe('buildSystemPrompt', () => {
    it('includes empty state when no windows or apps', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('Open Windows (0)');
      expect(prompt).toContain('(none)');
      expect(prompt).toContain('AI Desktop Assistant');
    });

    it('includes open windows', () => {
      useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'My Test Window' });
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('Open Windows (1)');
      expect(prompt).toContain('My Test Window');
      expect(prompt).toContain('test-app');
    });

    it('marks the focused window', () => {
      const id = useWindowsStore.getState().openWindow({ appId: 'test-app', title: 'Focused Win' });
      useWindowsStore.getState().focusWindow(id);
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('[FOCUSED]');
    });

    it('includes registered apps', () => {
      useAppRegistryStore.getState().registerManifest({
        id: 'test.app',
        name: 'test_app',
        version: '1.0.0',
        entrypoint: './App.tsx',
        remoteEntry: 'http://localhost:3099/mf-manifest.json',
        displayName: 'Test Application',
        icon: '🧪',
        source: 'local',
      });
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('Test Application');
      expect(prompt).toContain('test.app');
    });

    it('includes registered commands', () => {
      useCommandRegistryStore.getState().register({
        id: 'test.cmd',
        title: 'Test Command',
        category: 'Test',
        source: 'test',
        enabled: true,
        handler: () => {},
      });
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('test.cmd');
      expect(prompt).toContain('Test Command');
    });
  });

  describe('getWorkspaceSnapshot', () => {
    it('returns empty state', () => {
      const snapshot = getWorkspaceSnapshot();
      expect(snapshot.windows).toEqual([]);
      expect(snapshot.apps).toEqual([]);
      expect(snapshot.commandCount).toBe(0);
    });

    it('returns windows with focused flag', () => {
      const id = useWindowsStore.getState().openWindow({ appId: 'app1', title: 'Win 1' });
      useWindowsStore.getState().focusWindow(id);
      const snapshot = getWorkspaceSnapshot();
      expect(snapshot.windows).toHaveLength(1);
      expect(snapshot.windows[0].focused).toBe(true);
      expect(snapshot.windows[0].title).toBe('Win 1');
    });
  });
});
