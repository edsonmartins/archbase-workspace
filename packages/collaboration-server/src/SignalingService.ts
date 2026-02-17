import type { WebSocket } from 'ws';
import type { Room } from './RoomManager';

/**
 * Handles WebRTC signaling messages (SDP offers/answers, ICE candidates).
 * These messages are forwarded peer-to-peer through the WebSocket server.
 */
export class SignalingService {
  /**
   * Handle an incoming signaling message and forward to the target peer.
   */
  handleSignaling(
    room: Room,
    senderId: string,
    message: {
      type: string;
      targetId?: string;
      payload: unknown;
    },
    rawData: string,
  ): void {
    if (!message.targetId) return;

    // Forward the signaling message to the target client
    room.forwardToClient(message.targetId, rawData);
  }

  /**
   * Check if a message type is a signaling message.
   */
  isSignalingMessage(type: string): boolean {
    return type === 'rtc-offer' || type === 'rtc-answer' || type === 'rtc-ice-candidate';
  }
}
