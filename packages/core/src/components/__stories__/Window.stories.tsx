import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { WorkspaceWindow, AppManifest } from '@archbase/workspace-types';
import { useWindowsStore, useAppRegistryStore } from '@archbase/workspace-state';
import { Window } from '../Window';

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

const MOCK_APP: AppManifest = {
  id: 'dev.archbase.hello-world',
  name: 'hello_world',
  version: '1.0.0',
  displayName: 'Hello World',
  entrypoint: './src/App.tsx',
  remoteEntry: 'http://localhost:3001/remoteEntry.js',
  icon: 'H',
};

function withStoreSetup(
  windows: WorkspaceWindow[],
  focusStack: string[],
): (Story: React.ComponentType) => React.JSX.Element {
  return function StoreSetupDecorator(Story: React.ComponentType) {
    useEffect(() => {
      const appsMap = new Map<string, AppManifest>();
      appsMap.set(MOCK_APP.id, MOCK_APP);
      useAppRegistryStore.setState({ apps: appsMap, status: 'ready', errors: [] });

      const windowsMap = new Map<string, WorkspaceWindow>();
      for (const w of windows) {
        windowsMap.set(w.id, w);
      }
      useWindowsStore.setState({ windows: windowsMap, focusStack });

      return () => {
        useWindowsStore.setState({ windows: new Map(), focusStack: [] });
        useAppRegistryStore.setState({ apps: new Map(), status: 'idle', errors: [] });
      };
    }, []);

    return <Story />;
  };
}

const meta: Meta<typeof Window> = {
  title: 'Components/Window',
  component: Window,
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 1200,
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
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Window>;

const normalWindow = mockWindow({
  id: 'win-default',
  appId: 'dev.archbase.hello-world',
  title: 'Hello World',
  position: { x: 80, y: 40 },
  metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
});

/**
 * Default window in normal state with full controls.
 */
export const Default: Story = {
  args: {
    windowId: 'win-default',
    animationState: null,
  },
  decorators: [withStoreSetup([normalWindow], ['win-default'])],
};

const maximizedWindow = mockWindow({
  id: 'win-maximized',
  appId: 'dev.archbase.hello-world',
  title: 'Hello World (Maximized)',
  state: 'maximized',
  position: { x: 0, y: 0 },
  size: { width: 1200, height: 752 },
  previousBounds: {
    position: { x: 80, y: 40 },
    size: { width: 500, height: 400 },
    previousState: 'normal',
  },
  metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
});

/**
 * Window in maximized state. No resize handles, fills available area.
 */
export const Maximized: Story = {
  args: {
    windowId: 'win-maximized',
    animationState: null,
  },
  decorators: [withStoreSetup([maximizedWindow], ['win-maximized'])],
};

const minimizedWindow = mockWindow({
  id: 'win-minimized',
  appId: 'dev.archbase.hello-world',
  title: 'Hello World (Minimized)',
  state: 'minimized',
  previousBounds: {
    position: { x: 100, y: 60 },
    size: { width: 500, height: 400 },
    previousState: 'normal',
  },
  metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
});

/**
 * Minimized window. The Window component returns null for minimized windows
 * (they are only visible in the taskbar). This story demonstrates that
 * the window is not rendered when state is 'minimized' and not animating.
 */
export const Minimized: Story = {
  args: {
    windowId: 'win-minimized',
    animationState: null,
  },
  decorators: [withStoreSetup([minimizedWindow], ['win-minimized'])],
};

const multipleWindows = [
  mockWindow({
    id: 'win-m1',
    appId: 'dev.archbase.hello-world',
    title: 'Window 1',
    position: { x: 40, y: 30 },
    size: { width: 400, height: 300 },
    zIndex: 0,
    metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
  }),
  mockWindow({
    id: 'win-m2',
    appId: 'dev.archbase.hello-world',
    title: 'Window 2',
    position: { x: 200, y: 120 },
    size: { width: 400, height: 300 },
    zIndex: 1,
    metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
  }),
  mockWindow({
    id: 'win-m3',
    appId: 'dev.archbase.hello-world',
    title: 'Window 3',
    position: { x: 360, y: 200 },
    size: { width: 400, height: 300 },
    zIndex: 2,
    metadata: { icon: 'H', createdAt: Date.now(), focusedAt: Date.now() },
  }),
];

/**
 * Multiple overlapping windows with different z-indexes.
 * The last window in the focus stack is the focused one.
 */
export const Multiple: Story = {
  args: {
    windowId: 'win-m3',
    animationState: null,
  },
  decorators: [
    withStoreSetup(multipleWindows, ['win-m1', 'win-m2', 'win-m3']),
    (Story) => (
      <>
        <Window windowId="win-m1" animationState={null} />
        <Window windowId="win-m2" animationState={null} />
        <Story />
      </>
    ),
  ],
};
