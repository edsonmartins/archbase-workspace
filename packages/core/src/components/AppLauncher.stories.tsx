import type { Meta, StoryObj } from '@storybook/react';
import type { AppManifest } from '@archbase/workspace-types';
import { AppLauncher } from './AppLauncher';

const sampleApps: AppManifest[] = [
  {
    id: 'demo.hello',
    name: 'hello',
    version: '1.0.0',
    entrypoint: './App',
    remoteEntry: '',
    displayName: 'Hello World',
    description: 'A simple hello world app',
    icon: '🌍',
    source: 'local',
    permissions: [],
  },
  {
    id: 'demo.calculator',
    name: 'calculator',
    version: '1.0.0',
    entrypoint: './App',
    remoteEntry: '',
    displayName: 'Calculator',
    description: 'A calculator app',
    icon: '🧮',
    source: 'local',
    permissions: [],
  },
  {
    id: 'demo.notes',
    name: 'notes',
    version: '1.0.0',
    entrypoint: './App',
    remoteEntry: '',
    displayName: 'Notes',
    description: 'A notes app',
    icon: '📝',
    source: 'local',
    permissions: [],
  },
];

const meta: Meta<typeof AppLauncher> = {
  title: 'Components/AppLauncher',
  component: AppLauncher,
  args: {
    visible: true,
    apps: sampleApps,
    onClose: () => {},
    onOpenApp: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AppLauncher>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    apps: [],
  },
};
