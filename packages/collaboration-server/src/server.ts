import { WebSocketServer, type WebSocket } from 'ws';
import { RoomManager } from './RoomManager';
import { SignalingService } from './SignalingService';

const PORT = Number(process.env.PORT) || 4000;
const rooms = new RoomManager();
const signaling = new SignalingService();

const wss = new WebSocketServer({ port: PORT });

console.log(`[Archbase Collaboration Server] Listening on port ${PORT}`);

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const roomId = url.searchParams.get('room');
  const userId = url.searchParams.get('user');
  const mode = url.searchParams.get('mode'); // 'rtc' for signaling-only
  const displayName = url.searchParams.get('name') ?? undefined;

  if (!roomId || !userId) {
    ws.close(4000, 'Missing room or user parameter');
    return;
  }

  const room = rooms.getOrCreate(roomId);
  room.addClient(userId, ws, displayName, mode === 'rtc');

  console.log(
    `[Room:${roomId}] User ${userId} joined (${mode === 'rtc' ? 'WebRTC' : 'WebSocket'} mode). ` +
    `Clients: ${room.getClientCount()}`,
  );

  ws.on('message', (data: Buffer) => {
    try {
      const text = data.toString('utf-8');
      const message = JSON.parse(text);

      if (!message.type) return;

      // WebRTC signaling
      if (signaling.isSignalingMessage(message.type)) {
        signaling.handleSignaling(room, userId, message, text);
        return;
      }

      // Yjs sync messages
      if (message.type === 'sync-step1' || message.type === 'sync-step2' || message.type === 'sync-update') {
        const payload = message.payload
          ? Buffer.from(message.payload, 'base64')
          : Buffer.alloc(0);
        room.handleYjsMessage(userId, message.type, payload);
        return;
      }

      // Awareness updates
      if (message.type === 'awareness-update') {
        room.handleAwarenessMessage(userId, data);
        return;
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    room.removeClient(userId);
    console.log(
      `[Room:${roomId}] User ${userId} left. Clients: ${room.getClientCount()}`,
    );

    if (room.isEmpty()) {
      rooms.destroy(roomId);
      console.log(`[Room:${roomId}] Destroyed (empty).`);
    }
  });

  ws.on('error', (err) => {
    console.error(`[Room:${roomId}] WebSocket error for ${userId}:`, err.message);
  });
});

// Graceful shutdown
function shutdown() {
  console.log('\n[Archbase Collaboration Server] Shutting down...');
  wss.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
