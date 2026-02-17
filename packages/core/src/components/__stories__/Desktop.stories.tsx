import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { AppManifest, WorkspaceWindow } from '@archbase/workspace-types';
import { useWindowsStore, useAppRegistryStore } from '@archbase/workspace-state';
import { Desktop } from '../Desktop';

/**
 * Helper to build a mock WorkspaceWindow for store pre-population.
 */
function mockWindow(overrides: Partial<WorkspaceWindow> & { id: string; appId: string; title: string }): WorkspaceWindow {
  return {
    position: { x: 100, y: 80 },
    size: { width: 600, height: 400 },
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
    description: 'A simple hello world app',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3001/remoteEntry.js',
    icon: 'H',
    window: { defaultWidth: 500, defaultHeight: 400 },
  },
  {
    id: 'dev.archbase.calculator',
    name: 'calculator',
    version: '1.0.0',
    displayName: 'Calculator',
    description: 'A simple calculator',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3002/remoteEntry.js',
    icon: 'C',
    window: { defaultWidth: 350, defaultHeight: 500 },
  },
  {
    id: 'dev.archbase.notes',
    name: 'notes',
    version: '1.0.0',
    displayName: 'Notes',
    description: 'Markdown notes editor',
    entrypoint: './src/App.tsx',
    remoteEntry: 'http://localhost:3003/remoteEntry.js',
    icon: 'N',
    window: { defaultWidth: 600, defaultHeight: 500 },
  },
];

/**
 * Decorator that resets stores and pre-populates registry with mock apps
 * marked as ready, bypassing the real useRegistryInit which tries to
 * register MF remotes.
 */
function withMockRegistry(Story: React.ComponentType) {
  useEffect(() => {
    const appsMap = new Map<string, AppManifest>();
    for (const app of MOCK_APPS) {
      appsMap.set(app.id, app);
    }
    useAppRegistryStore.setState({ apps: appsMap, status: 'ready', errors: [] });

    return () => {
      useAppRegistryStore.setState({ apps: new Map(), status: 'idle', errors: [] });
      useWindowsStore.setState({ windows: new Map(), focusStack: [] });
    };
  }, []);

  return <Story />;
}

const meta: Meta<typeof Desktop> = {
  title: 'Components/Desktop',
  component: Desktop,
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
    withMockRegistry,
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof Desktop>;

/**
 * Empty desktop with no windows open. Shows the desktop background and taskbar.
 * Registry is pre-populated with mock apps, but no windows have been opened.
 * Note: The Desktop component auto-opens a default window when the registry
 * becomes ready. This story resets the store so you may see a brief auto-open
 * attempt (which will fail gracefully since MF remotes are not available).
 */
export const Empty: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        // Clear any auto-opened windows after the initial render
        const timer = setTimeout(() => {
          useWindowsStore.setState({ windows: new Map(), focusStack: [] });
        }, 50);
        return () => clearTimeout(timer);
      }, []);
      return <Story />;
    },
  ],
};

/**
 * Desktop with 2-3 windows pre-populated in the store.
 * Windows will attempt to render RemoteApp for each, which will show
 * loading/error states since MF remotes are not available in Storybook.
 */
export const WithWindows: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const w1 = mockWindow({
          id: 'win-hello',
          appId: 'dev.archbase.hello-world',
          title: 'Hello World',
          position: { x: 60, y: 40 },
          size: { width: 500, height: 400 },
          zIndex: 0,
          metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
        });
        const w2 = mockWindow({
          id: 'win-calc',
          appId: 'dev.archbase.calculator',
          title: 'Calculator',
          position: { x: 200, y: 120 },
          size: { width: 350, height: 500 },
          zIndex: 1,
          metadata: { icon: 'C', createdAt: Date.now(), focusedAt: Date.now() },
        });
        const w3 = mockWindow({
          id: 'win-notes',
          appId: 'dev.archbase.notes',
          title: 'Notes',
          position: { x: 400, y: 60 },
          size: { width: 600, height: 450 },
          zIndex: 2,
          metadata: { icon: 'N', createdAt: Date.now(), focusedAt: Date.now() },
        });

        const windowsMap = new Map<string, WorkspaceWindow>();
        windowsMap.set(w1.id, w1);
        windowsMap.set(w2.id, w2);
        windowsMap.set(w3.id, w3);

        useWindowsStore.setState({
          windows: windowsMap,
          focusStack: ['win-hello', 'win-calc', 'win-notes'],
        });
      }, []);
      return <Story />;
    },
  ],
};
