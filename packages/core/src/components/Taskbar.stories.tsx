import type { Meta, StoryObj } from '@storybook/react';
import type { AppManifest } from '@archbase/workspace-types';
import { Taskbar } from './Taskbar';

const sampleApps: AppManifest[] = [
  {
    id: 'story.app1',
    name: 'app1',
    version: '1.0.0',
    entrypoint: './App',
    remoteEntry: '',
    displayName: 'App One',
    icon: '📦',
    source: 'local',
    permissions: [],
  },
  {
    id: 'story.app2',
    name: 'app2',
    version: '1.0.0',
    entrypoint: './App',
    remoteEntry: '',
    displayName: 'App Two',
    icon: '🧮',
    source: 'local',
    permissions: [],
  },
];

const meta: Meta<typeof Taskbar> = {
  title: 'Components/Taskbar',
  component: Taskbar,
  args: {
    apps: sampleApps,
    onOpenApp: () => {},
    onOpenLauncher: () => {},
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Taskbar>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    apps: [],
  },
};
