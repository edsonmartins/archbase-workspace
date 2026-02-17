import type { Meta, StoryObj } from '@storybook/react';
import type { SnapZone } from '@archbase/workspace-types';
import { SnapPreview } from '../SnapPreview';

const meta: Meta<typeof SnapPreview> = {
  title: 'Components/SnapPreview',
  component: SnapPreview,
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 1920,
          height: 800,
          background: '#1e1e2e',
          border: '1px solid #444',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SnapPreview>;

export const Hidden: Story = {
  args: {
    zone: null,
  },
};

const leftZone: SnapZone = {
  position: 'left',
  bounds: { x: 0, y: 0, width: 960, height: 800 },
  hitArea: { x: 0, y: 0, width: 40, height: 800 },
};

export const Left: Story = {
  args: {
    zone: leftZone,
  },
};

const rightZone: SnapZone = {
  position: 'right',
  bounds: { x: 960, y: 0, width: 960, height: 800 },
  hitArea: { x: 1880, y: 0, width: 40, height: 800 },
};

export const Right: Story = {
  args: {
    zone: rightZone,
  },
};

const topZone: SnapZone = {
  position: 'top',
  bounds: { x: 0, y: 0, width: 1920, height: 400 },
  hitArea: { x: 0, y: 0, width: 1920, height: 40 },
};

export const Top: Story = {
  args: {
    zone: topZone,
  },
};
