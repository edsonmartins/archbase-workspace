import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CollaborationClient } from '../CollaborationClient';
import type { CollaborationMessage, CollaborationTransport } from '@archbase/workspace-types';

/**
 * Mock transport for testing without a real WebSocket server.
 */
function createMockTransport(): CollaborationTransport & {
  simulateMessage: (msg: CollaborationMessage) => void;
  simulateDisconnect: () => void;
} {
  const messageHandlers = new Set<(message: CollaborationMessage) => void>();
  const disconnectHandlers = new Set<() => void>();
  let connected = false;

  return {
    get connected() {
      return connected;
    },
    async connect() {
      connected = true;
    },
    disconnect() {
      connected = false;
    },
    send: vi.fn(),
    onMessage(handler) {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    onDisconnect(handler) {
      disconnectHandlers.add(handler);
      return () => disconnectHandlers.delete(handler);
    },
    simulateMessage(msg: CollaborationMessage) {
      for (const handler of messageHandlers) handler(msg);
    },
    simulateDisconnect() {
      connected = false;
      for (const handler of disconnectHandlers) handler();
    },
  };
}

describe('CollaborationClient', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let client: CollaborationClient;
  let stateEvents: Array<{ type: string }>;

  beforeEach(() => {
    transport = createMockTransport();
    stateEvents = [];
    client = new CollaborationClient({
      transport,
      serverUrl: 'ws://localhost:4000',
      user: { id: 'user-1', displayName: 'Test', color: '#3b82f6' },
      onStateChange: (event) => stateEvents.push(event),
    });
  });

  afterEach(() => {
    client.destroy();
  });

  it('starts disconnected', () => {
    expect(client.isConnected).toBe(false);
    expect(client.getCurrentRoom()).toBeNull();
  });

  it('joins a room successfully', async () => {
    await client.join('test-room');

    expect(client.isConnected).toBe(true);
    expect(stateEvents[0]).toEqual({
      type: 'connected',
      roomId: 'test-room',
      user: expect.objectContaining({ id: 'user-1' }),
    });
  });

  it('sends sync-step1 on join', async () => {
    await client.join('room-1');

    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sync-step1', roomId: 'room-1' }),
    );
  });

  it('leaves a room', async () => {
    await client.join('room-1');
    client.leave();

    expect(client.isConnected).toBe(false);
    const disconnected = stateEvents.find((e) => e.type === 'disconnected');
    expect(disconnected).toBeDefined();
  });

  it('handles room-joined message', async () => {
    await client.join('room-1');
    stateEvents.length = 0;

    transport.simulateMessage({
      type: 'room-joined',
      roomId: 'room-1',
      payload: {
        user: { id: 'user-2', displayName: 'Alice', color: '#ef4444' },
      },
    });

    expect(stateEvents).toContainEqual(
      expect.objectContaining({
        type: 'user-joined',
        user: expect.objectContaining({ id: 'user-2' }),
      }),
    );
  });

  it('handles room-left message', async () => {
    await client.join('room-1');

    // First add a user
    transport.simulateMessage({
      type: 'room-joined',
      roomId: 'room-1',
      payload: { user: { id: 'user-2', displayName: 'Alice', color: '#ef4444' } },
    });

    stateEvents.length = 0;

    transport.simulateMessage({
      type: 'room-left',
      roomId: 'room-1',
      payload: { userId: 'user-2' },
    });

    expect(stateEvents).toContainEqual(
      expect.objectContaining({ type: 'user-left', userId: 'user-2' }),
    );
  });

  it('handles room-info with existing users', async () => {
    await client.join('room-1');
    stateEvents.length = 0;

    transport.simulateMessage({
      type: 'room-info',
      roomId: 'room-1',
      payload: {
        users: [
          { id: 'user-2', displayName: 'Alice', color: '#ef4444' },
          { id: 'user-3', displayName: 'Bob', color: '#22c55e' },
        ],
      },
    });

    const joined = stateEvents.filter((e) => e.type === 'user-joined');
    expect(joined.length).toBe(2);
  });

  it('ignores own messages', async () => {
    await client.join('room-1');
    stateEvents.length = 0;

    // room-joined with own ID should be ignored
    transport.simulateMessage({
      type: 'room-joined',
      roomId: 'room-1',
      payload: { user: { id: 'user-1', displayName: 'Test', color: '#3b82f6' } },
    });

    const joined = stateEvents.filter((e) => e.type === 'user-joined');
    expect(joined.length).toBe(0);
  });

  it('emits disconnected event on transport disconnect', async () => {
    await client.join('room-1');
    stateEvents.length = 0;

    transport.simulateDisconnect();

    expect(stateEvents).toContainEqual({ type: 'disconnected' });
  });

  it('manages follow state', async () => {
    await client.join('room-1');

    client.followUser('user-2');
    expect(client.getFollowState().followingUserId).toBe('user-2');

    client.unfollowUser();
    expect(client.getFollowState().followingUserId).toBeNull();
  });

  it('exposes user identity', () => {
    expect(client.user.id).toBe('user-1');
    expect(client.user.displayName).toBe('Test');
    expect(client.user.color).toBe('#3b82f6');
  });

  it('re-joins when join called while already joined', async () => {
    await client.join('room-1');
    expect(client.isConnected).toBe(true);

    await client.join('room-2');
    expect(client.isConnected).toBe(true);
    expect(client.getCurrentRoom()?.roomId).toBe('room-2');
  });
});
