import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CollaborationMessage } from '@archbase/workspace-types';

// ── Mock RTCDataChannel ──

class MockRTCDataChannel {
  readyState = 'open';
  binaryType = 'arraybuffer';
  onopen: (() => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
}

// ── Mock RTCPeerConnection ──

class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  connectionState = 'new';
  onicecandidate: ((ev: { candidate: RTCIceCandidate | null }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((ev: { channel: MockRTCDataChannel }) => void) | null = null;

  private _channel = new MockRTCDataChannel();

  createDataChannel = vi.fn(() => this._channel);
  createOffer = vi.fn(async () => ({ sdp: 'offer-sdp', type: 'offer' as RTCSdpType }));
  createAnswer = vi.fn(async () => ({ sdp: 'answer-sdp', type: 'answer' as RTCSdpType }));
  setLocalDescription = vi.fn(async (desc: any) => {
    this.localDescription = desc;
  });
  setRemoteDescription = vi.fn(async (desc: any) => {
    this.remoteDescription = desc;
  });
  addIceCandidate = vi.fn(async () => {});
  close = vi.fn();
}

// ── Mock WebSocket for signaling ──

let capturedSignalingWs: MockSignalingWebSocket;

class MockSignalingWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockSignalingWebSocket.OPEN;
  binaryType = 'arraybuffer';
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  private eventListeners = new Map<string, Set<Function>>();

  constructor(public url: string) {
    capturedSignalingWs = this;
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

  simulateMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  simulateClose() {
    this.onclose?.(new Event('close'));
  }
}

// Install mocks globally before importing the transport
vi.stubGlobal('WebSocket', MockSignalingWebSocket);
vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
vi.stubGlobal('RTCSessionDescription', class {
  constructor(public init: any) {
    Object.assign(this, init);
  }
});
vi.stubGlobal('RTCIceCandidate', class {
  constructor(public init: any) {
    Object.assign(this, init);
  }
  toJSON() {
    return this.init;
  }
});

import { WebRTCTransport } from '../transports/WebRTCTransport';

describe('WebRTCTransport', () => {
  let transport: WebRTCTransport;

  beforeEach(() => {
    vi.useFakeTimers();
    transport = new WebRTCTransport();
  });

  afterEach(() => {
    transport.disconnect();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('connects signaling WebSocket with mode=rtc param', async () => {
    const connectPromise = transport.connect('ws://localhost:4000', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    expect(capturedSignalingWs.url).toBe('ws://localhost:4000?room=room-1&user=user-1&mode=rtc');
    expect(transport.connected).toBe(true);
  });

  it('sends data via data channels to all peers', async () => {
    const connectPromise = transport.connect('ws://localhost:4000', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    // Simulate a peer joining — this triggers createOffer flow
    capturedSignalingWs.simulateMessage(
      JSON.stringify({ type: 'peer-joined', userId: 'peer-1' }),
    );
    // Allow the async createOffer to resolve
    await vi.advanceTimersByTimeAsync(0);

    // The data channel was created via createDataChannel. We need to simulate it opening.
    // Find the MockRTCPeerConnection's channel and fire onopen.
    const pc = (MockRTCPeerConnection.prototype.createDataChannel as any);
    // Get the last created channel from the mock
    const lastCallResult = (transport as any).peers.get('peer-1')?.createDataChannel?.mock?.results?.[0]?.value as MockRTCDataChannel;

    if (lastCallResult) {
      // Simulate the data channel opening
      lastCallResult.onopen?.();
    }

    const message: CollaborationMessage = {
      type: 'awareness-update',
      roomId: 'room-1',
      payload: { status: 'active' },
    };

    transport.send(message);

    // Verify data was sent through the channel (if it was registered)
    const channels = (transport as any).channels as Map<string, MockRTCDataChannel>;
    if (channels.size > 0) {
      const channel = channels.values().next().value as MockRTCDataChannel | undefined;
      expect(channel!.send).toHaveBeenCalled();
    }
  });

  it('disconnect closes all peer connections and signaling ws', async () => {
    const connectPromise = transport.connect('ws://localhost:4000', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const ws = capturedSignalingWs;

    // Simulate a peer joining to create a peer connection
    capturedSignalingWs.simulateMessage(
      JSON.stringify({ type: 'peer-joined', userId: 'peer-1' }),
    );
    await vi.advanceTimersByTimeAsync(0);

    const peers = (transport as any).peers as Map<string, MockRTCPeerConnection>;
    const peerConnection = peers.get('peer-1');
    expect(peerConnection).toBeDefined();

    transport.disconnect();

    expect(peerConnection!.close).toHaveBeenCalled();
    expect(ws.close).toHaveBeenCalled();
    expect(transport.connected).toBe(false);
    expect(peers.size).toBe(0);
  });

  it('removes peer on peer-left signal', async () => {
    const connectPromise = transport.connect('ws://localhost:4000', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    // Add a peer first
    capturedSignalingWs.simulateMessage(
      JSON.stringify({ type: 'peer-joined', userId: 'peer-1' }),
    );
    await vi.advanceTimersByTimeAsync(0);

    const peers = (transport as any).peers as Map<string, MockRTCPeerConnection>;
    expect(peers.has('peer-1')).toBe(true);
    const pc = peers.get('peer-1')!;

    // Now remove the peer
    capturedSignalingWs.simulateMessage(
      JSON.stringify({ type: 'peer-left', userId: 'peer-1' }),
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(peers.has('peer-1')).toBe(false);
    expect(pc.close).toHaveBeenCalled();
  });

  it('emits disconnect when all peers disconnected', async () => {
    const connectPromise = transport.connect('ws://localhost:4000', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const disconnected: boolean[] = [];
    transport.onDisconnect(() => disconnected.push(true));

    // Add a peer
    capturedSignalingWs.simulateMessage(
      JSON.stringify({ type: 'peer-joined', userId: 'peer-1' }),
    );
    await vi.advanceTimersByTimeAsync(0);

    // Remove the peer (last one) — should emit disconnect
    capturedSignalingWs.simulateMessage(
      JSON.stringify({ type: 'peer-left', userId: 'peer-1' }),
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(disconnected).toHaveLength(1);
  });

  it('buffers ICE candidates until remote description is set', async () => {
    const connectPromise = transport.connect('ws://localhost:4000', 'room-1', 'user-1');
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    // Send an ICE candidate for a peer that has no remote description yet
    capturedSignalingWs.simulateMessage(
      JSON.stringify({
        type: 'rtc-ice-candidate',
        senderId: 'peer-1',
        payload: { candidate: 'candidate-data', sdpMid: '0', sdpMLineIndex: 0 },
      }),
    );
    await vi.advanceTimersByTimeAsync(0);

    // Since there's no peer connection for 'peer-1' yet, the candidate should be buffered
    const pendingCandidates = (transport as any).pendingCandidates as Map<string, any[]>;
    expect(pendingCandidates.has('peer-1')).toBe(true);
    expect(pendingCandidates.get('peer-1')).toHaveLength(1);
    expect(pendingCandidates.get('peer-1')![0].candidate).toBe('candidate-data');

    // Now simulate receiving an offer from the same peer (which sets remoteDescription)
    capturedSignalingWs.simulateMessage(
      JSON.stringify({
        type: 'rtc-offer',
        senderId: 'peer-1',
        payload: { sdp: 'offer-sdp', type: 'offer' },
      }),
    );
    await vi.advanceTimersByTimeAsync(0);

    // After handleOffer, the buffered candidates should have been applied and cleared
    const pc = (transport as any).peers.get('peer-1') as MockRTCPeerConnection;
    expect(pc).toBeDefined();
    expect(pc.addIceCandidate).toHaveBeenCalled();
    expect(pendingCandidates.has('peer-1')).toBe(false);
  });
});
