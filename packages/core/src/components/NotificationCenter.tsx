import { useCallback } from 'react';
import { useNotificationHistory, useNotificationsStore } from '@archbase/workspace-state';
import type { NotificationType } from '@archbase/workspace-types';

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  info: 'i',
  success: '\u2713',
  warning: '\u26A0',
  error: '\u2717',
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const history = useNotificationHistory();

  const handleClearHistory = useCallback(() => {
    useNotificationsStore.getState().clearHistory();
  }, []);

  if (!visible) return null;

  return (
    <div
      className="notification-center-overlay"
      onClick={onClose}
    >
      <div
        className="notification-center"
        role="complementary"
        aria-label="Notification Center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notification-center-header">
          <span className="notification-center-title">Notifications</span>
          <div className="notification-center-header-actions">
            {history.length > 0 && (
              <button
                className="notification-center-clear-btn"
                onClick={handleClearHistory}
                aria-label="Clear notification history"
              >
                Clear All
              </button>
            )}
            <button
              className="notification-center-close-btn"
              onClick={onClose}
              aria-label="Close notification center"
            >
              {'\u2715'}
            </button>
          </div>
        </div>

        <div className="notification-center-list">
          {history.length === 0 ? (
            <div className="notification-center-empty">
              No notifications
            </div>
          ) : (
            history.map((n) => (
              <div
                key={`${n.id}-${n.dismissedAt}`}
                className={`notification-center-item notification-center-item-${n.type}`}
              >
                <span className="notification-center-item-icon" aria-hidden="true">
                  {TYPE_ICONS[n.type]}
                </span>
                <div className="notification-center-item-content">
                  <span className="notification-center-item-title">{n.title}</span>
                  {n.message && (
                    <span className="notification-center-item-message">{n.message}</span>
                  )}
                </div>
                <span className="notification-center-item-time">
                  {formatTime(n.dismissedAt ?? n.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
