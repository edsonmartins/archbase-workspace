// ============================================================
// Collaboration Types (Phase 6.4: Real-Time Collaboration)
// ============================================================

// ── User & Identity ──

export interface CollaborationUser {
  id: string;
  displayName: string;
  color: string;
  avatar?: string;
}

// ── Room ──

export interface RoomInfo {
  roomId: string;
  users: CollaborationUser[];
  createdAt: number;
}

// ── Cursor ──

export interface CursorPosition {
  x: number;
  y: number;
  windowId?: string;
  visible: boolean;
}

export interface RemoteCursor {
  user: CollaborationUser;
  cursor: CursorPosition;
  lastUpdate: number;
}

// ── Presence ──

export type PresenceStatus = 'active' | 'idle' | 'away';

export interface UserPresence {
  user: CollaborationUser;
  status: PresenceStatus;
  focusedWindowId?: string;
  joinedAt: number;
}

// ── Window Sharing ──

export type ShareMode = 'view' | 'edit';

export interface SharedWindowInfo {
  windowId: string;
  sharedBy: string;
  mode: ShareMode;
  participants: string[];
}

// ── Follow Mode ──

export interface FollowState {
  followingUserId: string | null;
}

// ── Transport Messages ──

export type CollaborationMessageType =
  | 'sync-step1'
  | 'sync-step2'
  | 'sync-update'
  | 'awareness-update'
  | 'rtc-offer'
  | 'rtc-answer'
  | 'rtc-ice-candidate'
  | 'room-joined'
  | 'room-left'
  | 'room-info'
  | 'error';

export interface CollaborationMessage {
  type: CollaborationMessageType;
  roomId: string;
  senderId?: string;
  targetId?: string;
  payload: Uint8Array | Record<string, unknown>;
}

// ── Transport ──

export interface CollaborationTransport {
  connect(url: string, roomId: string, userId: string): Promise<void>;
  disconnect(): void;
  send(message: CollaborationMessage): void;
  onMessage(handler: (message: CollaborationMessage) => void): () => void;
  onDisconnect(handler: () => void): () => void;
  readonly connected: boolean;
}

// ── Collaboration SDK (for remote apps) ──

export interface CollaborationSDK {
  readonly isConnected: boolean;
  readonly currentRoom: RoomInfo | null;
  readonly currentUser: CollaborationUser | null;

  join(roomId: string): Promise<void>;
  leave(): void;

  // Presence
  getUsers(): UserPresence[];
  setStatus(status: PresenceStatus): void;

  // Window sharing
  shareWindow(windowId: string, mode?: ShareMode): void;
  unshareWindow(windowId: string): void;
  getSharedWindows(): SharedWindowInfo[];

  // Follow
  followUser(userId: string): void;
  unfollowUser(): void;
  getFollowState(): FollowState;

  // Events
  onUserJoined(handler: (user: CollaborationUser) => void): () => void;
  onUserLeft(handler: (userId: string) => void): () => void;
  onCursorMove(handler: (cursor: RemoteCursor) => void): () => void;
  onWindowShared(handler: (info: SharedWindowInfo) => void): () => void;
}
