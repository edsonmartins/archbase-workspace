import type { Meta, StoryObj } from '@storybook/react';

/**
 * OfflineIndicator relies on the useOnlineStatus() hook which reads
 * navigator.onLine. Since we cannot easily mock that hook in Storybook,
 * we render the component's markup directly for the "Offline" story
 * and render nothing for the "Online" story.
 */

/** Reproduces the exact markup of OfflineIndicator when offline */
function OfflineIndicatorOffline() {
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

/** Reproduces the "online" case: renders nothing */
function OfflineIndicatorOnline() {
  return null;
}

const meta: Meta = {
  title: 'Components/OfflineIndicator',
};

export default meta;

type OfflineStory = StoryObj;

export const Online: OfflineStory = {
  render: () => <OfflineIndicatorOnline />,
};

export const Offline: OfflineStory = {
  render: () => <OfflineIndicatorOffline />,
};
