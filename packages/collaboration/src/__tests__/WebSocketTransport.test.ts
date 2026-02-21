import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CollaborationMessage } from '@archbase/workspace-types';

// ── Mock WebSocket ──

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  private eventListeners = new Map<string, Set<Function>>();

  constructor(public url: string) {
    // Auto-fire 'open' event asynchronously
    setTimeout(() => {
      this.eventListeners.get('open')?.forEach((fn) => fn(new Event('open')));
      this.onopen?.(new Event('open'));
    }, 0);
  }

  addEventListener(type: string, fn: Function) {
    if (!this.eventListeners.has(type)) this.eventListeners.set(type, new Set());
    this.eventListeners.get(type)!.add(fn);
  }

  removeEventListener(type: string, fn: Function) {
    this.eventListeners.get(type)?.delete(fn);
  }

  send = vi.fn();
  close = vi.fn();

  // Test helpers
  simulateMessage(data: string) {
    const event = new MessageEvent('message', { data });
    this.onmessage?.(event);
  }

  simulateClose() {
    this.onclose?.(new Event('close'));
  }

  simulateError() {
    this.eventListeners.get('error')?.forEach((fn) => fn(new Event('error')));
    this.onerror?.(new Event('error'));
  }
}

// Install globally before importing the transport
vi.stubGlobal('WebSocket', MockWebSocket);

// Import after mocking WebSocket so the module picks up the mock
import { WebSocketTransport } from '../transports/WebSocketTransport';

// Access the last-created MockWebSocket instance
let capturedWs: MockWebSocket;
const OriginalMockWebSocket = MockWebSocket;
function patchConstructor() {
  vi.stubGlobal(
    'WebSocket',
    class extends OriginalMockWebSocket {
      constructor(url: string) {
        super(url);
        capturedWs = this;
      }
    },
  );
}

describe('WebSocketTransport', () => {
  let transport: WebSocketTransport;

  beforeEach(() => {
    vi.useFakeTimers();
    patchConstructor();
    transport = new WebSocketTransport();
  });

  afterEach(() => {
    transport.disconnect();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('connects with correct URL containing room and user params', async () => {
    const connectPromise = transport.connect('ws://localhost:4100', 'my-room', 'user-1');
    // Flush the setTimeout(0) that fires the 'open' event
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    expect(capturedWs.url).toBe('ws://localhost:4100?room=my-room&user=user-1');
    expect(transport.connected).toBe(true);
  });

  it('sends JSON messages via ws.send', async () => {
    const connectPromise = transport.connect('ws://localhost:4100', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const message: CollaborationMessage = {
      type: 'awareness-update',
      roomId: 'room-1',
      senderId: 'user-1',
      payload: { status: 'active' },
    };

    transport.send(message);

    expect(capturedWs.send).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(capturedWs.send.mock.calls[0][0]);
    expect(sent.type).toBe('awareness-update');
    expect(sent.roomId).toBe('room-1');
    expect(sent.senderId).toBe('user-1');
    expect(sent.payload).toEqual({ status: 'active' });
  });

  it('receives and emits parsed messages', async () => {
    const connectPromise = transport.connect('ws://localhost:4100', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const received: CollaborationMessage[] = [];
    transport.onMessage((msg) => received.push(msg));

    capturedWs.simulateMessage(
      JSON.stringify({
        type: 'room-joined',
        roomId: 'room-1',
        senderId: 'user-2',
        payload: { user: { id: 'user-2', displayName: 'Alice', color: '#ef4444' } },
      }),
    );

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('room-joined');
    expect(received[0].roomId).toBe('room-1');
    expect(received[0].senderId).toBe('user-2');
    expect((received[0].payload as Record<string, unknown>).user).toEqual({
      id: 'user-2',
      displayName: 'Alice',
      color: '#ef4444',
    });
  });

  it('base64-encodes Uint8Array payloads for sync types', async () => {
    const connectPromise = transport.connect('ws://localhost:4100', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const message: CollaborationMessage = {
      type: 'sync-update',
      roomId: 'room-1',
      payload,
    };

    transport.send(message);

    const sent = JSON.parse(capturedWs.send.mock.calls[0][0]);
    expect(sent.type).toBe('sync-update');
    // Payload should be a base64 string, not the raw array
    expect(typeof sent.payload).toBe('string');
    // Verify it decodes back to the same bytes
    const decoded = atob(sent.payload);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5]);
  });

  it('decodes base64 string payloads for sync types on receive', async () => {
    const connectPromise = transport.connect('ws://localhost:4100', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const received: CollaborationMessage[] = [];
    transport.onMessage((msg) => received.push(msg));

    // Base64 of bytes [10, 20, 30]
    const base64Payload = btoa(String.fromCharCode(10, 20, 30));

    capturedWs.simulateMessage(
      JSON.stringify({
        type: 'sync-step1',
        roomId: 'room-1',
        payload: base64Payload,
      }),
    );

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('sync-step1');
    expect(received[0].payload).toBeInstanceOf(Uint8Array);
    expect(Array.from(received[0].payload as Uint8Array)).toEqual([10, 20, 30]);
  });

  it('does not send when disconnected', () => {
    // Transport not connected — send should be silently ignored
    const message: CollaborationMessage = {
      type: 'awareness-update',
      roomId: 'room-1',
      payload: { status: 'active' },
    };

    transport.send(message);
    // No ws was ever created, so nothing to assert on except no error thrown
    expect(transport.connected).toBe(false);
  });

  it('emits disconnect on ws close', async () => {
    const connectPromise = transport.connect('ws://localhost:4100', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const disconnected: boolean[] = [];
    transport.onDisconnect(() => disconnected.push(true));

    capturedWs.simulateClose();

    expect(disconnected).toHaveLength(1);
    expect(transport.connected).toBe(false);
  });

  it('disconnect closes the websocket', async () => {
    const connectPromise = transport.connect('ws://localhost:4100', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const ws = capturedWs;
    transport.disconnect();

    expect(ws.close).toHaveBeenCalled();
    expect(transport.connected).toBe(false);
  });
});
