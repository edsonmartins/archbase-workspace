import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { RegisteredWidget } from '@archbase/workspace-types';
import { useWidgetRegistryStore } from '@archbase/workspace-state';
import { StatusBarWidgets } from '../StatusBarWidgets';

const meta: Meta<typeof StatusBarWidgets> = {
  title: 'Components/StatusBarWidgets',
  component: StatusBarWidgets,
  decorators: [
    (Story) => (
      <div
        style={{
          background: '#1e1e2e',
          color: '#cdd6f4',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          minHeight: 32,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof StatusBarWidgets>;

/**
 * Wrapper that registers widgets into the WidgetRegistryStore on mount
 * and cleans them up on unmount, so StatusBarWidgets can read them.
 */
function WithRegisteredWidgets({
  widgets,
  children,
}: {
  widgets: RegisteredWidget[];
  children: React.ReactNode;
}) {
  useEffect(() => {
    const store = useWidgetRegistryStore.getState();
    widgets.forEach((w) => store.register(w));
    return () => {
      widgets.forEach((w) => store.unregister(w.id));
    };
  }, [widgets]);
  return <>{children}</>;
}

export const Empty: Story = {
  render: () => {
    // Ensure the store is clean before rendering
    useEffect(() => {
      const state = useWidgetRegistryStore.getState();
      const allWidgets = state.getAllWidgets();
      allWidgets.forEach((w) => state.unregister(w.id));
    }, []);
    return <StatusBarWidgets />;
  },
};

const sampleWidgets: RegisteredWidget[] = [
  {
    id: 'widget-clock',
    title: 'Clock',
    component: 'ClockWidget',
    defaultLocation: 'statusBar',
    source: 'story-app',
    visible: true,
    order: 1,
  },
  {
    id: 'widget-cpu',
    title: 'CPU: 42%',
    component: 'CpuWidget',
    defaultLocation: 'statusBar',
    source: 'story-app',
    visible: true,
    order: 2,
  },
  {
    id: 'widget-network',
    title: 'Network: OK',
    component: 'NetworkWidget',
    defaultLocation: 'statusBar',
    source: 'story-app',
    visible: true,
    order: 3,
  },
];

export const WithWidgets: Story = {
  render: () => (
    <WithRegisteredWidgets widgets={sampleWidgets}>
      <StatusBarWidgets />
    </WithRegisteredWidgets>
  ),
};
