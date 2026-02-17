import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { useCollaborationStore } from '@archbase/workspace-state';
import type { RemoteCursor } from '@archbase/workspace-types';
import { CursorOverlay } from '../CursorOverlay';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const cursorAlice: RemoteCursor = {
  user: { id: 'alice', displayName: 'Alice', color: '#f43f5e' },
  cursor: { x: 200, y: 150, visible: true },
  lastUpdate: Date.now(),
};

const cursorBob: RemoteCursor = {
  user: { id: 'bob', displayName: 'Bob', color: '#22c55e' },
  cursor: { x: 500, y: 320, visible: true },
  lastUpdate: Date.now(),
};

const cursorCharlie: RemoteCursor = {
  user: { id: 'charlie', displayName: 'Charlie', color: '#a855f7' },
  cursor: { x: 350, y: 480, visible: true },
  lastUpdate: Date.now(),
};

// ---------------------------------------------------------------------------
// Helper: populate the cursor store
// ---------------------------------------------------------------------------

function SetupCursors({
  cursors,
  children,
}: {
  cursors: RemoteCursor[];
  children: React.ReactNode;
}) {
  useEffect(() => {
    const cursorsMap = new Map<string, RemoteCursor>();
    for (const c of cursors) {
      cursorsMap.set(c.user.id, c);
    }
    useCollaborationStore.setState({ cursors: cursorsMap });
    return () => {
      useCollaborationStore.setState({ cursors: new Map() });
    };
  }, [cursors]);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof CursorOverlay> = {
  title: 'Components/CursorOverlay',
  component: CursorOverlay,
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
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

type Story = StoryObj<typeof CursorOverlay>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * No remote cursors -- the overlay renders nothing.
 */
export const NoCursors: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useCollaborationStore.setState({ cursors: new Map() });
        return () => {
          useCollaborationStore.setState({ cursors: new Map() });
        };
      }, []);
      return <Story />;
    },
  ],
};

/**
 * Three remote cursors at different positions with distinct names/colors.
 */
export const WithCursors: Story = {
  decorators: [
    (Story) => (
      <SetupCursors cursors={[cursorAlice, cursorBob, cursorCharlie]}>
        <Story />
      </SetupCursors>
    ),
  ],
};
