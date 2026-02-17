import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  CollaborationUser,
  PresenceStatus,
  RemoteCursor,
  SharedWindowInfo,
  UserPresence,
} from '@archbase/workspace-types';

// ============================================================
// Types
// ============================================================

interface CollaborationStoreState {
  connected: boolean;
  roomId: string | null;
  currentUser: CollaborationUser | null;
  users: Map<string, UserPresence>;
  cursors: Map<string, RemoteCursor>;
  sharedWindows: Map<string, SharedWindowInfo>;
  followingUserId: string | null;
}

interface CollaborationStoreActions {
  setConnected: (connected: boolean, roomId: string | null, user: CollaborationUser | null) => void;
  updateUser: (userId: string, presence: UserPresence) => void;
  removeUser: (userId: string) => void;
  updateCursor: (userId: string, cursor: RemoteCursor) => void;
  removeCursor: (userId: string) => void;
  addSharedWindow: (info: SharedWindowInfo) => void;
  removeSharedWindow: (windowId: string) => void;
  setFollowing: (userId: string | null) => void;
  reset: () => void;
}

type CollaborationStore = CollaborationStoreState & CollaborationStoreActions;

const INITIAL_STATE: CollaborationStoreState = {
  connected: false,
  roomId: null,
  currentUser: null,
  users: new Map(),
  cursors: new Map(),
  sharedWindows: new Map(),
  followingUserId: null,
};

// ============================================================
// Store
// ============================================================

export const useCollaborationStore = create<CollaborationStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      ...INITIAL_STATE,

      setConnected: (connected, roomId, user) => {
        set({ connected, roomId, currentUser: user });
      },

      updateUser: (userId, presence) => {
        set((state) => {
          const users = new Map(state.users);
          users.set(userId, presence);
          return { users };
        });
      },

      removeUser: (userId) => {
        set((state) => {
          const users = new Map(state.users);
          const cursors = new Map(state.cursors);
          users.delete(userId);
          cursors.delete(userId);
          return { users, cursors };
        });
      },

      updateCursor: (userId, cursor) => {
        set((state) => {
          const cursors = new Map(state.cursors);
          cursors.set(userId, cursor);
          return { cursors };
        });
      },

      removeCursor: (userId) => {
        set((state) => {
          const cursors = new Map(state.cursors);
          cursors.delete(userId);
          return { cursors };
        });
      },

      addSharedWindow: (info) => {
        set((state) => {
          const sharedWindows = new Map(state.sharedWindows);
          sharedWindows.set(info.windowId, info);
          return { sharedWindows };
        });
      },

      removeSharedWindow: (windowId) => {
        set((state) => {
          const sharedWindows = new Map(state.sharedWindows);
          sharedWindows.delete(windowId);
          return { sharedWindows };
        });
      },

      setFollowing: (userId) => {
        set({ followingUserId: userId });
      },

      reset: () => {
        // Reset module-level caches to prevent stale references
        cachedUsersMap = null;
        cachedUsersArray = [];
        cachedCursorsMap = null;
        cachedCursorsArray = [];
        cachedSharedMap = null;
        cachedSharedArray = [];
        set({ ...INITIAL_STATE, users: new Map(), cursors: new Map(), sharedWindows: new Map() });
      },
    })),
    { name: 'CollaborationStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

export const useIsCollaborating = () =>
  useCollaborationStore((state) => state.connected);

export const useCollaborationRoomId = () =>
  useCollaborationStore((state) => state.roomId);

export const useCollaborationUser = () =>
  useCollaborationStore((state) => state.currentUser);

let cachedUsersArray: UserPresence[] = [];
let cachedUsersMap: Map<string, UserPresence> | null = null;

export const useCollaborationUsers = () =>
  useCollaborationStore((state) => {
    if (state.users !== cachedUsersMap) {
      cachedUsersMap = state.users;
      cachedUsersArray = Array.from(state.users.values());
    }
    return cachedUsersArray;
  });

let cachedCursorsArray: RemoteCursor[] = [];
let cachedCursorsMap: Map<string, RemoteCursor> | null = null;

export const useRemoteCursors = () =>
  useCollaborationStore((state) => {
    if (state.cursors !== cachedCursorsMap) {
      cachedCursorsMap = state.cursors;
      cachedCursorsArray = Array.from(state.cursors.values());
    }
    return cachedCursorsArray;
  });

let cachedSharedArray: SharedWindowInfo[] = [];
let cachedSharedMap: Map<string, SharedWindowInfo> | null = null;

export const useSharedWindows = () =>
  useCollaborationStore((state) => {
    if (state.sharedWindows !== cachedSharedMap) {
      cachedSharedMap = state.sharedWindows;
      cachedSharedArray = Array.from(state.sharedWindows.values());
    }
    return cachedSharedArray;
  });

export const useFollowingUser = () =>
  useCollaborationStore((state) => state.followingUserId);

// ============================================================
// Event Subscriptions
// ============================================================

export const onUserJoined = (handler: (presence: UserPresence) => void) =>
  useCollaborationStore.subscribe(
    (state) => state.users,
    (current, prev) => {
      for (const [userId, presence] of current) {
        if (!prev.has(userId)) {
          handler(presence);
        }
      }
    },
  );

export const onUserLeft = (handler: (userId: string) => void) =>
  useCollaborationStore.subscribe(
    (state) => state.users,
    (current, prev) => {
      for (const userId of prev.keys()) {
        if (!current.has(userId)) {
          handler(userId);
        }
      }
    },
  );
