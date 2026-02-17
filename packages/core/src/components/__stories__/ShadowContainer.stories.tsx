import type { Meta, StoryObj } from '@storybook/react';
import { ShadowContainer } from '../ShadowContainer';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof ShadowContainer> = {
  title: 'Components/ShadowContainer',
  component: ShadowContainer,
  decorators: [
    (Story) => (
      <div
        style={{
          padding: 24,
          background: '#1e1e2e',
          color: '#cdd6f4',
          minHeight: 120,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ShadowContainer>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Simple children rendered inside a Shadow DOM container.
 */
export const Default: Story = {
  args: {
    children: (
      <div style={{ padding: 16, fontFamily: 'sans-serif', fontSize: 14 }}>
        Hello from Shadow DOM
      </div>
    ),
  },
};
