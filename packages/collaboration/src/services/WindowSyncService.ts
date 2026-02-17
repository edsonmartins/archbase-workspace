import * as Y from 'yjs';
import type { SharedWindowInfo, ShareMode } from '@archbase/workspace-types';

/**
 * Serializable window data for Yjs Y.Map.
 * Only sync-relevant fields, not the full WorkspaceWindow.
 */
export interface YWindowData {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: string;
  zIndex: number;
  sharedBy: string;
  mode: ShareMode;
  participants: string[];
}

export interface WindowSyncCallbacks {
  onRemoteWindowUpdate: (windowId: string, data: YWindowData) => void;
  onRemoteWindowRemove: (windowId: string) => void;
  getLocalWindows: () => Map<string, YWindowData>;
}

/**
 * Bidirectional sync service between Yjs Y.Map<YWindowData> and local window state.
 *
 * - Yjs → Local: Observes Y.Map changes and calls onRemoteWindowUpdate/onRemoteWindowRemove
 * - Local → Yjs: Call syncLocalWindow() to push local changes to Yjs
 *
 * Uses suppression flags to prevent echo loops.
 */
export class WindowSyncService {
  private yWindows: Y.Map<YWindowData>;
  private suppressRemote = false;
  private suppressLocal = false;
  private running = false;
  private callbacks: WindowSyncCallbacks;
  private sharedWindows = new Map<string, SharedWindowInfo>();
  private sharedWindowListeners = new Set<(info: SharedWindowInfo) => void>();
  private yObserver: ((event: Y.YMapEvent<YWindowData>) => void) | null = null;

  constructor(
    private ydoc: Y.Doc,
    callbacks: WindowSyncCallbacks,
  ) {
    this.yWindows = ydoc.getMap<YWindowData>('windows');
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    // Observe Yjs → Local
    this.yObserver = (event: Y.YMapEvent<YWindowData>) => {
      if (this.suppressLocal) return;
      this.suppressRemote = true;

      for (const [key, change] of event.changes.keys) {
        if (change.action === 'add' || change.action === 'update') {
          const yData = this.yWindows.get(key);
          if (yData) {
            this.callbacks.onRemoteWindowUpdate(key, yData);
          }
        }
        if (change.action === 'delete') {
          this.callbacks.onRemoteWindowRemove(key);
        }
      }

      this.suppressRemote = false;
    };

    this.yWindows.observe(this.yObserver);
  }

  stop(): void {
    this.running = false;
    if (this.yObserver) {
      this.yWindows.unobserve(this.yObserver);
      this.yObserver = null;
    }
  }

  /**
   * Push a local window update to Yjs (for shared windows only).
   */
  syncLocalWindow(windowId: string, data: YWindowData): void {
    if (this.suppressRemote || !this.running) return;
    if (!this.sharedWindows.has(windowId)) return;

    this.suppressLocal = true;
    this.ydoc.transact(() => {
      this.yWindows.set(windowId, data);
    });
    this.suppressLocal = false;
  }

  /**
   * Remove a local window from Yjs.
   */
  removeLocalWindow(windowId: string): void {
    if (this.suppressRemote || !this.running) return;

    this.suppressLocal = true;
    this.ydoc.transact(() => {
      this.yWindows.delete(windowId);
    });
    this.suppressLocal = false;
    this.sharedWindows.delete(windowId);
  }

  /**
   * Share a window with the room.
   */
  shareWindow(windowId: string, userId: string, mode: ShareMode = 'edit'): void {
    const info: SharedWindowInfo = {
      windowId,
      sharedBy: userId,
      mode,
      participants: [userId],
    };
    this.sharedWindows.set(windowId, info);

    // Push current window state to Yjs
    const localWindows = this.callbacks.getLocalWindows();
    const localData = localWindows.get(windowId);
    if (localData) {
      this.syncLocalWindow(windowId, { ...localData, sharedBy: userId, mode, participants: [userId] });
    }

    for (const handler of this.sharedWindowListeners) {
      handler(info);
    }
  }

  /**
   * Stop sharing a window.
   */
  unshareWindow(windowId: string): void {
    this.sharedWindows.delete(windowId);
    this.removeLocalWindow(windowId);
  }

  isShared(windowId: string): boolean {
    return this.sharedWindows.has(windowId);
  }

  getSharedWindows(): SharedWindowInfo[] {
    return Array.from(this.sharedWindows.values());
  }

  onWindowShared(handler: (info: SharedWindowInfo) => void): () => void {
    this.sharedWindowListeners.add(handler);
    return () => {
      this.sharedWindowListeners.delete(handler);
    };
  }
}
