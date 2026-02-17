import type { Meta, StoryObj } from '@storybook/react';
import type { AppManifest } from '@archbase/workspace-types';
import { AppLauncher } from '../AppLauncher';

const MOCK_APPS: AppManifest[] = [
  {
    id: 'dev.archbase.hello-world',
    name: 'hello_world',
    version: '1.0.0',
    displayName: 'Hello World',
    description: 'A simple hello world demonstration app',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3001/remoteEntry.js',
    icon: 'H',
    keywords: ['demo', 'hello'],
  },
  {
    id: 'dev.archbase.calculator',
    name: 'calculator',
    version: '1.0.0',
    displayName: 'Calculator',
    description: 'A simple calculator with Jotai state management',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3002/remoteEntry.js',
    icon: 'C',
    keywords: ['math', 'calculator'],
  },
  {
    id: 'dev.archbase.notes',
    name: 'notes',
    version: '1.0.0',
    displayName: 'Notes',
    description: 'Markdown notes editor with local storage persistence',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3003/remoteEntry.js',
    icon: 'N',
    keywords: ['notes', 'markdown', 'editor'],
  },
  {
    id: 'dev.archbase.settings',
    name: 'settings',
    version: '1.0.0',
    displayName: 'Settings',
    description: 'Workspace settings and preferences',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3004/remoteEntry.js',
    icon: 'S',
    keywords: ['settings', 'preferences', 'config'],
  },
];

const meta: Meta<typeof AppLauncher> = {
  title: 'Components/AppLauncher',
  component: AppLauncher,
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 500,
          background: '#1e1e2e',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    onClose: () => {},
    onOpenApp: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof AppLauncher>;

/**
 * Closed state - the app launcher overlay is not visible.
 */
export const Closed: Story = {
  args: {
    visible: false,
    apps: MOCK_APPS,
  },
};

/**
 * Open state with registered apps. Shows the search input and list of
 * available applications with their icons, names, and descriptions.
 */
export const Open: Story = {
  args: {
    visible: true,
    apps: MOCK_APPS,
  },
};
