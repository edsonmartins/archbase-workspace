import type { CollaborationMessage, CollaborationTransport } from '@archbase/workspace-types';

/**
 * Abstract base class for collaboration transports.
 * Provides reconnection logic with exponential backoff and listener management.
 */
export abstract class AbstractTransport implements CollaborationTransport {
  protected messageListeners = new Set<(message: CollaborationMessage) => void>();
  protected disconnectListeners = new Set<() => void>();
  protected reconnectAttempts = 0;
  protected maxReconnectDelay = 30_000;
  protected reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  protected _connected = false;
  protected _url = '';
  protected _roomId = '';
  protected _userId = '';
  protected autoReconnect = true;

  get connected(): boolean {
    return this._connected;
  }

  async connect(url: string, roomId: string, userId: string): Promise<void> {
    this._url = url;
    this._roomId = roomId;
    this._userId = userId;
    this.reconnectAttempts = 0;
    this.autoReconnect = true;
    this.cancelReconnect();
    await this.doConnect(url, roomId, userId);
    this._connected = true;
  }

  disconnect(): void {
    this.autoReconnect = false;
    this.cancelReconnect();
    this.doDisconnect();
    this._connected = false;
  }

  send(message: CollaborationMessage): void {
    if (!this._connected) return;
    this.doSend(message);
  }

  onMessage(handler: (message: CollaborationMessage) => void): () => void {
    this.messageListeners.add(handler);
    return () => {
      this.messageListeners.delete(handler);
    };
  }

  onDisconnect(handler: () => void): () => void {
    this.disconnectListeners.add(handler);
    return () => {
      this.disconnectListeners.delete(handler);
    };
  }

  protected emitMessage(message: CollaborationMessage): void {
    for (const handler of this.messageListeners) {
      handler(message);
    }
  }

  protected emitDisconnect(): void {
    this._connected = false;
    for (const handler of this.disconnectListeners) {
      handler();
    }
  }

  protected scheduleReconnect(): void {
    if (!this.autoReconnect) return;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.doConnect(this._url, this._roomId, this._userId);
        this._connected = true;
        this.reconnectAttempts = 0;
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  protected cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  protected abstract doConnect(url: string, roomId: string, userId: string): Promise<void>;
  protected abstract doDisconnect(): void;
  protected abstract doSend(message: CollaborationMessage): void;
}
