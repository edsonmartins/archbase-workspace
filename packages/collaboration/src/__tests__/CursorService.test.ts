import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CursorService } from '../services/CursorService';
import type { CollaborationUser, CursorPosition } from '@archbase/workspace-types';

const testUser: CollaborationUser = {
  id: 'user-1',
  displayName: 'Test User',
  color: '#3b82f6',
};

describe('CursorService', () => {
  let service: CursorService;
  let onLocalCursorUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onLocalCursorUpdate = vi.fn();
    service = new CursorService({
      user: testUser,
      onLocalCursorUpdate,
    });
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  it('broadcasts local cursor at 30fps interval', () => {
    service.start();

    // After 33ms, should have broadcast once
    vi.advanceTimersByTime(33);
    expect(onLocalCursorUpdate).toHaveBeenCalledTimes(1);

    const cursor = onLocalCursorUpdate.mock.calls[0][0] as CursorPosition;
    expect(cursor.x).toBe(0);
    expect(cursor.y).toBe(0);
    expect(cursor.visible).toBe(true);
  });

  it('stops broadcasting when stopped', () => {
    service.start();
    vi.advanceTimersByTime(33); // 1st broadcast at (0,0) — dirty flag triggers initial
    expect(onLocalCursorUpdate).toHaveBeenCalledTimes(1);

    service.stop();

    // After stop, even after many intervals, no more broadcasts
    vi.advanceTimersByTime(200);
    expect(onLocalCursorUpdate).toHaveBeenCalledTimes(1);
  });

  it('handles remote cursor updates', () => {
    const handler = vi.fn();
    service.onRemoteCursor(handler);

    const remoteUser: CollaborationUser = {
      id: 'user-2',
      displayName: 'Remote User',
      color: '#ef4444',
    };

    const cursor: CursorPosition = { x: 100, y: 200, visible: true };
    service.handleRemoteCursorUpdate(remoteUser, cursor);

    expect(handler).toHaveBeenCalledTimes(1);
    const remoteCursor = handler.mock.calls[0][0];
    expect(remoteCursor.user.id).toBe('user-2');
    expect(remoteCursor.cursor.x).toBe(100);
    expect(remoteCursor.cursor.y).toBe(200);
    expect(remoteCursor.lastUpdate).toBeDefined();
  });

  it('allows unsubscribing from remote cursor events', () => {
    const handler = vi.fn();
    const unsub = service.onRemoteCursor(handler);

    const cursor: CursorPosition = { x: 0, y: 0, visible: true };
    service.handleRemoteCursorUpdate(testUser, cursor);
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    service.handleRemoteCursorUpdate(testUser, cursor);
    expect(handler).toHaveBeenCalledTimes(1); // no additional call
  });

  it('does not start twice', () => {
    service.start();
    service.start(); // should be a no-op

    vi.advanceTimersByTime(33);
    expect(onLocalCursorUpdate).toHaveBeenCalledTimes(1); // only one interval
  });

  it('notifies multiple remote cursor listeners', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    service.onRemoteCursor(handler1);
    service.onRemoteCursor(handler2);

    const cursor: CursorPosition = { x: 50, y: 50, visible: true };
    service.handleRemoteCursorUpdate(testUser, cursor);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
