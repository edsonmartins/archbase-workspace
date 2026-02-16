import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { useWindowsStore } from '@archbase/workspace-state';
import { Window } from './Window';

function WindowStoryWrapper({ state = 'normal' as const }) {
  const openWindow = useWindowsStore((s) => s.openWindow);
  const windows = useWindowsStore((s) => s.windows);
  const windowId = Object.keys(windows)[0];

  useEffect(() => {
    if (Object.keys(windows).length === 0) {
      openWindow({
        appId: 'story.window',
        title: 'Story Window',
        width: 500,
        height: 400,
        icon: '📦',
      });
    }
  }, [openWindow, windows]);

  if (!windowId) return null;
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: 'var(--desktop-bg)' }}>
      <Window windowId={windowId} animationState={null} />
    </div>
  );
}

const meta: Meta = {
  title: 'Components/Window',
  component: WindowStoryWrapper,
};

export default meta;
type Story = StoryObj<typeof WindowStoryWrapper>;

export const Default: Story = {};
