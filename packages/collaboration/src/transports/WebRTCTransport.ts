import type { CollaborationMessage } from '@archbase/workspace-types';
import { AbstractTransport } from './Transport';
import { encodeMessage, decodeMessage } from '../utils/encoding';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CHANNEL_LABEL = 'archbase-collab';

/**
 * WebRTC data channel transport for P2P collaboration.
 * Uses WebSocket only for signaling (SDP offer/answer + ICE candidates).
 * All collaboration data flows peer-to-peer via RTCDataChannel.
 */
export class WebRTCTransport extends AbstractTransport {
  private signalingWs: WebSocket | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private channels = new Map<string, RTCDataChannel>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

  protected async doConnect(url: string, roomId: string, userId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const wsUrl = `${url}?room=${encodeURIComponent(roomId)}&user=${encodeURIComponent(userId)}&mode=rtc`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      const onOpen = () => {
        cleanup();
        this.signalingWs = ws;
        this.setupSignalingListeners(ws, userId);
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error('WebRTC signaling connection failed'));
      };

      const cleanup = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
      };

      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onError);
    });
  }

  protected doDisconnect(): void {
    // Close all peer connections
    for (const pc of this.peers.values()) {
      pc.close();
    }
    this.peers.clear();
    this.channels.clear();
    this.pendingCandidates.clear();

    // Close signaling WS
    if (this.signalingWs) {
      this.signalingWs.onclose = null;
      this.signalingWs.onmessage = null;
      this.signalingWs.close();
      this.signalingWs = null;
    }
  }

  protected doSend(message: CollaborationMessage): void {
    const encoded = encodeMessage(message);
    for (const channel of this.channels.values()) {
      if (channel.readyState === 'open') {
        channel.send(encoded);
      }
    }
  }

  private setupSignalingListeners(ws: WebSocket, localUserId: string): void {
    ws.onmessage = async (event: MessageEvent) => {
      try {
        const signal = JSON.parse(
          typeof event.data === 'string'
            ? event.data
            : new TextDecoder().decode(event.data),
        );

        switch (signal.type) {
          case 'peer-joined':
            await this.createOffer(signal.userId, localUserId);
            break;
          case 'rtc-offer':
            await this.handleOffer(signal.senderId, signal.payload, localUserId);
            break;
          case 'rtc-answer':
            await this.handleAnswer(signal.senderId, signal.payload);
            break;
          case 'rtc-ice-candidate':
            await this.handleIceCandidate(signal.senderId, signal.payload);
            break;
          case 'peer-left':
            this.removePeer(signal.userId);
            break;
        }
      } catch {
        // Ignore malformed signaling messages
      }
    };

    ws.onclose = () => {
      this.signalingWs = null;
      this.emitDisconnect();
      this.scheduleReconnect();
    };
  }

  private async createOffer(remoteUserId: string, localUserId: string): Promise<void> {
    const pc = this.createPeerConnection(remoteUserId);
    const channel = pc.createDataChannel(CHANNEL_LABEL);
    this.setupDataChannel(channel, remoteUserId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendSignaling({
      type: 'rtc-offer',
      senderId: localUserId,
      targetId: remoteUserId,
      payload: { sdp: offer.sdp, type: offer.type },
    });
  }

  private async handleOffer(
    remoteUserId: string,
    payload: { sdp: string; type: RTCSdpType },
    localUserId: string,
  ): Promise<void> {
    const pc = this.createPeerConnection(remoteUserId);

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, remoteUserId);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(payload));

    // Apply buffered ICE candidates
    const pending = this.pendingCandidates.get(remoteUserId) ?? [];
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.pendingCandidates.delete(remoteUserId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.sendSignaling({
      type: 'rtc-answer',
      senderId: localUserId,
      targetId: remoteUserId,
      payload: { sdp: answer.sdp, type: answer.type },
    });
  }

  private async handleAnswer(
    remoteUserId: string,
    payload: { sdp: string; type: RTCSdpType },
  ): Promise<void> {
    const pc = this.peers.get(remoteUserId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(payload));

    // Apply buffered ICE candidates
    const pending = this.pendingCandidates.get(remoteUserId) ?? [];
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.pendingCandidates.delete(remoteUserId);
  }

  private async handleIceCandidate(
    remoteUserId: string,
    payload: RTCIceCandidateInit,
  ): Promise<void> {
    const pc = this.peers.get(remoteUserId);
    if (!pc || !pc.remoteDescription) {
      // Buffer candidate until remote description is set
      const pending = this.pendingCandidates.get(remoteUserId) ?? [];
      pending.push(payload);
      this.pendingCandidates.set(remoteUserId, pending);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(payload));
  }

  private createPeerConnection(remoteUserId: string): RTCPeerConnection {
    // Close existing connection if any
    this.peers.get(remoteUserId)?.close();

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peers.set(remoteUserId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignaling({
          type: 'rtc-ice-candidate',
          senderId: this._userId,
          targetId: remoteUserId,
          payload: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(remoteUserId);
      }
    };

    return pc;
  }

  private setupDataChannel(channel: RTCDataChannel, remoteUserId: string): void {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      this.channels.set(remoteUserId, channel);
    };

    channel.onmessage = (event: MessageEvent) => {
      try {
        const message = decodeMessage(event.data);
        this.emitMessage(message);
      } catch {
        // Ignore malformed messages
      }
    };

    channel.onclose = () => {
      this.channels.delete(remoteUserId);
    };
  }

  private removePeer(remoteUserId: string): void {
    this.channels.delete(remoteUserId);
    const pc = this.peers.get(remoteUserId);
    if (pc) {
      pc.close();
      this.peers.delete(remoteUserId);
    }
    this.pendingCandidates.delete(remoteUserId);

    // If all peers disconnected, emit disconnect event
    if (this.peers.size === 0 && this._connected) {
      this.emitDisconnect();
    }
  }

  private sendSignaling(signal: Record<string, unknown>): void {
    if (!this.signalingWs || this.signalingWs.readyState !== WebSocket.OPEN) return;
    this.signalingWs.send(JSON.stringify(signal));
  }
}
