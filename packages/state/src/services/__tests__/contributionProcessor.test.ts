import { describe, it, expect, beforeEach } from 'vitest';
import type { AppManifest } from '@archbase/workspace-types';
import { processContributions, removeContributions } from '../contributionProcessor';
import { useCommandRegistryStore } from '../../stores/commands';
import { useMenuRegistryStore } from '../../stores/menus';
import { useWidgetRegistryStore } from '../../stores/widgets';
import { useSettingsStore } from '../../stores/settings';
import { useShortcutsStore } from '../../stores/shortcuts';

function makeManifest(overrides: Partial<AppManifest> = {}): AppManifest {
  return {
    id: 'dev.archbase.test',
    name: 'test_app',
    version: '0.1.0',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:9999/mf-manifest.json',
    ...overrides,
  };
}

function resetAllStores() {
  useCommandRegistryStore.setState({ commands: new Map() });
  useMenuRegistryStore.setState({
    applicationMenus: new Map(),
    contextMenus: new Map(),
    windowMenus: new Map(),
  });
  useWidgetRegistryStore.setState({ widgets: new Map() });
  useSettingsStore.setState({ values: new Map() });
  useShortcutsStore.setState({ shortcuts: new Map() });
}

describe('ContributionProcessor', () => {
  beforeEach(resetAllStores);

  describe('processContributions', () => {
    it('processes commands from manifest', () => {
      processContributions(
        makeManifest({
          contributes: {
            commands: [
              { id: 'test.open', title: 'Open' },
              { id: 'test.save', title: 'Save' },
            ],
          },
        }),
      );
      expect(useCommandRegistryStore.getState().commands.size).toBe(2);
      const cmd = useCommandRegistryStore.getState().getCommand('test.open');
      expect(cmd?.source).toBe('dev.archbase.test');
      expect(cmd?.enabled).toBe(true);
    });

    it('processes menus from manifest', () => {
      processContributions(
        makeManifest({
          contributes: {
            menus: {
              context: [{ command: 'test.copy' }],
              application: [{ command: 'test.open' }],
            },
          },
        }),
      );
      expect(useMenuRegistryStore.getState().getContextMenuItems()).toHaveLength(1);
      expect(useMenuRegistryStore.getState().getApplicationMenuItems()).toHaveLength(1);
    });

    it('processes widgets from manifest', () => {
      processContributions(
        makeManifest({
          contributes: {
            widgets: [
              { id: 'test.clock', title: 'Clock', component: 'ClockWidget', defaultLocation: 'statusBar' },
            ],
          },
        }),
      );
      expect(useWidgetRegistryStore.getState().widgets.size).toBe(1);
      const widget = useWidgetRegistryStore.getState().getWidget('test.clock');
      expect(widget?.source).toBe('dev.archbase.test');
      expect(widget?.visible).toBe(true);
    });

    it('processes settings from manifest', () => {
      processContributions(
        makeManifest({
          contributes: {
            settings: [
              { key: 'test.theme', type: 'string', default: 'dark', description: 'Theme' },
            ],
          },
        }),
      );
      expect(useSettingsStore.getState().values.size).toBe(1);
      expect(useSettingsStore.getState().getValue('test.theme')).toBe('dark');
    });

    it('is no-op when manifest has no contributes', () => {
      processContributions(makeManifest());
      expect(useCommandRegistryStore.getState().commands.size).toBe(0);
      expect(useWidgetRegistryStore.getState().widgets.size).toBe(0);
      expect(useSettingsStore.getState().values.size).toBe(0);
    });

    it('handles partial contributes (only commands)', () => {
      processContributions(
        makeManifest({
          contributes: {
            commands: [{ id: 'test.cmd', title: 'Cmd' }],
          },
        }),
      );
      expect(useCommandRegistryStore.getState().commands.size).toBe(1);
      expect(useWidgetRegistryStore.getState().widgets.size).toBe(0);
      expect(useSettingsStore.getState().values.size).toBe(0);
    });
  });

  describe('removeContributions', () => {
    it('removes all contributions from an app', () => {
      processContributions(
        makeManifest({
          contributes: {
            commands: [{ id: 'test.open', title: 'Open' }],
            menus: { context: [{ command: 'test.copy' }] },
            widgets: [{ id: 'test.clock', title: 'Clock', component: 'Clock', defaultLocation: 'statusBar' }],
            settings: [{ key: 'test.theme', type: 'string', default: 'dark', description: 'Theme' }],
          },
        }),
      );
      expect(useCommandRegistryStore.getState().commands.size).toBe(1);
      expect(useWidgetRegistryStore.getState().widgets.size).toBe(1);
      expect(useSettingsStore.getState().values.size).toBe(1);

      removeContributions('dev.archbase.test');
      expect(useCommandRegistryStore.getState().commands.size).toBe(0);
      expect(useMenuRegistryStore.getState().getContextMenuItems()).toHaveLength(0);
      expect(useWidgetRegistryStore.getState().widgets.size).toBe(0);
      expect(useSettingsStore.getState().values.size).toBe(0);
    });

    it('only removes contributions from specified app', () => {
      processContributions(
        makeManifest({
          id: 'app.one',
          contributes: { commands: [{ id: 'one.cmd', title: 'One' }] },
        }),
      );
      processContributions(
        makeManifest({
          id: 'app.two',
          contributes: { commands: [{ id: 'two.cmd', title: 'Two' }] },
        }),
      );
      expect(useCommandRegistryStore.getState().commands.size).toBe(2);

      removeContributions('app.one');
      expect(useCommandRegistryStore.getState().commands.size).toBe(1);
      expect(useCommandRegistryStore.getState().getCommand('two.cmd')).toBeDefined();
    });
  });
});
