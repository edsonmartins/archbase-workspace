import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationsStore } from '../notifications';

function getState() {
  return useNotificationsStore.getState();
}

describe('Notifications Store', () => {
  beforeEach(() => {
    useNotificationsStore.setState({ notifications: new Map() });
  });

  describe('notify', () => {
    it('creates a notification with UUID', () => {
      const id = getState().notify({ type: 'info', title: 'Test' });
      expect(id).toBeDefined();
      expect(getState().notifications.size).toBe(1);
      expect(getState().notifications.get(id)?.title).toBe('Test');
    });

    it('sets default duration to 5000', () => {
      const id = getState().notify({ type: 'info', title: 'Test' });
      expect(getState().notifications.get(id)?.duration).toBe(5000);
    });

    it('respects custom duration', () => {
      const id = getState().notify({ type: 'info', title: 'Test', duration: 0 });
      expect(getState().notifications.get(id)?.duration).toBe(0);
    });

    it('sets createdAt timestamp', () => {
      const before = Date.now();
      const id = getState().notify({ type: 'success', title: 'Done' });
      const after = Date.now();
      const createdAt = getState().notifications.get(id)!.createdAt;
      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(after);
    });

    it('defaults dismissible to true', () => {
      const id = getState().notify({ type: 'info', title: 'Test' });
      expect(getState().notifications.get(id)?.dismissible).toBe(true);
    });

    it('respects dismissible: false', () => {
      const id = getState().notify({ type: 'error', title: 'Fatal', dismissible: false });
      expect(getState().notifications.get(id)?.dismissible).toBe(false);
    });

    it('stores message', () => {
      const id = getState().notify({ type: 'warning', title: 'Warn', message: 'Details here' });
      expect(getState().notifications.get(id)?.message).toBe('Details here');
    });

    it('preserves notification type', () => {
      const id = getState().notify({ type: 'error', title: 'Error' });
      expect(getState().notifications.get(id)?.type).toBe('error');
    });

    it('accumulates multiple notifications', () => {
      getState().notify({ type: 'info', title: 'A' });
      getState().notify({ type: 'info', title: 'B' });
      getState().notify({ type: 'info', title: 'C' });
      expect(getState().notifications.size).toBe(3);
    });
  });

  describe('dismiss', () => {
    it('removes a notification', () => {
      const id = getState().notify({ type: 'info', title: 'Test' });
      expect(getState().notifications.size).toBe(1);
      getState().dismiss(id);
      expect(getState().notifications.size).toBe(0);
    });

    it('is no-op for non-existent id', () => {
      getState().notify({ type: 'info', title: 'Test' });
      getState().dismiss('nonexistent');
      expect(getState().notifications.size).toBe(1);
    });
  });

  describe('dismissAll', () => {
    it('clears all notifications', () => {
      getState().notify({ type: 'info', title: 'A' });
      getState().notify({ type: 'success', title: 'B' });
      getState().notify({ type: 'error', title: 'C' });
      expect(getState().notifications.size).toBe(3);

      getState().dismissAll();
      expect(getState().notifications.size).toBe(0);
    });

    it('is no-op when already empty', () => {
      getState().dismissAll();
      expect(getState().notifications.size).toBe(0);
    });
  });

  describe('eviction', () => {
    it('evicts oldest entries when exceeding MAX_NOTIFICATIONS (100)', () => {
      // Add 102 notifications
      const ids: string[] = [];
      for (let i = 0; i < 102; i++) {
        ids.push(getState().notify({ type: 'info', title: `N${i}` }));
      }
      // Should have at most 100
      expect(getState().notifications.size).toBe(100);
      // Oldest two should be gone
      expect(getState().notifications.has(ids[0])).toBe(false);
      expect(getState().notifications.has(ids[1])).toBe(false);
      // Newest should still be present
      expect(getState().notifications.has(ids[101])).toBe(true);
    });
  });
});
