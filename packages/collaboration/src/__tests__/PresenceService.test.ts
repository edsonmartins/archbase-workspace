import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PresenceService } from '../services/PresenceService';
import type { CollaborationUser } from '@archbase/workspace-types';

const testUser: CollaborationUser = {
  id: 'user-1',
  displayName: 'Test User',
  color: '#3b82f6',
};

describe('PresenceService', () => {
  let service: PresenceService;
  let onStatusChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onStatusChange = vi.fn();
    service = new PresenceService({
      user: testUser,
      onStatusChange,
    });
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  it('starts with active status', () => {
    service.start();
    expect(service.getStatus()).toBe('active');
  });

  it('manually sets status', () => {
    service.start();
    service.setStatus('idle');
    expect(service.getStatus()).toBe('idle');
    expect(onStatusChange).toHaveBeenCalledWith('idle');
  });

  it('does not emit when setting same status', () => {
    service.start();
    service.setStatus('active');
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('tracks remote user joined', () => {
    const remoteUser: CollaborationUser = {
      id: 'user-2',
      displayName: 'Remote',
      color: '#ef4444',
    };

    const handler = vi.fn();
    service.onUserJoined(handler);

    service.handleUserJoined(remoteUser, Date.now());
    expect(handler).toHaveBeenCalledWith(remoteUser);

    const users = service.getUsers();
    expect(users.length).toBe(1);
    expect(users[0].user.id).toBe('user-2');
    expect(users[0].status).toBe('active');
  });

  it('tracks remote user left', () => {
    const remoteUser: CollaborationUser = {
      id: 'user-2',
      displayName: 'Remote',
      color: '#ef4444',
    };

    service.handleUserJoined(remoteUser, Date.now());
    expect(service.getUsers().length).toBe(1);

    const handler = vi.fn();
    service.onUserLeft(handler);

    service.handleUserLeft('user-2');
    expect(handler).toHaveBeenCalledWith('user-2');
    expect(service.getUsers().length).toBe(0);
  });

  it('updates remote user presence', () => {
    const remoteUser: CollaborationUser = {
      id: 'user-2',
      displayName: 'Remote',
      color: '#ef4444',
    };

    service.handleUserJoined(remoteUser, Date.now());
    service.handleRemotePresenceUpdate('user-2', 'idle', 'win-1');

    const user = service.getUser('user-2');
    expect(user?.status).toBe('idle');
    expect(user?.focusedWindowId).toBe('win-1');
  });

  it('allows unsubscribing from events', () => {
    const handler = vi.fn();
    const unsub = service.onUserJoined(handler);

    service.handleUserJoined({ id: 'a', displayName: 'A', color: '#000' }, Date.now());
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    service.handleUserJoined({ id: 'b', displayName: 'B', color: '#000' }, Date.now());
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
