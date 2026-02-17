import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { WorkspaceWindow, WindowState } from '@archbase/workspace-types';
import { useWindowsStore } from '@archbase/workspace-state';
import { WindowHeader } from '../WindowHeader';

const meta: Meta<typeof WindowHeader> = {
  title: 'Components/WindowHeader',
  component: WindowHeader,
  decorators: [
    (Story) => (
      <div
        style={{
          width: 600,
          border: '1px solid var(--window-border-color, #555)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#2b2b3c',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof WindowHeader>;

/**
 * Helper that injects a WorkspaceWindow directly into the Zustand store
 * and renders WindowHeader once the window is available.
 */
function WindowHeaderSetup({
  title,
  windowState = 'normal',
  isFocused = true,
  icon,
}: {
  title: string;
  windowState?: WindowState;
  isFocused?: boolean;
  icon?: string;
}) {
  const [windowId, setWindowId] = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    const id = `story-${now}`;

    const win: WorkspaceWindow = {
      id,
      appId: 'story-app',
      title,
      position: { x: 100, y: 100 },
      size: { width: 600, height: 400 },
      constraints: { minWidth: 200, minHeight: 150, maxWidth: Infinity, maxHeight: Infinity },
      zIndex: 1,
      state: windowState,
      flags: {
        resizable: true,
        maximizable: true,
        minimizable: true,
        closable: true,
        alwaysOnTop: false,
      },
      props: {},
      metadata: {
        icon,
        createdAt: now,
        focusedAt: now,
      },
    };

    // Directly set the window in the store
    useWindowsStore.setState((state) => {
      const windows = new Map(state.windows);
      windows.set(id, win);
      return {
        windows,
        focusStack: [...state.focusStack, id],
      };
    });

    setWindowId(id);

    return () => {
      useWindowsStore.setState((state) => {
        const windows = new Map(state.windows);
        windows.delete(id);
        return {
          windows,
          focusStack: state.focusStack.filter((wid) => wid !== id),
        };
      });
    };
  }, [title, windowState, icon]);

  if (!windowId) return null;

  const noop = () => {
    /* drag handler stub */
  };

  return (
    <WindowHeader
      windowId={windowId}
      isFocused={isFocused}
      onDragPointerDown={noop as unknown as (e: React.PointerEvent) => void}
    />
  );
}

export const Default: Story = {
  render: () => <WindowHeaderSetup title="My Application" />,
};

export const Maximized: Story = {
  render: () => <WindowHeaderSetup title="Maximized Window" windowState="maximized" />,
};

export const WithLongTitle: Story = {
  render: () => (
    <WindowHeaderSetup title="This is an extremely long window title that should be truncated with an ellipsis when the window is not wide enough to display it fully" />
  ),
};

export const Unfocused: Story = {
  render: () => <WindowHeaderSetup title="Background Window" isFocused={false} />,
};

export const WithIcon: Story = {
  render: () => <WindowHeaderSetup title="Calculator" icon="🧮" />,
};
