import { useCallback } from 'react';
import {
  useCollaborationUsers,
  useFollowingUser,
  useCollaborationStore,
  useCollaborationUser,
} from '@archbase/workspace-state';

interface PresencePanelProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Side panel showing online users in the current collaboration room.
 * Allows following/unfollowing other users.
 */
export function PresencePanel({ visible, onClose }: PresencePanelProps) {
  const users = useCollaborationUsers();
  const currentUser = useCollaborationUser();
  const followingUserId = useFollowingUser();
  const setFollowing = useCollaborationStore((s) => s.setFollowing);

  const handleFollow = useCallback(
    (userId: string) => {
      if (followingUserId === userId) {
        setFollowing(null);
      } else {
        setFollowing(userId);
      }
    },
    [followingUserId, setFollowing],
  );

  if (!visible) return null;

  return (
    <aside
      className="presence-panel"
      role="complementary"
      aria-label="Online users"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 'var(--collab-panel-width, 240px)',
        height: 'calc(100vh - var(--taskbar-height, 48px))',
        background: 'var(--collab-panel-bg, var(--taskbar-bg))',
        borderLeft: '1px solid var(--collab-panel-border, var(--taskbar-border))',
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--collab-panel-border, var(--taskbar-border))',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        <span>Online ({users.length + (currentUser ? 1 : 0)})</span>
        <button
          onClick={onClose}
          aria-label="Close presence panel"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
          }}
        >
          ✕
        </button>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {/* Current user */}
        {currentUser && (
          <div
            className="presence-user"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            <span
              className="presence-dot"
              style={{
                width: 'var(--collab-dot-size, 8px)',
                height: 'var(--collab-dot-size, 8px)',
                borderRadius: '50%',
                background: currentUser.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.displayName} (you)
            </span>
          </div>
        )}

        {/* Remote users */}
        {users.map((u) => (
          <div
            key={u.user.id}
            className="presence-user"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            <span
              className="presence-dot"
              style={{
                width: 'var(--collab-dot-size, 8px)',
                height: 'var(--collab-dot-size, 8px)',
                borderRadius: '50%',
                background: u.user.color,
                flexShrink: 0,
                opacity: u.status === 'away' ? 0.4 : u.status === 'idle' ? 0.7 : 1,
              }}
            />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.user.displayName}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                textTransform: 'capitalize',
              }}
            >
              {u.status}
            </span>
            <button
              onClick={() => handleFollow(u.user.id)}
              aria-label={followingUserId === u.user.id ? `Unfollow ${u.user.displayName}` : `Follow ${u.user.displayName}`}
              style={{
                background: followingUserId === u.user.id ? 'var(--btn-primary-bg)' : 'var(--btn-secondary-bg)',
                color: followingUserId === u.user.id ? 'var(--btn-primary-text)' : 'var(--btn-secondary-text)',
                border: 'none',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {followingUserId === u.user.id ? 'Unfollow' : 'Follow'}
            </button>
          </div>
        ))}

        {users.length === 0 && !currentUser && (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: 12,
            }}
          >
            Not connected to a room
          </div>
        )}
      </div>
    </aside>
  );
}
