import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { WorkspaceNotification } from '@archbase/workspace-types';
import { useNotificationsStore } from '@archbase/workspace-state';
import { ToastContainer } from '../ToastContainer';

function buildNotification(
  overrides: Partial<WorkspaceNotification> & { id: string; type: WorkspaceNotification['type']; title: string },
): WorkspaceNotification {
  return {
    message: undefined,
    duration: 0, // persistent for stories
    createdAt: Date.now(),
    dismissible: true,
    ...overrides,
  };
}

function withNotifications(notifications: WorkspaceNotification[]) {
  return function NotificationsDecorator(Story: React.ComponentType) {
    useEffect(() => {
      const map = new Map<string, WorkspaceNotification>();
      for (const n of notifications) {
        map.set(n.id, n);
      }
      useNotificationsStore.setState({ notifications: map });

      return () => {
        useNotificationsStore.setState({ notifications: new Map() });
      };
    }, []);

    return <Story />;
  };
}

const meta: Meta<typeof ToastContainer> = {
  title: 'Components/ToastContainer',
  component: ToastContainer,
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 400,
          background: '#1e1e2e',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ToastContainer>;

/**
 * Empty state - no active notifications.
 */
export const Empty: Story = {
  decorators: [withNotifications([])],
};

/**
 * Multiple toasts of different types (info, success, error, warning).
 * All have duration=0 to prevent auto-dismiss in the story.
 */
export const WithToasts: Story = {
  decorators: [
    withNotifications([
      buildNotification({
        id: 'toast-info',
        type: 'info',
        title: 'Information',
        message: 'This is an informational notification.',
      }),
      buildNotification({
        id: 'toast-success',
        type: 'success',
        title: 'Success',
        message: 'Operation completed successfully.',
      }),
      buildNotification({
        id: 'toast-error',
        type: 'error',
        title: 'Error',
        message: 'Something went wrong. Please try again.',
      }),
      buildNotification({
        id: 'toast-warning',
        type: 'warning',
        title: 'Warning',
        message: 'Disk space is running low.',
      }),
    ]),
  ],
};
