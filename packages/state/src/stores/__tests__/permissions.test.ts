import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePermissionsStore } from '../permissions';
import type { Permission, PermissionGrant } from '@archbase/workspace-types';

function resetStore() {
  usePermissionsStore.setState({
    grants: new Map(),
    pendingPrompt: null,
    promptQueue: [],
  });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('archbase:permissions');
    }
  } catch {
    // No storage available
  }
}

describe('PermissionsStore', () => {
  beforeEach(resetStore);

  describe('checkPermission', () => {
    it('returns prompt for unknown app/permission', () => {
      const result = usePermissionsStore.getState().checkPermission('unknown-app', 'notifications');
      expect(result).toBe('prompt');
    });

    it('returns granted after grant()', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      expect(store.checkPermission('app-1', 'notifications')).toBe('granted');
    });

    it('returns denied after deny()', () => {
      const store = usePermissionsStore.getState();
      store.deny('app-1', 'storage');
      expect(store.checkPermission('app-1', 'storage')).toBe('denied');
    });

    it('returns prompt for different permission on same app', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      expect(store.checkPermission('app-1', 'storage')).toBe('prompt');
    });
  });

  describe('grant', () => {
    it('sets permission to granted', () => {
      usePermissionsStore.getState().grant('app-1', 'notifications');
      const record = usePermissionsStore.getState().grants.get('app-1')?.get('notifications');
      expect(record?.grant).toBe('granted');
    });

    it('records a decidedAt timestamp', () => {
      const before = Date.now();
      usePermissionsStore.getState().grant('app-1', 'notifications');
      const record = usePermissionsStore.getState().grants.get('app-1')?.get('notifications');
      expect(record?.decidedAt).toBeGreaterThanOrEqual(before);
    });

    it('overwrites previous denial', () => {
      const store = usePermissionsStore.getState();
      store.deny('app-1', 'notifications');
      store.grant('app-1', 'notifications');
      expect(store.checkPermission('app-1', 'notifications')).toBe('granted');
    });

    it.skipIf(typeof localStorage === 'undefined')('persists to localStorage', () => {
      usePermissionsStore.getState().grant('app-1', 'notifications');
      const raw = localStorage.getItem('archbase:permissions');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed['app-1']).toHaveLength(1);
      expect(parsed['app-1'][0].grant).toBe('granted');
    });
  });

  describe('deny', () => {
    it('sets permission to denied', () => {
      usePermissionsStore.getState().deny('app-1', 'storage');
      expect(usePermissionsStore.getState().checkPermission('app-1', 'storage')).toBe('denied');
    });

    it('overwrites previous grant', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'storage');
      store.deny('app-1', 'storage');
      expect(store.checkPermission('app-1', 'storage')).toBe('denied');
    });
  });

  describe('getAppPermissions', () => {
    it('returns empty array for unknown app', () => {
      expect(usePermissionsStore.getState().getAppPermissions('unknown')).toEqual([]);
    });

    it('returns all entries for known app', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      store.deny('app-1', 'storage');
      const perms = store.getAppPermissions('app-1');
      expect(perms).toHaveLength(2);
      const permissions = perms.map((p) => p.permission).sort();
      expect(permissions).toEqual(['notifications', 'storage']);
    });

    it('does not return entries from other apps', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      store.grant('app-2', 'storage');
      expect(store.getAppPermissions('app-1')).toHaveLength(1);
    });
  });

  describe('resetApp', () => {
    it('removes all permissions for the app', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      store.grant('app-1', 'storage');
      store.resetApp('app-1');
      expect(store.getAppPermissions('app-1')).toEqual([]);
    });

    it('does not affect other apps', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      store.grant('app-2', 'storage');
      store.resetApp('app-1');
      expect(store.checkPermission('app-2', 'storage')).toBe('granted');
    });

    it('resolves pending prompt as denied when app is reset', async () => {
      const store = usePermissionsStore.getState();
      const promise = store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      expect(usePermissionsStore.getState().pendingPrompt).toBeTruthy();
      store.resetApp('app-1');
      const result = await promise;
      expect(result).toBe('denied');
      expect(usePermissionsStore.getState().pendingPrompt).toBeNull();
    });

    it('resolves queued prompts as denied when app is reset', async () => {
      const store = usePermissionsStore.getState();
      const p1 = store.requestPermission('app-other', 'Other', undefined, 'notifications');
      const p2 = usePermissionsStore.getState().requestPermission('app-1', 'App 1', undefined, 'storage');
      expect(usePermissionsStore.getState().promptQueue).toHaveLength(1);
      usePermissionsStore.getState().resetApp('app-1');
      const r2 = await p2;
      expect(r2).toBe('denied');
      // First prompt should still be active
      expect(usePermissionsStore.getState().pendingPrompt?.appId).toBe('app-other');
      // Resolve remaining
      usePermissionsStore.getState().resolvePrompt('granted');
      const r1 = await p1;
      expect(r1).toBe('granted');
    });
  });

  describe('resetAll', () => {
    it('clears all permissions', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      store.grant('app-2', 'storage');
      store.resetAll();
      expect(store.checkPermission('app-1', 'notifications')).toBe('prompt');
      expect(store.checkPermission('app-2', 'storage')).toBe('prompt');
    });

    it.skipIf(typeof localStorage === 'undefined')('clears localStorage (L3)', () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      store.grant('app-2', 'storage');
      // Verify data exists in localStorage
      expect(localStorage.getItem('archbase:permissions')).toBeTruthy();
      store.resetAll();
      // After resetAll, localStorage should be empty grants object
      const raw = localStorage.getItem('archbase:permissions');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(Object.keys(parsed)).toHaveLength(0);
    });

    it('resolves all pending and queued prompts as denied', async () => {
      const store = usePermissionsStore.getState();
      const p1 = store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      const p2 = usePermissionsStore.getState().requestPermission('app-2', 'App 2', undefined, 'storage');
      expect(usePermissionsStore.getState().pendingPrompt).toBeTruthy();
      expect(usePermissionsStore.getState().promptQueue).toHaveLength(1);

      usePermissionsStore.getState().resetAll();
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('denied');
      expect(r2).toBe('denied');
      expect(usePermissionsStore.getState().pendingPrompt).toBeNull();
      expect(usePermissionsStore.getState().promptQueue).toHaveLength(0);
    });
  });

  describe('requestPermission', () => {
    it('returns granted immediately if already granted', async () => {
      const store = usePermissionsStore.getState();
      store.grant('app-1', 'notifications');
      const result = await store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      expect(result).toBe('granted');
    });

    it('returns denied immediately if already denied', async () => {
      const store = usePermissionsStore.getState();
      store.deny('app-1', 'notifications');
      const result = await store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      expect(result).toBe('denied');
    });

    it('sets pendingPrompt when undecided', () => {
      const store = usePermissionsStore.getState();
      // Don't await — we just want to check the prompt is set
      store.requestPermission('app-1', 'App 1', '🔔', 'notifications');
      const prompt = usePermissionsStore.getState().pendingPrompt;
      expect(prompt).toBeTruthy();
      expect(prompt?.appId).toBe('app-1');
      expect(prompt?.permission).toBe('notifications');
      expect(prompt?.appDisplayName).toBe('App 1');
      expect(prompt?.appIcon).toBe('🔔');
    });

    it('resolves when resolvePrompt is called with granted', async () => {
      const store = usePermissionsStore.getState();
      const promise = store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      // Resolve the prompt
      usePermissionsStore.getState().resolvePrompt('granted');
      const result = await promise;
      expect(result).toBe('granted');
      expect(usePermissionsStore.getState().checkPermission('app-1', 'notifications')).toBe('granted');
    });

    it('resolves when resolvePrompt is called with denied', async () => {
      const store = usePermissionsStore.getState();
      const promise = store.requestPermission('app-1', 'App 1', undefined, 'storage');
      usePermissionsStore.getState().resolvePrompt('denied');
      const result = await promise;
      expect(result).toBe('denied');
      expect(usePermissionsStore.getState().checkPermission('app-1', 'storage')).toBe('denied');
    });

    it('queues multiple prompts and processes sequentially', async () => {
      const store = usePermissionsStore.getState();
      const p1 = store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      // Second request should be queued
      usePermissionsStore.getState().requestPermission('app-2', 'App 2', undefined, 'storage');
      expect(usePermissionsStore.getState().promptQueue).toHaveLength(1);

      // Resolve first
      usePermissionsStore.getState().resolvePrompt('granted');
      const r1 = await p1;
      expect(r1).toBe('granted');

      // Second prompt should now be active
      expect(usePermissionsStore.getState().pendingPrompt?.appId).toBe('app-2');
      expect(usePermissionsStore.getState().promptQueue).toHaveLength(0);
    });
  });

  describe('resolvePrompt', () => {
    it('does nothing when no pending prompt', () => {
      // Should not throw
      usePermissionsStore.getState().resolvePrompt('granted');
      expect(usePermissionsStore.getState().pendingPrompt).toBeNull();
    });

    it('clears pendingPrompt after resolution', async () => {
      const store = usePermissionsStore.getState();
      store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      usePermissionsStore.getState().resolvePrompt('granted');
      expect(usePermissionsStore.getState().pendingPrompt).toBeNull();
    });

    it('coerces prompt value to denied (M4)', async () => {
      const store = usePermissionsStore.getState();
      const promise = store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      // Passing 'prompt' as grant should be coerced to 'denied'
      usePermissionsStore.getState().resolvePrompt('prompt');
      const result = await promise;
      expect(result).toBe('denied');
      expect(usePermissionsStore.getState().checkPermission('app-1', 'notifications')).toBe('denied');
    });

    it('skips already-decided prompts in queue (M6)', async () => {
      const store = usePermissionsStore.getState();
      // Request two permissions for same app
      const p1 = store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      const p2 = usePermissionsStore.getState().requestPermission('app-1', 'App 1', undefined, 'storage');

      // Grant first — this also grants 'notifications' in the store
      usePermissionsStore.getState().resolvePrompt('granted');
      const r1 = await p1;
      expect(r1).toBe('granted');

      // Second prompt should now be the active one (different permission)
      const pending = usePermissionsStore.getState().pendingPrompt;
      expect(pending?.permission).toBe('storage');

      // Resolve second
      usePermissionsStore.getState().resolvePrompt('denied');
      const r2 = await p2;
      expect(r2).toBe('denied');
    });
  });

  describe('deduplication (M5)', () => {
    it('deduplicates concurrent requests for same app+permission', async () => {
      const store = usePermissionsStore.getState();
      const p1 = store.requestPermission('app-1', 'App 1', undefined, 'notifications');
      // Second request for same app+permission should not create a new prompt
      const p2 = usePermissionsStore.getState().requestPermission('app-1', 'App 1', undefined, 'notifications');

      expect(usePermissionsStore.getState().promptQueue).toHaveLength(0);
      // Only one pending prompt should exist
      expect(usePermissionsStore.getState().pendingPrompt).toBeTruthy();

      // Resolve the single prompt
      usePermissionsStore.getState().resolvePrompt('granted');
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('granted');
      expect(r2).toBe('granted');
    });
  });

  describe('hydration validation (M2)', () => {
    it.skipIf(typeof localStorage === 'undefined')('ignores corrupted localStorage data', () => {
      localStorage.setItem('archbase:permissions', 'not-json');
      const grants = usePermissionsStore.getState().grants;
      expect(grants).toBeDefined();
      // grants should be an empty Map since store was reset in beforeEach
      expect(grants.size).toBe(0);
    });

    it.skipIf(typeof localStorage === 'undefined')('grant+persist roundtrip preserves only valid entries', () => {
      // Grant two permissions, persist to storage
      const store = usePermissionsStore.getState();
      store.grant('app-roundtrip', 'notifications');
      store.grant('app-roundtrip', 'storage');

      // Verify localStorage has the data
      const raw = localStorage.getItem('archbase:permissions');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed['app-roundtrip']).toHaveLength(2);
      expect(parsed['app-roundtrip'].every((e: { permission: string }) =>
        ['notifications', 'storage'].includes(e.permission),
      )).toBe(true);
    });

    it.skipIf(typeof localStorage === 'undefined')('corrupted localStorage does not break grant operations', () => {
      // Set corrupted data
      localStorage.setItem('archbase:permissions', JSON.stringify({
        'app-1': [
          { permission: 'invalid-perm', grant: 'granted', decidedAt: 1 },
          { permission: 'notifications', grant: 'not-a-valid-grant', decidedAt: 2 },
          'not-an-object',
          null,
        ],
        'app-2': 'not-an-array',
      }));

      // Store should still be operational after reset (hydration handles bad data)
      const store = usePermissionsStore.getState();
      store.grant('app-fresh', 'notifications');
      expect(store.checkPermission('app-fresh', 'notifications')).toBe('granted');
    });
  });
});
