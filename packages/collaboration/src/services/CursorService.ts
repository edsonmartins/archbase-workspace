import type { CollaborationUser, CursorPosition, RemoteCursor } from '@archbase/workspace-types';

const BROADCAST_INTERVAL_MS = 33; // ~30fps

export interface CursorServiceOptions {
  user: CollaborationUser;
  onLocalCursorUpdate: (cursor: CursorPosition) => void;
}

/**
 * Service for broadcasting local cursor position and receiving remote cursors.
 *
 * Local cursor tracking:
 * - Listens to pointermove events on the document
 * - Broadcasts cursor position at 30fps via the onLocalCursorUpdate callback
 *
 * Remote cursor handling:
 * - Receives remote cursor updates via handleRemoteCursorUpdate()
 * - Notifies listeners via onRemoteCursor handlers
 */
export class CursorService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastX = 0;
  private lastY = 0;
  private lastBroadcastX = -1;
  private lastBroadcastY = -1;
  private user: CollaborationUser;
  private onLocalCursorUpdate: (cursor: CursorPosition) => void;
  private remoteCursorListeners = new Set<(cursor: RemoteCursor) => void>();
  private running = false;

  constructor(options: CursorServiceOptions) {
    this.user = options.user;
    this.onLocalCursorUpdate = options.onLocalCursorUpdate;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    // Track local mouse position
    if (typeof document !== 'undefined') {
      document.addEventListener('pointermove', this.handlePointerMove);
    }

    // Broadcast at 30fps, only when position changed
    this.intervalId = setInterval(() => {
      if (this.lastX === this.lastBroadcastX && this.lastY === this.lastBroadcastY) return;
      this.lastBroadcastX = this.lastX;
      this.lastBroadcastY = this.lastY;
      this.onLocalCursorUpdate({
        x: this.lastX,
        y: this.lastY,
        windowId: this.getWindowUnderCursor(),
        visible: typeof document !== 'undefined' ? document.hasFocus() : true,
      });
    }, BROADCAST_INTERVAL_MS);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointermove', this.handlePointerMove);
    }
  }

  updateUser(user: CollaborationUser): void {
    this.user = user;
  }

  handleRemoteCursorUpdate(user: CollaborationUser, cursor: CursorPosition): void {
    const remoteCursor: RemoteCursor = {
      user,
      cursor,
      lastUpdate: Date.now(),
    };
    for (const handler of this.remoteCursorListeners) {
      handler(remoteCursor);
    }
  }

  onRemoteCursor(handler: (cursor: RemoteCursor) => void): () => void {
    this.remoteCursorListeners.add(handler);
    return () => {
      this.remoteCursorListeners.delete(handler);
    };
  }

  private handlePointerMove = (e: PointerEvent): void => {
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private getWindowUnderCursor(): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const el = document.elementFromPoint(this.lastX, this.lastY);
    if (!el) return undefined;
    const windowEl = (el as HTMLElement).closest?.('[data-window-id]');
    return windowEl?.getAttribute('data-window-id') ?? undefined;
  }
}
