import { describe, it, expect, beforeEach } from 'vitest';
import { useShortcutsStore } from '../shortcuts';
import type { Shortcut, KeyCombo } from '@archbase/workspace-types';

function getState() {
  return useShortcutsStore.getState();
}

function makeShortcut(overrides: Partial<Shortcut> = {}): Shortcut {
  return {
    id: 'test.shortcut',
    combo: { key: 'k', meta: true },
    label: 'Test Shortcut',
    scope: 'global',
    enabled: true,
    ...overrides,
  };
}

describe('Shortcuts Store', () => {
  beforeEach(() => {
    useShortcutsStore.setState({ shortcuts: new Map() });
  });

  describe('register', () => {
    it('registers a shortcut', () => {
      getState().register(makeShortcut());
      expect(getState().shortcuts.size).toBe(1);
      expect(getState().shortcuts.get('test.shortcut')?.label).toBe('Test Shortcut');
    });

    it('overwrites existing shortcut with same id', () => {
      getState().register(makeShortcut());
      getState().register(makeShortcut({ label: 'Updated' }));
      expect(getState().shortcuts.size).toBe(1);
      expect(getState().shortcuts.get('test.shortcut')?.label).toBe('Updated');
    });

    it('registers multiple shortcuts', () => {
      getState().register(makeShortcut({ id: 'a' }));
      getState().register(makeShortcut({ id: 'b' }));
      expect(getState().shortcuts.size).toBe(2);
    });
  });

  describe('unregister', () => {
    it('removes a registered shortcut', () => {
      getState().register(makeShortcut());
      getState().unregister('test.shortcut');
      expect(getState().shortcuts.size).toBe(0);
    });

    it('is no-op for non-existent id', () => {
      getState().register(makeShortcut());
      getState().unregister('nonexistent');
      expect(getState().shortcuts.size).toBe(1);
    });
  });

  describe('enable / disable', () => {
    it('disables a shortcut', () => {
      getState().register(makeShortcut());
      getState().disable('test.shortcut');
      expect(getState().shortcuts.get('test.shortcut')?.enabled).toBe(false);
    });

    it('enables a disabled shortcut', () => {
      getState().register(makeShortcut({ enabled: false }));
      getState().enable('test.shortcut');
      expect(getState().shortcuts.get('test.shortcut')?.enabled).toBe(true);
    });

    it('enable is no-op if already enabled', () => {
      getState().register(makeShortcut({ enabled: true }));
      const before = getState().shortcuts;
      getState().enable('test.shortcut');
      // Map reference should not change
      expect(getState().shortcuts).toBe(before);
    });

    it('disable is no-op if already disabled', () => {
      getState().register(makeShortcut({ enabled: false }));
      const before = getState().shortcuts;
      getState().disable('test.shortcut');
      expect(getState().shortcuts).toBe(before);
    });
  });

  describe('setCombo', () => {
    it('updates the combo of a shortcut', () => {
      getState().register(makeShortcut());
      const newCombo: KeyCombo = { key: 'n', ctrl: true, shift: true };
      getState().setCombo('test.shortcut', newCombo);
      expect(getState().shortcuts.get('test.shortcut')?.combo).toEqual(newCombo);
    });

    it('is no-op for non-existent id', () => {
      getState().setCombo('nonexistent', { key: 'x' });
      expect(getState().shortcuts.size).toBe(0);
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      getState().register(makeShortcut({ id: 'a', combo: { key: 'k', meta: true }, scope: 'global' }));
      getState().register(makeShortcut({ id: 'b', combo: { key: 'w', meta: true }, scope: 'window' }));
      getState().register(makeShortcut({ id: 'c', combo: { key: 'n', ctrl: true }, scope: 'global' }));
    });

    it('getShortcut returns shortcut by id', () => {
      expect(getState().getShortcut('a')?.combo.key).toBe('k');
    });

    it('getShortcut returns undefined for unknown id', () => {
      expect(getState().getShortcut('unknown')).toBeUndefined();
    });

    it('getByCombo finds shortcut matching combo', () => {
      expect(getState().getByCombo({ key: 'w', meta: true })?.id).toBe('b');
    });

    it('getByCombo returns undefined for unregistered combo', () => {
      expect(getState().getByCombo({ key: 'z', meta: true })).toBeUndefined();
    });

    it('getAllShortcuts returns all', () => {
      expect(getState().getAllShortcuts()).toHaveLength(3);
    });

    it('getByScope filters by scope', () => {
      expect(getState().getByScope('global')).toHaveLength(2);
      expect(getState().getByScope('window')).toHaveLength(1);
      expect(getState().getByScope('app')).toHaveLength(0);
    });

    it('hasConflict detects duplicate combo', () => {
      expect(getState().hasConflict({ key: 'k', meta: true })).toBe(true);
    });

    it('hasConflict excludes specified id', () => {
      expect(getState().hasConflict({ key: 'k', meta: true }, 'a')).toBe(false);
    });

    it('hasConflict returns false for unique combo', () => {
      expect(getState().hasConflict({ key: 'z', alt: true })).toBe(false);
    });
  });
});
