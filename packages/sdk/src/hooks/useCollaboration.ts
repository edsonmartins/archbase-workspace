import {
  useIsCollaborating,
  useCollaborationUsers,
  useRemoteCursors,
  useSharedWindows,
  useFollowingUser,
  useCollaborationRoomId,
  useCollaborationUser,
} from '@archbase/workspace-state';

/**
 * Hook for remote apps to access collaboration state.
 * Returns reactive selectors for all collaboration data.
 */
export function useCollaboration() {
  const isConnected = useIsCollaborating();
  const roomId = useCollaborationRoomId();
  const currentUser = useCollaborationUser();
  const users = useCollaborationUsers();
  const cursors = useRemoteCursors();
  const sharedWindows = useSharedWindows();
  const followingUserId = useFollowingUser();

  return {
    isConnected,
    roomId,
    currentUser,
    users,
    cursors,
    sharedWindows,
    followingUserId,
  };
}
