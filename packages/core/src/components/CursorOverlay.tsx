import { useRemoteCursors } from '@archbase/workspace-state';

/**
 * SVG overlay that renders remote user cursors.
 * Positioned as a full-viewport overlay above all windows.
 */
export function CursorOverlay() {
  const cursors = useRemoteCursors();

  if (cursors.length === 0) return null;

  return (
    <div
      className="cursor-overlay"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    >
      {cursors
        .filter((rc) => rc.cursor.visible)
        .map((rc) => (
          <div
            key={rc.user.id}
            className="remote-cursor"
            style={{
              position: 'absolute',
              transform: `translate(${rc.cursor.x}px, ${rc.cursor.y}px)`,
              transition: 'transform 50ms linear',
              zIndex: 99999,
            }}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 0L16 12L8 12L4 20L0 0Z"
                fill={rc.user.color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="0.5"
              />
            </svg>
            <span
              className="remote-cursor-label"
              style={{
                position: 'absolute',
                left: 16,
                top: 12,
                background: rc.user.color,
                color: '#fff',
                fontSize: 11,
                fontWeight: 500,
                padding: '1px 6px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                lineHeight: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {rc.user.displayName}
            </span>
          </div>
        ))}
    </div>
  );
}
