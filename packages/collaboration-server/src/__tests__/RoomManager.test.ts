import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Room, RoomManager } from '../RoomManager';

// Mock WebSocket
function createMockWs() {
  return {
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
  } as any;
}

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  it('creates a room on getOrCreate', () => {
    const room = manager.getOrCreate('room-1');
    expect(room).toBeDefined();
    expect(room.roomId).toBe('room-1');
    expect(manager.getRoomCount()).toBe(1);
  });

  it('returns same room on repeated getOrCreate', () => {
    const room1 = manager.getOrCreate('room-1');
    const room2 = manager.getOrCreate('room-1');
    expect(room1).toBe(room2);
    expect(manager.getRoomCount()).toBe(1);
  });

  it('destroys a room', () => {
    manager.getOrCreate('room-1');
    expect(manager.getRoomCount()).toBe(1);

    manager.destroy('room-1');
    expect(manager.getRoomCount()).toBe(0);
    expect(manager.get('room-1')).toBeUndefined();
  });

  it('lists all room IDs', () => {
    manager.getOrCreate('room-1');
    manager.getOrCreate('room-2');

    const ids = manager.getAllRoomIds().sort();
    expect(ids).toEqual(['room-1', 'room-2']);
  });
});

describe('Room', () => {
  let room: Room;

  beforeEach(() => {
    room = new Room('test-room');
  });

  it('starts empty', () => {
    expect(room.isEmpty()).toBe(true);
    expect(room.getClientCount()).toBe(0);
  });

  it('adds a client', () => {
    const ws = createMockWs();
    room.addClient('user-1', ws, 'Alice');

    expect(room.isEmpty()).toBe(false);
    expect(room.getClientCount()).toBe(1);
    expect(room.getClientIds()).toContain('user-1');
  });

  it('sends sync-step2 and room-info on join', () => {
    const ws = createMockWs();
    room.addClient('user-1', ws, 'Alice');

    // Should have sent sync-step2 and room-info
    expect(ws.send).toHaveBeenCalledTimes(2);

    const calls = ws.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
    expect(calls[0].type).toBe('sync-step2');
    expect(calls[1].type).toBe('room-info');
    expect(calls[1].payload.assignedColor).toBeDefined();
  });

  it('notifies existing clients when a new user joins', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();

    room.addClient('user-1', ws1, 'Alice');
    ws1.send.mockClear();

    room.addClient('user-2', ws2, 'Bob');

    // ws1 should have received room-joined for user-2
    const calls = ws1.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
    const joinMsg = calls.find((c: any) => c.type === 'room-joined');
    expect(joinMsg).toBeDefined();
    expect(joinMsg.payload.user.id).toBe('user-2');
  });

  it('removes a client and notifies others', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();

    room.addClient('user-1', ws1, 'Alice');
    room.addClient('user-2', ws2, 'Bob');
    ws1.send.mockClear();

    room.removeClient('user-2');

    expect(room.getClientCount()).toBe(1);

    const calls = ws1.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
    const leftMsg = calls.find((c: any) => c.type === 'room-left');
    expect(leftMsg).toBeDefined();
    expect(leftMsg.payload.userId).toBe('user-2');
  });

  it('assigns different colors to different users', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();

    room.addClient('user-1', ws1);
    room.addClient('user-2', ws2);

    // Check room-info for user-2 has a different color than user-1
    const info1 = JSON.parse(ws1.send.mock.calls[1][0]).payload.assignedColor;
    const info2 = JSON.parse(ws2.send.mock.calls[1][0]).payload.assignedColor;
    expect(info1).not.toBe(info2);
  });

  it('forwards awareness messages to other clients', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    const ws3 = createMockWs();

    room.addClient('user-1', ws1);
    room.addClient('user-2', ws2);
    room.addClient('user-3', ws3);

    ws2.send.mockClear();
    ws3.send.mockClear();

    const data = Buffer.from('awareness-data');
    room.handleAwarenessMessage('user-1', data);

    // user-2 and user-3 should receive the message, but not user-1
    expect(ws2.send).toHaveBeenCalledTimes(1);
    expect(ws3.send).toHaveBeenCalledTimes(1);
  });

  it('forwards to specific client', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();

    room.addClient('user-1', ws1);
    room.addClient('user-2', ws2);

    ws2.send.mockClear();

    room.forwardToClient('user-2', 'hello');
    expect(ws2.send).toHaveBeenCalledWith('hello');
  });

  it('does not forward to disconnected clients', () => {
    const ws = createMockWs();
    // Start with OPEN so addClient sends initial messages
    room.addClient('user-1', ws);
    const callsAfterAdd = ws.send.mock.calls.length;
    expect(callsAfterAdd).toBe(2); // sync-step2 + room-info

    // Now mark as CLOSED
    ws.readyState = 3;
    room.forwardToClient('user-1', 'hello');
    // No additional calls because ws is closed
    expect(ws.send.mock.calls.length).toBe(callsAfterAdd);
  });

  it('isEmpty returns true after all clients removed', () => {
    const ws = createMockWs();
    room.addClient('user-1', ws);
    expect(room.isEmpty()).toBe(false);

    room.removeClient('user-1');
    expect(room.isEmpty()).toBe(true);
  });
});
