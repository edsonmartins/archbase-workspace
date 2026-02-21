import * as Y from 'yjs';
import type {
  CollaborationMessage,
  CollaborationTransport,
  CollaborationUser,
  CursorPosition,
  FollowState,
  PresenceStatus,
  RemoteCursor,
  RoomInfo,
  ShareMode,
  SharedWindowInfo,
  UserPresence,
} from '@archbase/workspace-types';
import { WebSocketTransport } from './transports/WebSocketTransport';
import { CursorService } from './services/CursorService';
import { PresenceService } from './services/PresenceService';
import { WindowSyncService, type YWindowData } from './services/WindowSyncService';
import { FollowService } from './services/FollowService';
import { resolveUser } from './utils/userDefaults';

// ============================================================
// Types
// ============================================================

export interface CollaborationClientOptions {
  transport?: CollaborationTransport;
  serverUrl?: string;
  user?: Partial<CollaborationUser>;
  /** Callbacks for integrating with the window store */
  onRemoteWindowUpdate?: (windowId: string, data: YWindowData) => void;
  onRemoteWindowRemove?: (windowId: string) => void;
  getLocalWindows?: () => Map<string, YWindowData>;
  /** Callback for focusing a window (used by follow mode) */
  onFocusWindow?: (windowId: string) => void;
  /** Callback for state changes (connected, users, cursors, etc.) */
  onStateChange?: (event: CollaborationStateEvent) => void;
}

export type CollaborationStateEvent =
  | { type: 'connected'; roomId: string; user: CollaborationUser }
  | { type: 'disconnected' }
  | { type: 'user-joined'; user: CollaborationUser }
  | { type: 'user-left'; userId: string }
  | { type: 'cursor-update'; cursor: RemoteCursor }
  | { type: 'presence-update'; userId: string; status: PresenceStatus; focusedWindowId?: string }
  | { type: 'window-shared'; info: SharedWindowInfo }
  | { type: 'follow-change'; state: FollowState };

// ============================================================
// Client
// ============================================================

/**
 * Main collaboration orchestrator.
 *
 * Manages the lifecycle of a collaboration session:
 * - Transport connection (WebSocket or pluggable)
 * - Yjs document sync
 * - Cursor broadcasting
 * - Presence management
 * - Window state sync
 * - Follow mode
 */
export class CollaborationClient {
  private transport: CollaborationTransport;
  private serverUrl: string;
  private ydoc: Y.Doc;
  private currentUser: CollaborationUser;
  private roomId: string | null = null;
  private joined = false;
  private joinedAt = 0;

  private cursorService: CursorService;
  private presenceService: PresenceService;
  private windowSync: WindowSyncService;
  private followService: FollowService;
  private onStateChange: ((event: CollaborationStateEvent) => void) | null;
  private windowSyncCallbacks: import('./services/WindowSyncService').WindowSyncCallbacks;

  private cleanupFns: (() => void)[] = [];
  private joining = false;

  constructor(options: CollaborationClientOptions = {}) {
    this.transport = options.transport ?? new WebSocketTransport();
    this.serverUrl = options.serverUrl ?? 'ws://localhost:4100';
    this.currentUser = resolveUser(options.user);
    this.ydoc = new Y.Doc();
    this.onStateChange = options.onStateChange ?? null;

    this.cursorService = new CursorService({
      user: this.currentUser,
      onLocalCursorUpdate: (cursor) => this.broadcastLocalCursor(cursor),
    });

    this.presenceService = new PresenceService({
      user: this.currentUser,
      onStatusChange: (status) => this.broadcastPresence(status),
    });

    this.windowSyncCallbacks = {
      onRemoteWindowUpdate: options.onRemoteWindowUpdate ?? (() => {}),
      onRemoteWindowRemove: options.onRemoteWindowRemove ?? (() => {}),
      getLocalWindows: options.getLocalWindows ?? (() => new Map()),
    };
    this.windowSync = new WindowSyncService(this.ydoc, this.windowSyncCallbacks);

    this.followService = new FollowService({
      onFollowChange: (state) => {
        this.onStateChange?.({ type: 'follow-change', state });
      },
      onFocusWindow: options.onFocusWindow ?? (() => {}),
    });
  }

  // ── Lifecycle ──

  async join(roomId: string): Promise<void> {
    // Guard against concurrent join() calls before the first resolves
    if (this.joining) return;
    this.joining = true;

    try {
      if (this.joined) {
        this.leave();
      }
      // Defense in depth: ensure cleanupFns is empty before registering new listeners
      this.cleanupFns = [];

      this.roomId = roomId;
      await this.transport.connect(this.serverUrl, roomId, this.currentUser.id);
      this.joined = true;
      this.joinedAt = Date.now();

      // Wire transport messages to Yjs doc
      this.bindTransportToYjs();

      // Start sub-services
      this.cursorService.start();
      this.presenceService.start();
      this.windowSync.start();

      // Listen for sub-service events
      const unsubCursor = this.cursorService.onRemoteCursor((cursor) => {
        this.onStateChange?.({ type: 'cursor-update', cursor });
      });

      const unsubJoined = this.presenceService.onUserJoined((user) => {
        this.onStateChange?.({ type: 'user-joined', user });
      });

      const unsubLeft = this.presenceService.onUserLeft((userId) => {
        this.onStateChange?.({ type: 'user-left', userId });
      });

      const unsubShared = this.windowSync.onWindowShared((info) => {
        this.onStateChange?.({ type: 'window-shared', info });
      });

      const unsubDisconnect = this.transport.onDisconnect(() => {
        this.onStateChange?.({ type: 'disconnected' });
      });

      this.cleanupFns.push(unsubCursor, unsubJoined, unsubLeft, unsubShared, unsubDisconnect);

      this.onStateChange?.({
        type: 'connected',
        roomId,
        user: this.currentUser,
      });
    } finally {
      this.joining = false;
    }
  }

  leave(): void {
    if (!this.joined) return;

    // Stop sub-services
    this.cursorService.stop();
    this.presenceService.stop();
    this.windowSync.stop();
    this.followService.unfollow();

    // Cleanup listeners
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];

    // Disconnect transport
    this.transport.disconnect();

    // Reset Yjs doc and recreate WindowSyncService with new doc
    this.ydoc.destroy();
    this.ydoc = new Y.Doc();
    this.windowSync = new WindowSyncService(this.ydoc, this.windowSyncCallbacks);

    this.joined = false;
    this.roomId = null;

    this.onStateChange?.({ type: 'disconnected' });
  }

  destroy(): void {
    this.leave();
  }

  // ── Getters ──

  get isConnected(): boolean {
    return this.joined && this.transport.connected;
  }

  get user(): CollaborationUser {
    return this.currentUser;
  }

  getCurrentRoom(): RoomInfo | null {
    if (!this.roomId) return null;
    return {
      roomId: this.roomId,
      users: [this.currentUser, ...this.presenceService.getUsers().map((u) => u.user)],
      createdAt: this.joinedAt,
    };
  }

  // ── Presence ──

  getUsers(): UserPresence[] {
    return this.presenceService.getUsers();
  }

  setStatus(status: PresenceStatus): void {
    this.presenceService.setStatus(status);
  }

  // ── Window Sharing ──

  shareWindow(windowId: string, mode: ShareMode = 'edit'): void {
    this.windowSync.shareWindow(windowId, this.currentUser.id, mode);
  }

  unshareWindow(windowId: string): void {
    this.windowSync.unshareWindow(windowId);
  }

  getSharedWindows(): SharedWindowInfo[] {
    return this.windowSync.getSharedWindows();
  }

  syncLocalWindow(windowId: string, data: YWindowData): void {
    this.windowSync.syncLocalWindow(windowId, data);
  }

  // ── Follow ──

  followUser(userId: string): void {
    this.followService.follow(userId);
  }

  unfollowUser(): void {
    this.followService.unfollow();
  }

  getFollowState(): FollowState {
    return this.followService.getState();
  }

  // ── Sub-services (for SDK/store wiring) ──

  getCursorService(): CursorService {
    return this.cursorService;
  }

  getPresenceService(): PresenceService {
    return this.presenceService;
  }

  getWindowSync(): WindowSyncService {
    return this.windowSync;
  }

  getFollowService(): FollowService {
    return this.followService;
  }

  // ── Private ──

  private bindTransportToYjs(): void {
    const unsubMessage = this.transport.onMessage((message: CollaborationMessage) => {
      this.handleTransportMessage(message);
    });
    this.cleanupFns.push(unsubMessage);

    // Send initial sync step 1
    const stateVector = Y.encodeStateVector(this.ydoc);
    this.transport.send({
      type: 'sync-step1',
      roomId: this.roomId!,
      senderId: this.currentUser.id,
      payload: stateVector,
    });

    // Listen for local Yjs updates and broadcast
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      // Don't broadcast updates that came from the transport itself
      if (origin === 'remote') return;
      this.transport.send({
        type: 'sync-update',
        roomId: this.roomId!,
        senderId: this.currentUser.id,
        payload: update,
      });
    };

    this.ydoc.on('update', updateHandler);
    this.cleanupFns.push(() => this.ydoc.off('update', updateHandler));
  }

  private handleTransportMessage(message: CollaborationMessage): void {
    switch (message.type) {
      case 'sync-step1': {
        // Remote wants our state — respond with sync-step2 only
        // Do NOT send sync-step1 back, that would cause an infinite loop
        const payload = message.payload as Uint8Array;
        const update = Y.encodeStateAsUpdate(this.ydoc, payload);
        this.transport.send({
          type: 'sync-step2',
          roomId: this.roomId!,
          senderId: this.currentUser.id,
          payload: update,
        });
        break;
      }

      case 'sync-step2':
      case 'sync-update': {
        const update = message.payload as Uint8Array;
        Y.applyUpdate(this.ydoc, update, 'remote');
        break;
      }

      case 'awareness-update': {
        // Parse awareness data: { userId, cursor?, status?, focusedWindowId?, user? }
        const data = message.payload as Record<string, unknown>;
        const senderId = data.userId as string;
        if (senderId === this.currentUser.id) return;

        // Cursor update
        if (data.cursor) {
          const user = (data.user as CollaborationUser) ?? {
            id: senderId,
            displayName: senderId,
            color: '#888',
          };
          this.cursorService.handleRemoteCursorUpdate(
            user,
            data.cursor as CursorPosition,
          );
        }

        // Presence update
        if (data.status) {
          this.presenceService.handleRemotePresenceUpdate(
            senderId,
            data.status as PresenceStatus,
            data.focusedWindowId as string | undefined,
          );

          // Follow mode: focus tracking
          this.followService.handleRemoteFocusChange(
            senderId,
            data.focusedWindowId as string | undefined,
          );
        }
        break;
      }

      case 'room-joined': {
        const data = message.payload as Record<string, unknown>;
        const user = data.user as CollaborationUser;
        if (user && user.id !== this.currentUser.id) {
          this.presenceService.handleUserJoined(user, Date.now());
        }
        break;
      }

      case 'room-left': {
        const data = message.payload as Record<string, unknown>;
        const userId = data.userId as string;
        if (userId && userId !== this.currentUser.id) {
          this.presenceService.handleUserLeft(userId);
        }
        break;
      }

      case 'room-info': {
        const data = message.payload as Record<string, unknown>;
        // Use server-assigned color if provided
        const assignedColor = data.assignedColor as string | undefined;
        if (assignedColor) {
          this.currentUser = { ...this.currentUser, color: assignedColor };
          this.cursorService.updateUser(this.currentUser);
        }
        const users = data.users as CollaborationUser[] | undefined;
        if (users) {
          for (const user of users) {
            if (user.id !== this.currentUser.id) {
              this.presenceService.handleUserJoined(user, Date.now());
            }
          }
        }
        break;
      }

      case 'error': {
        const data = message.payload as Record<string, unknown>;
        console.warn('[CollaborationClient] Server error:', data.message ?? data);
        break;
      }

      default:
        break;
    }
  }

  private broadcastLocalCursor(cursor: CursorPosition): void {
    if (!this.joined || !this.transport.connected) return;
    this.transport.send({
      type: 'awareness-update',
      roomId: this.roomId!,
      senderId: this.currentUser.id,
      payload: {
        userId: this.currentUser.id,
        user: this.currentUser,
        cursor,
      },
    });
  }

  private broadcastPresence(status: PresenceStatus): void {
    if (!this.joined || !this.transport.connected) return;
    this.transport.send({
      type: 'awareness-update',
      roomId: this.roomId!,
      payload: {
        userId: this.currentUser.id,
        user: this.currentUser,
        status,
        focusedWindowId: undefined, // Could be wired to the window store
      },
    });
  }
}
