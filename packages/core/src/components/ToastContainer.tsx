import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotifications, useNotificationsStore } from '@archbase/workspace-state';
import type { WorkspaceNotification, NotificationType } from '@archbase/workspace-types';

const MAX_VISIBLE = 5;
const EXIT_ANIMATION_MS = 200;

const TYPE_ICONS: Record<NotificationType, string> = {
  info: 'i',
  success: '\u2713',     // checkmark
  warning: '\u26A0',     // warning sign
  error: '\u2717',       // X mark
};

interface ToastProps {
  notification: WorkspaceNotification;
  isExiting: boolean;
  onStartExit: (id: string) => void;
}

function Toast({ notification, isExiting, onStartExit }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notification.duration > 0) {
      timerRef.current = setTimeout(() => {
        onStartExit(notification.id);
      }, notification.duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.id, notification.duration, onStartExit]);

  const handleDismiss = useCallback(() => {
    onStartExit(notification.id);
  }, [onStartExit, notification.id]);

  return (
    <div
      className={`toast toast-${notification.type}${isExiting ? ' toast-exiting' : ''}`}
      role="alert"
    >
      <span className="toast-icon" aria-hidden="true">{TYPE_ICONS[notification.type]}</span>
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
          <span aria-hidden="true">{'\u2715'}</span>
        </button>
      )}
    </div>
  );
}

export function ToastContainer() {
  const notifications = useNotifications();
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  // Auto-dismiss oldest when exceeding MAX_VISIBLE (batch to avoid cascading re-renders)
  useEffect(() => {
    const excess = notifications.length - MAX_VISIBLE;
    if (excess > 0) {
      for (let i = 0; i < excess; i++) {
        dismiss(notifications[i].id);
      }
    }
  }, [notifications, dismiss]);

  const startExit = useCallback((id: string) => {
    setExitingIds((prev) => {
      if (prev.has(id)) return prev;
      return new Set(prev).add(id);
    });
    setTimeout(() => {
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      dismiss(id);
    }, EXIT_ANIMATION_MS);
  }, [dismiss]);

  // Show newest at bottom
  const visible = notifications.slice(-MAX_VISIBLE);

  return (
    <div
      className="toast-container"
      aria-live="polite"
      aria-label="Notifications"
    >
      {visible.map((n) => (
        <Toast
          key={n.id}
          notification={n}
          isExiting={exitingIds.has(n.id)}
          onStartExit={startExit}
        />
      ))}
    </div>
  );
}
