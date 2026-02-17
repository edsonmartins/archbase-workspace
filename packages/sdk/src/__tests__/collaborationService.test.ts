import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockCollabStore, mockSubscribe } = vi.hoisted(() => {
  const mockCollabStore = {
    connected: true,
    roomId: 'room-1',
    currentUser: { id: 'u1', displayName: 'Alice', color: '#f00' } as { id: string; displayName: string; color: string } | null,
    users: new Map<string, any>(),
    cursors: new Map<string, any>(),
    sharedWindows: new Map<string, any>(),
    followingUserId: null as string | null,
    removeSharedWindow: vi.fn(),
    setFollowing: vi.fn(),
  };
  const mockSubscribe = vi.fn(() => vi.fn());
  return { mockCollabStore, mockSubscribe };
});

vi.mock('@archbase/workspace-state', () => ({
  useCollaborationStore: Object.assign(() => {}, {
    getState: () => mockCollabStore,
    subscribe: mockSubscribe,
  }),
}));

import { createCollaborationService } from '../services/collaborationService';

describe('createCollaborationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to defaults
    mockCollabStore.connected = true;
    mockCollabStore.roomId = 'room-1';
    mockCollabStore.currentUser = { id: 'u1', displayName: 'Alice', color: '#f00' };
    mockCollabStore.users = new Map();
    mockCollabStore.cursors = new Map();
    mockCollabStore.sharedWindows = new Map();
    mockCollabStore.followingUserId = null;
  });

  it('isConnected returns the store connected state', () => {
    const service = createCollaborationService();

    expect(service.isConnected).toBe(true);

    mockCollabStore.connected = false;
    expect(service.isConnected).toBe(false);
  });

  it('currentRoom returns null when not connected (no roomId)', () => {
    mockCollabStore.roomId = '';
    const service = createCollaborationService();

    expect(service.currentRoom).toBeNull();
  });

  it('currentRoom returns null when currentUser is null', () => {
    mockCollabStore.currentUser = null;
    const service = createCollaborationService();

    expect(service.currentRoom).toBeNull();
  });

  it('currentRoom returns room info when connected', () => {
    const otherUser = { id: 'u2', displayName: 'Bob', color: '#0f0' };
    mockCollabStore.users = new Map([
      ['u2', { user: otherUser, status: 'active', joinedAt: 1000 }],
    ]);

    const service = createCollaborationService();
    const room = service.currentRoom;

    expect(room).not.toBeNull();
    expect(room!.roomId).toBe('room-1');
    expect(room!.users).toHaveLength(2); // currentUser + u2
    expect(room!.users[0]).toEqual(mockCollabStore.currentUser);
    expect(room!.users[1]).toEqual(otherUser);
    expect(typeof room!.createdAt).toBe('number');
  });

  it('currentUser returns the store current user', () => {
    const service = createCollaborationService();

    expect(service.currentUser).toEqual({ id: 'u1', displayName: 'Alice', color: '#f00' });
  });

  it('getUsers returns array from users map', () => {
    const presence1 = { user: { id: 'u2', displayName: 'Bob', color: '#0f0' }, status: 'active' as const, joinedAt: 1000 };
    const presence2 = { user: { id: 'u3', displayName: 'Charlie', color: '#00f' }, status: 'idle' as const, joinedAt: 2000 };
    mockCollabStore.users = new Map<string, any>([
      ['u2', presence1],
      ['u3', presence2],
    ]);

    const service = createCollaborationService();
    const users = service.getUsers();

    expect(users).toHaveLength(2);
    expect(users).toEqual([presence1, presence2]);
  });

  it('followUser calls setFollowing with userId', () => {
    const service = createCollaborationService();

    service.followUser('u2');

    expect(mockCollabStore.setFollowing).toHaveBeenCalledWith('u2');
  });

  it('unfollowUser calls setFollowing with null', () => {
    const service = createCollaborationService();

    service.unfollowUser();

    expect(mockCollabStore.setFollowing).toHaveBeenCalledWith(null);
  });

  it('getSharedWindows returns array from sharedWindows map', () => {
    const sharedInfo1 = { windowId: 'w1', sharedBy: 'u1', mode: 'view' as const, participants: ['u2'] };
    const sharedInfo2 = { windowId: 'w2', sharedBy: 'u2', mode: 'edit' as const, participants: ['u1', 'u3'] };
    mockCollabStore.sharedWindows = new Map<string, any>([
      ['w1', sharedInfo1],
      ['w2', sharedInfo2],
    ]);

    const service = createCollaborationService();
    const shared = service.getSharedWindows();

    expect(shared).toHaveLength(2);
    expect(shared).toEqual([sharedInfo1, sharedInfo2]);
  });

  it('unshareWindow calls removeSharedWindow', () => {
    const service = createCollaborationService();

    service.unshareWindow('w1');

    expect(mockCollabStore.removeSharedWindow).toHaveBeenCalledWith('w1');
  });

  it('getFollowState returns the current follow state', () => {
    mockCollabStore.followingUserId = 'u2';
    const service = createCollaborationService();

    const state = service.getFollowState();

    expect(state).toEqual({ followingUserId: 'u2' });
  });

  it('onUserJoined subscribes to store changes', () => {
    const service = createCollaborationService();
    const handler = vi.fn();

    const unsubscribe = service.onUserJoined(handler);

    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.any(Function), // selector
      expect.any(Function), // listener
    );
    expect(typeof unsubscribe).toBe('function');
  });

  it('onUserLeft subscribes to store changes', () => {
    const service = createCollaborationService();
    const handler = vi.fn();

    const unsubscribe = service.onUserLeft(handler);

    expect(mockSubscribe).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });

  it('onCursorMove subscribes to store changes', () => {
    const service = createCollaborationService();
    const handler = vi.fn();

    const unsubscribe = service.onCursorMove(handler);

    expect(mockSubscribe).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });
});
