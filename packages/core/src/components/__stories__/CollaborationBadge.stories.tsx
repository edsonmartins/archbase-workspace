import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { useCollaborationStore } from '@archbase/workspace-state';
import type { SharedWindowInfo } from '@archbase/workspace-types';
import { CollaborationBadge } from '../CollaborationBadge';

// ---------------------------------------------------------------------------
// Helper decorator that populates the collaboration store with shared windows
// ---------------------------------------------------------------------------

interface SetupSharedWindowsProps {
  windowId: string;
  participants: string[];
  children: React.ReactNode;
}

function SetupSharedWindows({ windowId, participants, children }: SetupSharedWindowsProps) {
  useEffect(() => {
    const sharedWindows = new Map<string, SharedWindowInfo>();
    sharedWindows.set(windowId, {
      windowId,
      sharedBy: 'user-1',
      mode: 'edit',
      participants,
    });
    useCollaborationStore.setState({ sharedWindows });
    return () => {
      useCollaborationStore.setState({ sharedWindows: new Map() });
    };
  }, [windowId, participants]);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof CollaborationBadge> = {
  title: 'Components/CollaborationBadge',
  component: CollaborationBadge,
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 24,
          background: '#1e1e2e',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 60,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CollaborationBadge>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * When the window is NOT in the shared windows list, the badge returns null.
 */
export const NoPeers: Story = {
  args: {
    windowId: 'win-not-shared',
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        useCollaborationStore.setState({ sharedWindows: new Map() });
        return () => {
          useCollaborationStore.setState({ sharedWindows: new Map() });
        };
      }, []);
      return <Story />;
    },
  ],
};

/**
 * Window shared with 2 participants.
 */
export const WithPeers: Story = {
  args: {
    windowId: 'win-shared-2',
  },
  decorators: [
    (Story) => (
      <SetupSharedWindows windowId="win-shared-2" participants={['user-1', 'user-2']}>
        <Story />
      </SetupSharedWindows>
    ),
  ],
};

/**
 * Window shared with 5 participants.
 */
export const ManyPeers: Story = {
  args: {
    windowId: 'win-shared-5',
  },
  decorators: [
    (Story) => (
      <SetupSharedWindows
        windowId="win-shared-5"
        participants={['user-1', 'user-2', 'user-3', 'user-4', 'user-5']}
      >
        <Story />
      </SetupSharedWindows>
    ),
  ],
};
