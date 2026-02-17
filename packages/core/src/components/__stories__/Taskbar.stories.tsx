import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { AppManifest, WorkspaceWindow } from '@archbase/workspace-types';
import { useWindowsStore } from '@archbase/workspace-state';
import { Taskbar } from '../Taskbar';

function mockWindow(overrides: Partial<WorkspaceWindow> & { id: string; appId: string; title: string }): WorkspaceWindow {
  return {
    position: { x: 100, y: 60 },
    size: { width: 500, height: 400 },
    constraints: { minWidth: 200, minHeight: 150, maxWidth: Infinity, maxHeight: Infinity },
    zIndex: 0,
    state: 'normal',
    flags: { resizable: true, maximizable: true, minimizable: true, closable: true, alwaysOnTop: false },
    props: {},
    metadata: { createdAt: Date.now(), focusedAt: Date.now() },
    ...overrides,
  };
}

const MOCK_APPS: AppManifest[] = [
  {
    id: 'dev.archbase.hello-world',
    name: 'hello_world',
    version: '1.0.0',
    displayName: 'Hello World',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3001/remoteEntry.js',
    icon: 'H',
  },
  {
    id: 'dev.archbase.calculator',
    name: 'calculator',
    version: '1.0.0',
    displayName: 'Calculator',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3002/remoteEntry.js',
    icon: 'C',
  },
];

const meta: Meta<typeof Taskbar> = {
  title: 'Components/Taskbar',
  component: Taskbar,
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 60,
          background: '#1e1e2e',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    onOpenApp: () => {},
    onOpenLauncher: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof Taskbar>;

/**
 * Empty taskbar with no running windows. Shows only the launcher button.
 */
export const Empty: Story = {
  args: {
    apps: MOCK_APPS,
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        useWindowsStore.setState({ windows: new Map(), focusStack: [] });
        return () => {
          useWindowsStore.setState({ windows: new Map(), focusStack: [] });
        };
      }, []);
      return <Story />;
    },
  ],
};

/**
 * Taskbar with running windows. Shows window buttons in the taskbar,
 * with the focused window highlighted and minimized window dimmed.
 */
export const WithWindows: Story = {
  args: {
    apps: MOCK_APPS,
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        const w1 = mockWindow({
          id: 'win-1',
          appId: 'dev.archbase.hello-world',
          title: 'Hello World',
          zIndex: 0,
          metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
        });
        const w2 = mockWindow({
          id: 'win-2',
          appId: 'dev.archbase.calculator',
          title: 'Calculator',
          state: 'minimized',
          zIndex: 1,
          metadata: { icon: 'C', createdAt: Date.now(), focusedAt: Date.now() },
        });
        const w3 = mockWindow({
          id: 'win-3',
          appId: 'dev.archbase.hello-world',
          title: 'Hello World (2)',
          zIndex: 2,
          metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
        });

        const windowsMap = new Map<string, WorkspaceWindow>();
        windowsMap.set(w1.id, w1);
        windowsMap.set(w2.id, w2);
        windowsMap.set(w3.id, w3);

        useWindowsStore.setState({
          windows: windowsMap,
          focusStack: ['win-2', 'win-1', 'win-3'],
        });

        return () => {
          useWindowsStore.setState({ windows: new Map(), focusStack: [] });
        };
      }, []);
      return <Story />;
    },
  ],
};
