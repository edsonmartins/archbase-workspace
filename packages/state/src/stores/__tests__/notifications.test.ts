import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationsStore, MAX_HISTORY } from '../notifications';

function getState() {
  return useNotificationsStore.getState();
}

describe('Notifications Store', () => {
  beforeEach(() => {
    useNotificationsStore.setState({ notifications: new Map(), history: [] });
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

  describe('history', () => {
    it('starts with empty history', () => {
      expect(getState().history).toEqual([]);
    });

    it('dismiss moves notification to history', () => {
      const id = getState().notify({ type: 'info', title: 'Test' });
      getState().dismiss(id);
      expect(getState().notifications.size).toBe(0);
      expect(getState().history.length).toBe(1);
      expect(getState().history[0].title).toBe('Test');
    });

    it('dismiss sets dismissedAt timestamp', () => {
      const id = getState().notify({ type: 'info', title: 'Test' });
      const before = Date.now();
      getState().dismiss(id);
      const after = Date.now();
      const entry = getState().history[0];
      expect(entry.dismissedAt).toBeGreaterThanOrEqual(before);
      expect(entry.dismissedAt).toBeLessThanOrEqual(after);
    });

    it('dismissAll moves all notifications to history', () => {
      getState().notify({ type: 'info', title: 'A' });
      getState().notify({ type: 'success', title: 'B' });
      getState().notify({ type: 'error', title: 'C' });
      getState().dismissAll();
      expect(getState().notifications.size).toBe(0);
      expect(getState().history.length).toBe(3);
    });

    it('dismissAll sets dismissedAt on all entries', () => {
      getState().notify({ type: 'info', title: 'A' });
      getState().notify({ type: 'info', title: 'B' });
      getState().dismissAll();
      for (const entry of getState().history) {
        expect(entry.dismissedAt).toBeDefined();
        expect(typeof entry.dismissedAt).toBe('number');
      }
    });

    it('history is limited to MAX_HISTORY', () => {
      for (let i = 0; i < MAX_HISTORY + 10; i++) {
        const id = getState().notify({ type: 'info', title: `N${i}` });
        getState().dismiss(id);
      }
      expect(getState().history.length).toBe(MAX_HISTORY);
    });

    it('clearHistory empties the history array', () => {
      const id = getState().notify({ type: 'info', title: 'Test' });
      getState().dismiss(id);
      expect(getState().history.length).toBe(1);
      getState().clearHistory();
      expect(getState().history.length).toBe(0);
    });

    it('multiple dismiss calls accumulate in history', () => {
      const id1 = getState().notify({ type: 'info', title: 'A' });
      const id2 = getState().notify({ type: 'success', title: 'B' });
      getState().dismiss(id1);
      getState().dismiss(id2);
      expect(getState().history.length).toBe(2);
      expect(getState().history[0].title).toBe('B');
      expect(getState().history[1].title).toBe('A');
    });

    it('dismissAll on empty notifications does not add to history', () => {
      getState().dismissAll();
      expect(getState().history.length).toBe(0);
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
