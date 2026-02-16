import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSecureSDK } from '../createSecureSDK';
import { usePermissionsStore } from '@archbase/workspace-state';
import { useNotificationsStore } from '@archbase/workspace-state';
import type { AppManifest } from '@archbase/workspace-types';

function resetStores() {
  usePermissionsStore.setState({
    grants: new Map(),
    pendingPrompt: null,
    promptQueue: [],
  });
  useNotificationsStore.setState({ notifications: new Map() });
  try {
    localStorage.clear();
  } catch {
    // jsdom may not support
  }
}

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

describe('createSecureSDK', () => {
  beforeEach(resetStores);

  it('creates SDK with correct appId and windowId', () => {
    const sdk = createSecureSDK('test-app', 'win-1', makeManifest());
    expect(sdk.appId).toBe('test-app');
    expect(sdk.windowId).toBe('win-1');
  });

  it('preserves windows service (no permission check)', () => {
    const sdk = createSecureSDK('test-app', 'win-1', makeManifest());
    // Window operations should always work regardless of permissions
    const id = sdk.windows.open({ title: 'Test' });
    expect(id).toBeTruthy();
  });

  it('preserves commands service (no permission check)', () => {
    const sdk = createSecureSDK('test-app', 'win-1', makeManifest());
    const handler = vi.fn();
    const unregister = sdk.commands.register('test.cmd', handler);
    expect(typeof unregister).toBe('function');
    unregister();
  });

  describe('notification permission', () => {
    it('blocks notifications when permission denied', () => {
      usePermissionsStore.getState().deny('test-app', 'notifications');
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications'],
      }));
      const id = sdk.notifications.info('Hello', 'World');
      expect(id).toBe('');
      expect(useNotificationsStore.getState().notifications.size).toBe(0);
    });

    it('allows notifications when permission granted', () => {
      usePermissionsStore.getState().grant('test-app', 'notifications');
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications'],
      }));
      const id = sdk.notifications.info('Hello', 'World');
      expect(id).toBeTruthy();
      expect(id).not.toBe('');
      expect(useNotificationsStore.getState().notifications.size).toBe(1);
    });

    it('blocks notifications when undeclared in manifest', () => {
      // No permissions declared
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest());
      const id = sdk.notifications.info('Hello');
      expect(id).toBe('');
    });

    it('blocks notifications when undecided (prompt state)', () => {
      // Permission declared but not yet decided
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications'],
      }));
      const id = sdk.notifications.info('Hello');
      expect(id).toBe('');
    });

    it('returns empty string for all notification types when blocked', () => {
      usePermissionsStore.getState().deny('test-app', 'notifications');
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications'],
      }));
      expect(sdk.notifications.info('A')).toBe('');
      expect(sdk.notifications.success('B')).toBe('');
      expect(sdk.notifications.warning('C')).toBe('');
      expect(sdk.notifications.error('D')).toBe('');
    });
  });

  describe('storage permission', () => {
    it('blocks storage.set when permission denied', () => {
      usePermissionsStore.getState().deny('test-app', 'storage');
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['storage'],
      }));
      sdk.storage.set('key', 'value');
      // Should not be stored
      expect(sdk.storage.get('key')).toBeNull();
    });

    it('allows storage.get when permission granted', () => {
      usePermissionsStore.getState().grant('test-app', 'storage');
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['storage'],
      }));
      sdk.storage.set('key', 'value');
      expect(sdk.storage.get('key')).toBe('value');
    });

    it('blocks storage operations when undeclared', () => {
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest());
      sdk.storage.set('key', 'value');
      expect(sdk.storage.get('key')).toBeNull();
      expect(sdk.storage.keys()).toEqual([]);
    });
  });

  describe('permissions service', () => {
    it('check returns granted for granted permission', () => {
      usePermissionsStore.getState().grant('test-app', 'notifications');
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications'],
      }));
      expect(sdk.permissions.check('notifications')).toBe('granted');
    });

    it('check returns denied for denied permission', () => {
      usePermissionsStore.getState().deny('test-app', 'storage');
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['storage'],
      }));
      expect(sdk.permissions.check('storage')).toBe('denied');
    });

    it('check returns denied for undeclared permission', () => {
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest());
      expect(sdk.permissions.check('notifications')).toBe('denied');
    });

    it('check returns prompt for declared but undecided', () => {
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications'],
      }));
      expect(sdk.permissions.check('notifications')).toBe('prompt');
    });

    it('request triggers store requestPermission for declared permission', async () => {
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications'],
      }));
      const promise = sdk.permissions.request('notifications');
      // Should have created a pending prompt
      expect(usePermissionsStore.getState().pendingPrompt).toBeTruthy();
      // Resolve it
      usePermissionsStore.getState().resolvePrompt('granted');
      const result = await promise;
      expect(result).toBe(true);
    });

    it('request returns false for undeclared permission', async () => {
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest());
      const result = await sdk.permissions.request('notifications');
      expect(result).toBe(false);
    });

    it('list returns all permissions with their states', () => {
      usePermissionsStore.getState().grant('test-app', 'notifications');
      usePermissionsStore.getState().deny('test-app', 'storage');
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications', 'storage'],
      }));
      const list = sdk.permissions.list();
      expect(list.length).toBeGreaterThan(0);
      const notif = list.find((p) => p.permission === 'notifications');
      const storage = list.find((p) => p.permission === 'storage');
      expect(notif?.grant).toBe('granted');
      expect(storage?.grant).toBe('denied');
    });

    it('list shows undeclared permissions as denied (L2)', () => {
      // Only declare 'notifications', leave all others undeclared
      const sdk = createSecureSDK('test-app', 'win-1', makeManifest({
        permissions: ['notifications'],
      }));
      const list = sdk.permissions.list();
      // 'notifications' is declared but undecided → 'prompt'
      const notif = list.find((p) => p.permission === 'notifications');
      expect(notif?.grant).toBe('prompt');
      // 'storage' is undeclared → 'denied'
      const storage = list.find((p) => p.permission === 'storage');
      expect(storage?.grant).toBe('denied');
      // All undeclared permissions should be 'denied'
      const undeclared = list.filter((p) => p.permission !== 'notifications');
      for (const entry of undeclared) {
        expect(entry.grant).toBe('denied');
      }
    });
  });
});
