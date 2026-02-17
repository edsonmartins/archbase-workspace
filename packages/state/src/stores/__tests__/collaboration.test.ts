import { describe, it, expect, beforeEach } from 'vitest';
import { useCollaborationStore } from '../collaboration';

describe('useCollaborationStore', () => {
  beforeEach(() => {
    useCollaborationStore.getState().reset();
  });

  it('starts disconnected', () => {
    const state = useCollaborationStore.getState();
    expect(state.connected).toBe(false);
    expect(state.roomId).toBeNull();
    expect(state.currentUser).toBeNull();
    expect(state.users.size).toBe(0);
    expect(state.cursors.size).toBe(0);
  });

  it('sets connected state', () => {
    const user = { id: 'u1', displayName: 'User 1', color: '#3b82f6' };
    useCollaborationStore.getState().setConnected(true, 'room-1', user);

    const state = useCollaborationStore.getState();
    expect(state.connected).toBe(true);
    expect(state.roomId).toBe('room-1');
    expect(state.currentUser?.id).toBe('u1');
  });

  it('adds and removes users', () => {
    const user = { id: 'u2', displayName: 'User 2', color: '#ef4444' };
    const presence = { user, status: 'active' as const, joinedAt: Date.now() };

    useCollaborationStore.getState().updateUser('u2', presence);
    expect(useCollaborationStore.getState().users.size).toBe(1);
    expect(useCollaborationStore.getState().users.get('u2')?.user.displayName).toBe('User 2');

    useCollaborationStore.getState().removeUser('u2');
    expect(useCollaborationStore.getState().users.size).toBe(0);
  });

  it('updates and removes cursors', () => {
    const cursor = {
      user: { id: 'u2', displayName: 'User 2', color: '#ef4444' },
      cursor: { x: 100, y: 200, visible: true },
      lastUpdate: Date.now(),
    };

    useCollaborationStore.getState().updateCursor('u2', cursor);
    expect(useCollaborationStore.getState().cursors.size).toBe(1);

    useCollaborationStore.getState().removeCursor('u2');
    expect(useCollaborationStore.getState().cursors.size).toBe(0);
  });

  it('removing user also removes their cursor', () => {
    const user = { id: 'u2', displayName: 'User 2', color: '#ef4444' };
    const presence = { user, status: 'active' as const, joinedAt: Date.now() };
    const cursor = {
      user,
      cursor: { x: 100, y: 200, visible: true },
      lastUpdate: Date.now(),
    };

    useCollaborationStore.getState().updateUser('u2', presence);
    useCollaborationStore.getState().updateCursor('u2', cursor);

    expect(useCollaborationStore.getState().users.size).toBe(1);
    expect(useCollaborationStore.getState().cursors.size).toBe(1);

    useCollaborationStore.getState().removeUser('u2');
    expect(useCollaborationStore.getState().users.size).toBe(0);
    expect(useCollaborationStore.getState().cursors.size).toBe(0);
  });

  it('manages shared windows', () => {
    const info = {
      windowId: 'win-1',
      sharedBy: 'u1',
      mode: 'edit' as const,
      participants: ['u1'],
    };

    useCollaborationStore.getState().addSharedWindow(info);
    expect(useCollaborationStore.getState().sharedWindows.size).toBe(1);
    expect(useCollaborationStore.getState().sharedWindows.get('win-1')?.sharedBy).toBe('u1');

    useCollaborationStore.getState().removeSharedWindow('win-1');
    expect(useCollaborationStore.getState().sharedWindows.size).toBe(0);
  });

  it('sets follow state', () => {
    useCollaborationStore.getState().setFollowing('u2');
    expect(useCollaborationStore.getState().followingUserId).toBe('u2');

    useCollaborationStore.getState().setFollowing(null);
    expect(useCollaborationStore.getState().followingUserId).toBeNull();
  });

  it('resets all state', () => {
    const user = { id: 'u1', displayName: 'User 1', color: '#3b82f6' };
    useCollaborationStore.getState().setConnected(true, 'room-1', user);
    useCollaborationStore.getState().updateUser('u2', {
      user: { id: 'u2', displayName: 'User 2', color: '#ef4444' },
      status: 'active',
      joinedAt: Date.now(),
    });
    useCollaborationStore.getState().setFollowing('u2');

    useCollaborationStore.getState().reset();

    const state = useCollaborationStore.getState();
    expect(state.connected).toBe(false);
    expect(state.roomId).toBeNull();
    expect(state.users.size).toBe(0);
    expect(state.followingUserId).toBeNull();
  });
});
