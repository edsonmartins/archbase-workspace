import { useEffect, useRef, useCallback } from 'react';
import { useNotifications, useNotificationsStore } from '@archbase/workspace-state';
import type { WorkspaceNotification, NotificationType } from '@archbase/workspace-types';

const MAX_VISIBLE = 5;

const TYPE_ICONS: Record<NotificationType, string> = {
  info: 'i',
  success: '\u2713',     // checkmark
  warning: '\u26A0',     // warning sign
  error: '\u2717',       // X mark
};

function Toast({ notification }: { notification: WorkspaceNotification }) {
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notification.duration > 0) {
      timerRef.current = setTimeout(() => {
        dismiss(notification.id);
      }, notification.duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.id, notification.duration, dismiss]);

  const handleDismiss = useCallback(() => {
    dismiss(notification.id);
  }, [dismiss, notification.id]);

  return (
    <div className={`toast toast-${notification.type}`} role="alert">
      <span className="toast-icon">{TYPE_ICONS[notification.type]}</span>
      <div className="toast-content">
        <span className="toast-title">{notification.title}</span>
        {notification.message && (
          <span className="toast-message">{notification.message}</span>
        )}
      </div>
      {notification.dismissible && (
        <button
          className="toast-close"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          \u2715
        </button>
      )}
    </div>
  );
}

export function ToastContainer() {
  const notifications = useNotifications();
  const dismiss = useNotificationsStore((s) => s.dismiss);

  // Auto-dismiss oldest when exceeding MAX_VISIBLE (batch to avoid cascading re-renders)
  useEffect(() => {
    const excess = notifications.length - MAX_VISIBLE;
    if (excess > 0) {
      for (let i = 0; i < excess; i++) {
        dismiss(notifications[i].id);
      }
    }
  }, [notifications, dismiss]);

  // Show newest at bottom
  const visible = notifications.slice(-MAX_VISIBLE);

  return (
    <div
      className="toast-container"
      aria-live="polite"
      aria-label="Notifications"
    >
      {visible.map((n) => (
        <Toast key={n.id} notification={n} />
      ))}
    </div>
  );
}
