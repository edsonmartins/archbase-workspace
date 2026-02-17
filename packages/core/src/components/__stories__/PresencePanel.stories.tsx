import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { useCollaborationStore } from '@archbase/workspace-state';
import type { CollaborationUser, UserPresence } from '@archbase/workspace-types';
import { PresencePanel } from '../PresencePanel';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const currentUser: CollaborationUser = {
  id: 'me',
  displayName: 'You (current)',
  color: '#3b82f6',
};

const remoteUsers: UserPresence[] = [
  {
    user: { id: 'alice', displayName: 'Alice', color: '#f43f5e' },
    status: 'active',
    joinedAt: Date.now() - 60_000,
  },
  {
    user: { id: 'bob', displayName: 'Bob', color: '#22c55e' },
    status: 'idle',
    joinedAt: Date.now() - 120_000,
  },
  {
    user: { id: 'charlie', displayName: 'Charlie', color: '#a855f7' },
    status: 'away',
    joinedAt: Date.now() - 300_000,
  },
];

// ---------------------------------------------------------------------------
// Helper: populate the collaboration store before rendering
// ---------------------------------------------------------------------------

function SetupCollaborationState({
  users,
  current,
  children,
}: {
  users: UserPresence[];
  current: CollaborationUser | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const usersMap = new Map<string, UserPresence>();
    for (const u of users) {
      usersMap.set(u.user.id, u);
    }
    useCollaborationStore.setState({
      connected: true,
      roomId: 'story-room',
      currentUser: current,
      users: usersMap,
      followingUserId: null,
    });
    return () => {
      useCollaborationStore.getState().reset();
    };
  }, [users, current]);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof PresencePanel> = {
  title: 'Components/PresencePanel',
  component: PresencePanel,
  args: {
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          background: '#1e1e2e',
          color: '#cdd6f4',
          // Provide CSS variable defaults used by the component
          ['--taskbar-bg' as string]: '#181825',
          ['--taskbar-border' as string]: '#313244',
          ['--text-primary' as string]: '#cdd6f4',
          ['--text-secondary' as string]: '#a6adc8',
          ['--btn-primary-bg' as string]: '#3b82f6',
          ['--btn-primary-text' as string]: '#fff',
          ['--btn-secondary-bg' as string]: '#313244',
          ['--btn-secondary-text' as string]: '#cdd6f4',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PresencePanel>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * When `visible` is false, the panel renders nothing.
 */
export const Hidden: Story = {
  args: {
    visible: false,
  },
};

/**
 * Panel visible with 3 remote users and 1 current user.
 */
export const Default: Story = {
  args: {
    visible: true,
  },
  decorators: [
    (Story) => (
      <SetupCollaborationState users={remoteUsers} current={currentUser}>
        <Story />
      </SetupCollaborationState>
    ),
  ],
};

/**
 * Panel visible but no remote users -- only the current user is shown.
 */
export const Empty: Story = {
  args: {
    visible: true,
  },
  decorators: [
    (Story) => (
      <SetupCollaborationState users={[]} current={currentUser}>
        <Story />
      </SetupCollaborationState>
    ),
  ],
};
