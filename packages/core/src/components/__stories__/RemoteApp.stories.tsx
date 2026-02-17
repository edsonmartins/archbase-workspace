import type { Meta, StoryObj } from '@storybook/react';

/**
 * RemoteApp uses Module Federation `loadRemote()` which is not available
 * in Storybook. Instead of importing the actual component, we create
 * wrapper components that render the same markup/styles the RemoteApp
 * component produces for each visual state (loading, error, loaded).
 */

function RemoteAppLoading() {
  return (
    <div
      className="remote-app-loading"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
        fontSize: 14,
        color: '#9ca3af',
      }}
    >
      Loading Hello World...
    </div>
  );
}

function RemoteAppError() {
  return (
    <div
      className="remote-app-error"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: 300,
        fontSize: 14,
        color: '#ef4444',
      }}
    >
      <span className="remote-app-error-icon">!!!</span>
      <span>Failed to load Hello World</span>
      <button
        className="remote-app-retry-btn"
        onClick={() => alert('Retry clicked')}
        style={{
          padding: '6px 16px',
          border: '1px solid #ef4444',
          borderRadius: 4,
          background: 'transparent',
          color: '#ef4444',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}

function RemoteAppLoaded() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
        fontSize: 16,
        color: '#e5e7eb',
        background: '#1e1e2e',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>Hello World</div>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>
          This is a mock of a successfully loaded remote app
        </div>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Components/RemoteApp',
  decorators: [
    (Story) => (
      <div
        style={{
          width: 500,
          border: '1px solid #444',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#1e1e2e',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj;

/**
 * Shows the loading spinner/message that appears while
 * a remote app is being fetched via Module Federation.
 */
export const Loading: Story = {
  render: () => <RemoteAppLoading />,
};

/**
 * Shows the error state when a remote app fails to load.
 * Includes a Retry button.
 */
export const Error: Story = {
  render: () => <RemoteAppError />,
};

/**
 * Shows what a successfully loaded remote app looks like.
 * This is a mock since actual MF loading is not available in Storybook.
 */
export const Loaded: Story = {
  render: () => <RemoteAppLoaded />,
};
