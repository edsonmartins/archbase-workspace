import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../settings';
import type { Setting, SettingValue } from '@archbase/workspace-types';

function getState() {
  return useSettingsStore.getState();
}

function makeSettings(appId: string): Setting[] {
  return [
    { key: `${appId}.theme`, type: 'string', default: 'dark', description: 'UI theme' },
    { key: `${appId}.fontSize`, type: 'number', default: 14, description: 'Font size' },
    { key: `${appId}.autoSave`, type: 'boolean', default: true, description: 'Auto save' },
  ];
}

describe('Settings Store', () => {
  beforeEach(() => {
    useSettingsStore.setState({ values: new Map() });
  });

  describe('registerSettings', () => {
    it('registers settings with default values', () => {
      getState().registerSettings('editor', makeSettings('editor'));
      expect(getState().values.size).toBe(3);
      expect(getState().getValue('editor.theme')).toBe('dark');
      expect(getState().getValue('editor.fontSize')).toBe(14);
      expect(getState().getValue('editor.autoSave')).toBe(true);
    });

    it('does not overwrite existing settings', () => {
      getState().registerSettings('editor', makeSettings('editor'));
      getState().setValue('editor.theme', 'light');
      // Re-register should not reset
      getState().registerSettings('editor', makeSettings('editor'));
      expect(getState().getValue('editor.theme')).toBe('light');
    });

    it('registers settings from multiple apps', () => {
      getState().registerSettings('editor', makeSettings('editor'));
      getState().registerSettings('notes', makeSettings('notes'));
      expect(getState().values.size).toBe(6);
    });
  });

  describe('unregisterBySource', () => {
    it('removes all settings from a source app', () => {
      getState().registerSettings('editor', makeSettings('editor'));
      getState().registerSettings('notes', makeSettings('notes'));
      getState().unregisterBySource('editor');
      expect(getState().values.size).toBe(3);
      expect(getState().getValue('notes.theme')).toBe('dark');
    });

    it('is no-op when no settings from source', () => {
      getState().registerSettings('editor', makeSettings('editor'));
      getState().unregisterBySource('unknown');
      expect(getState().values.size).toBe(3);
    });
  });

  describe('getValue', () => {
    it('returns the current value', () => {
      getState().registerSettings('app', [
        { key: 'app.color', type: 'string', default: 'blue', description: 'Color' },
      ]);
      expect(getState().getValue('app.color')).toBe('blue');
    });

    it('returns undefined for unknown key', () => {
      expect(getState().getValue('unknown.key')).toBeUndefined();
    });
  });

  describe('setValue', () => {
    it('updates the value of a setting', () => {
      getState().registerSettings('app', [
        { key: 'app.color', type: 'string', default: 'blue', description: 'Color' },
      ]);
      getState().setValue('app.color', 'red');
      expect(getState().getValue('app.color')).toBe('red');
    });

    it('is no-op for unknown key', () => {
      getState().setValue('unknown.key', 'value');
      expect(getState().values.size).toBe(0);
    });
  });

  describe('resetToDefault', () => {
    it('resets a setting to its default value', () => {
      getState().registerSettings('app', [
        { key: 'app.size', type: 'number', default: 12, description: 'Size' },
      ]);
      getState().setValue('app.size', 24);
      expect(getState().getValue('app.size')).toBe(24);
      getState().resetToDefault('app.size');
      expect(getState().getValue('app.size')).toBe(12);
    });

    it('is no-op for unknown key', () => {
      getState().resetToDefault('unknown.key');
      expect(getState().values.size).toBe(0);
    });
  });

  describe('resetAll', () => {
    it('resets all settings to defaults', () => {
      getState().registerSettings('editor', makeSettings('editor'));
      getState().setValue('editor.theme', 'light');
      getState().setValue('editor.fontSize', 20);
      getState().resetAll();
      expect(getState().getValue('editor.theme')).toBe('dark');
      expect(getState().getValue('editor.fontSize')).toBe(14);
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      getState().registerSettings('editor', makeSettings('editor'));
      getState().registerSettings('notes', [
        { key: 'notes.font', type: 'string', default: 'mono', description: 'Font' },
      ]);
    });

    it('getAllSettings returns all entries', () => {
      expect(getState().getAllSettings()).toHaveLength(4);
    });

    it('getBySource filters by source app', () => {
      expect(getState().getBySource('editor')).toHaveLength(3);
      expect(getState().getBySource('notes')).toHaveLength(1);
      expect(getState().getBySource('unknown')).toHaveLength(0);
    });
  });
});
