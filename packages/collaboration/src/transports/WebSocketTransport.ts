import type { CollaborationMessage, CollaborationMessageType } from '@archbase/workspace-types';
import { AbstractTransport } from './Transport';

/**
 * WebSocket-based collaboration transport.
 * Uses JSON wire format (matching the collaboration server).
 * Binary Yjs payloads are base64-encoded in transit.
 */

const SYNC_TYPES = new Set<CollaborationMessageType>([
  'sync-step1',
  'sync-step2',
  'sync-update',
]);

export class WebSocketTransport extends AbstractTransport {
  private ws: WebSocket | null = null;

  protected async doConnect(url: string, roomId: string, userId: string): Promise<void> {
    // Close previous connection if any (reconnection scenario)
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    return new Promise<void>((resolve, reject) => {
      const wsUrl = `${url}?room=${encodeURIComponent(roomId)}&user=${encodeURIComponent(userId)}`;
      const ws = new WebSocket(wsUrl);

      const onOpen = () => {
        cleanup();
        this.ws = ws;
        this.setupListeners(ws);
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error(`WebSocket connection to ${url} failed`));
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
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  protected doSend(message: CollaborationMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Use JSON wire format to match the collaboration server
    const wire: Record<string, unknown> = {
      type: message.type,
      roomId: message.roomId,
    };
    if (message.senderId) wire.senderId = message.senderId;
    if (message.targetId) wire.targetId = message.targetId;

    // Yjs sync types carry binary payloads — encode as base64
    if (SYNC_TYPES.has(message.type) && message.payload instanceof Uint8Array) {
      wire.payload = uint8ArrayToBase64(message.payload);
    } else {
      wire.payload = message.payload;
    }

    this.ws.send(JSON.stringify(wire));
  }

  private setupListeners(ws: WebSocket): void {
    ws.onmessage = (event: MessageEvent) => {
      try {
        const text = typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer);

        const parsed = JSON.parse(text);
        if (!parsed.type) return;

        const message: CollaborationMessage = {
          type: parsed.type as CollaborationMessageType,
          roomId: parsed.roomId ?? '',
          senderId: parsed.senderId,
          targetId: parsed.targetId,
          payload: parsed.payload,
        };

        // Yjs sync payloads arrive as base64 strings — decode to Uint8Array
        if (SYNC_TYPES.has(message.type) && typeof message.payload === 'string') {
          message.payload = base64ToUint8Array(message.payload as unknown as string);
        }

        // Ensure non-binary payloads default to empty object
        if (message.payload === undefined || message.payload === null) {
          message.payload = {};
        }

        this.emitMessage(message);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.ws = null;
      this.emitDisconnect();
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // Will trigger onclose
    };
  }
}

// ── Base64 Helpers ──

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
