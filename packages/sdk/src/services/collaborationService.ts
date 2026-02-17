import type {
  CollaborationSDK,
  CollaborationUser,
  FollowState,
  PresenceStatus,
  RemoteCursor,
  RoomInfo,
  ShareMode,
  SharedWindowInfo,
  UserPresence,
} from '@archbase/workspace-types';
import { useCollaborationStore } from '@archbase/workspace-state';

/**
 * Create a CollaborationSDK service scoped to an app/window.
 *
 * This service reads from the collaboration store (populated by the
 * CollaborationClient running in the host). Remote apps can use it
 * to observe collaboration state and trigger actions.
 */
export function createCollaborationService(): CollaborationSDK {
  return {
    get isConnected() {
      return useCollaborationStore.getState().connected;
    },

    get currentRoom(): RoomInfo | null {
      const state = useCollaborationStore.getState();
      if (!state.roomId || !state.currentUser) return null;
      const users: CollaborationUser[] = [
        state.currentUser,
        ...Array.from(state.users.values()).map((u) => u.user),
      ];
      return { roomId: state.roomId, users, createdAt: Date.now() };
    },

    get currentUser(): CollaborationUser | null {
      return useCollaborationStore.getState().currentUser;
    },

    async join(roomId: string): Promise<void> {
      // The actual join is handled by the CollaborationClient in the host.
      // SDK apps trigger it via the store — the host listens for roomId changes.
      // For now, this is a no-op placeholder since join/leave lifecycle
      // is controlled by the host shell, not individual remote apps.
      console.warn(
        '[CollaborationSDK] join() called from remote app. Use the host Command Palette to join a room.',
        roomId,
      );
    },

    leave(): void {
      console.warn(
        '[CollaborationSDK] leave() called from remote app. Use the host Command Palette to leave.',
      );
    },

    getUsers(): UserPresence[] {
      return Array.from(useCollaborationStore.getState().users.values());
    },

    setStatus(status: PresenceStatus): void {
      // Presence status is managed by the CollaborationClient in the host.
      // Remote apps can request a status change but it's up to the host to honor it.
      void status;
    },

    shareWindow(windowId: string, _mode?: ShareMode): void {
      // Trigger window sharing via the store
      void windowId;
    },

    unshareWindow(windowId: string): void {
      useCollaborationStore.getState().removeSharedWindow(windowId);
    },

    getSharedWindows(): SharedWindowInfo[] {
      return Array.from(useCollaborationStore.getState().sharedWindows.values());
    },

    followUser(userId: string): void {
      useCollaborationStore.getState().setFollowing(userId);
    },

    unfollowUser(): void {
      useCollaborationStore.getState().setFollowing(null);
    },

    getFollowState(): FollowState {
      return { followingUserId: useCollaborationStore.getState().followingUserId };
    },

    onUserJoined(handler: (user: CollaborationUser) => void): () => void {
      return useCollaborationStore.subscribe(
        (state) => state.users,
        (current, prev) => {
          for (const [userId, presence] of current) {
            if (!prev.has(userId)) {
              handler(presence.user);
            }
          }
        },
      );
    },

    onUserLeft(handler: (userId: string) => void): () => void {
      return useCollaborationStore.subscribe(
        (state) => state.users,
        (current, prev) => {
          for (const userId of prev.keys()) {
            if (!current.has(userId)) {
              handler(userId);
            }
          }
        },
      );
    },

    onCursorMove(handler: (cursor: RemoteCursor) => void): () => void {
      return useCollaborationStore.subscribe(
        (state) => state.cursors,
        (current, prev) => {
          for (const [userId, cursor] of current) {
            const prevCursor = prev.get(userId);
            if (!prevCursor || prevCursor.lastUpdate !== cursor.lastUpdate) {
              handler(cursor);
            }
          }
        },
      );
    },

    onWindowShared(handler: (info: SharedWindowInfo) => void): () => void {
      return useCollaborationStore.subscribe(
        (state) => state.sharedWindows,
        (current, prev) => {
          for (const [windowId, info] of current) {
            if (!prev.has(windowId)) {
              handler(info);
            }
          }
        },
      );
    },
  };
}
