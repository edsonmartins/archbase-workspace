import { useSharedWindows } from '@archbase/workspace-state';

interface CollaborationBadgeProps {
  windowId: string;
}

/**
 * Small badge shown in the WindowHeader when a window is being shared.
 * Shows a colored dot and participant count.
 */
export function CollaborationBadge({ windowId }: CollaborationBadgeProps) {
  const sharedWindows = useSharedWindows();
  const info = sharedWindows.find((w) => w.windowId === windowId);

  if (!info) return null;

  return (
    <span
      className="collab-badge"
      title={`Shared (${info.participants.length} user${info.participants.length !== 1 ? 's' : ''})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: 'var(--collab-badge-text, #fff)',
        background: 'var(--collab-badge-bg, #3b82f6)',
        padding: '1px 6px',
        borderRadius: 8,
        lineHeight: '16px',
        fontWeight: 500,
      }}
    >
      <span
        className="collab-badge-dot"
        style={{
          width: 'var(--collab-dot-size, 6px)',
          height: 'var(--collab-dot-size, 6px)',
          borderRadius: '50%',
          background: '#4ade80',
          flexShrink: 0,
        }}
      />
      {info.participants.length}
    </span>
  );
}
