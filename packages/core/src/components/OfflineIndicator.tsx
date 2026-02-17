import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Shows a small "Offline" badge in the taskbar status area
 * when the browser has no network connectivity.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="offline-indicator"
      role="status"
      aria-live="polite"
      aria-label="You are offline"
      title="No network connection"
    >
      <span className="offline-indicator-icon" aria-hidden="true">
        &#x26A0;
      </span>
      <span className="offline-indicator-text">Offline</span>
    </div>
  );
}
