import * as Y from 'yjs';
import type { WebSocket } from 'ws';

const CURSOR_PALETTE = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

interface Client {
  userId: string;
  ws: WebSocket;
  color: string;
  displayName: string;
  isRTC: boolean;
}

/**
 * Represents a single collaboration room.
 * Manages connected clients, Yjs document state, and message broadcasting.
 */
export class Room {
  readonly roomId: string;
  private ydoc: Y.Doc;
  private clients = new Map<string, Client>();
  private colorIndex = 0;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.ydoc = new Y.Doc();
  }

  addClient(userId: string, ws: WebSocket, displayName?: string, isRTC = false): void {
    const color = CURSOR_PALETTE[this.colorIndex % CURSOR_PALETTE.length];
    this.colorIndex++;

    const client: Client = {
      userId,
      ws,
      color,
      displayName: displayName ?? `User ${userId.slice(0, 6)}`,
      isRTC,
    };

    this.clients.set(userId, client);

    // Send initial Yjs state to new client
    const stateUpdate = Y.encodeStateAsUpdate(this.ydoc);
    this.sendToClient(ws, {
      type: 'sync-step2',
      roomId: this.roomId,
      payload: Buffer.from(stateUpdate).toString('base64'),
    });

    // Send room info (existing users) to new client
    const existingUsers = Array.from(this.clients.values())
      .filter((c) => c.userId !== userId)
      .map((c) => ({
        id: c.userId,
        displayName: c.displayName,
        color: c.color,
      }));

    this.sendToClient(ws, {
      type: 'room-info',
      roomId: this.roomId,
      payload: {
        users: existingUsers,
        assignedColor: color,
      },
    });

    // Notify others about new user
    this.broadcastExcept(userId, {
      type: 'room-joined',
      roomId: this.roomId,
      payload: {
        user: {
          id: userId,
          displayName: client.displayName,
          color: client.color,
        },
      },
    });

    // For WebRTC mode: notify new client about existing peers
    if (isRTC) {
      for (const [existingId, existing] of this.clients) {
        if (existingId !== userId && existing.isRTC) {
          this.sendToClient(ws, {
            type: 'peer-joined',
            roomId: this.roomId,
            payload: { userId: existingId },
          });
        }
      }
    }
  }

  removeClient(userId: string): void {
    this.clients.delete(userId);

    // Notify remaining clients
    this.broadcastExcept(userId, {
      type: 'room-left',
      roomId: this.roomId,
      payload: { userId },
    });
  }

  /**
   * Handle a Yjs sync message from a client.
   */
  handleYjsMessage(senderId: string, type: string, payload: Uint8Array): void {
    if (type === 'sync-step1') {
      // Client is requesting our state diff
      const update = Y.encodeStateAsUpdate(this.ydoc, payload);
      const client = this.clients.get(senderId);
      if (client) {
        this.sendToClient(client.ws, {
          type: 'sync-step2',
          roomId: this.roomId,
          payload: Buffer.from(update).toString('base64'),
        });
      }
    } else if (type === 'sync-step2' || type === 'sync-update') {
      // Apply update to server-side Y.Doc
      Y.applyUpdate(this.ydoc, payload);
      // Broadcast to others
      this.broadcastBinaryExcept(senderId, type, payload);
    }
  }

  /**
   * Handle an awareness update from a client.
   */
  handleAwarenessMessage(senderId: string, data: Buffer | ArrayBuffer | string): void {
    // Forward awareness to all other clients
    for (const [userId, client] of this.clients) {
      if (userId !== senderId && client.ws.readyState === 1) {
        client.ws.send(data);
      }
    }
  }

  /**
   * Forward a message to a specific client (for WebRTC signaling).
   */
  forwardToClient(targetId: string, data: Buffer | ArrayBuffer | string): void {
    const client = this.clients.get(targetId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }

  isEmpty(): boolean {
    return this.clients.size === 0;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }

  destroy(): void {
    this.ydoc.destroy();
    this.clients.clear();
  }

  private sendToClient(ws: WebSocket, message: Record<string, unknown>): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastExcept(senderId: string, message: Record<string, unknown>): void {
    const data = JSON.stringify(message);
    for (const [userId, client] of this.clients) {
      if (userId !== senderId && client.ws.readyState === 1) {
        client.ws.send(data);
      }
    }
  }

  private broadcastBinaryExcept(senderId: string, type: string, payload: Uint8Array): void {
    const message = JSON.stringify({
      type,
      roomId: this.roomId,
      payload: Buffer.from(payload).toString('base64'),
    });

    for (const [userId, client] of this.clients) {
      if (userId !== senderId && client.ws.readyState === 1) {
        client.ws.send(message);
      }
    }
  }
}

/**
 * Manages all active collaboration rooms.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();

  getOrCreate(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId);
      this.rooms.set(roomId, room);
    }
    return room;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  destroy(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.destroy();
      this.rooms.delete(roomId);
    }
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getAllRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }
}
