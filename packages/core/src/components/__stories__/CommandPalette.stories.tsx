import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { RegisteredCommand } from '@archbase/workspace-types';
import { useCommandRegistryStore } from '@archbase/workspace-state';
import { CommandPalette } from '../CommandPalette';

const MOCK_COMMANDS: RegisteredCommand[] = [
  {
    id: 'window.tile-horizontal',
    title: 'Tile Horizontal',
    category: 'Window',
    icon: '|',
    keybinding: 'Cmd+Shift+H',
    source: 'core',
    enabled: true,
  },
  {
    id: 'window.tile-vertical',
    title: 'Tile Vertical',
    category: 'Window',
    icon: '-',
    keybinding: 'Cmd+Shift+V',
    source: 'core',
    enabled: true,
  },
  {
    id: 'window.cascade',
    title: 'Cascade Windows',
    category: 'Window',
    keybinding: 'Cmd+Shift+C',
    source: 'core',
    enabled: true,
  },
  {
    id: 'window.minimize-all',
    title: 'Minimize All',
    category: 'Window',
    keybinding: 'Cmd+M',
    source: 'core',
    enabled: true,
  },
  {
    id: 'app.open-launcher',
    title: 'Open App Launcher',
    category: 'Application',
    keybinding: 'Cmd+K',
    source: 'core',
    enabled: true,
  },
  {
    id: 'app.toggle-theme',
    title: 'Toggle Theme',
    category: 'Appearance',
    source: 'core',
    enabled: true,
  },
  {
    id: 'app.refresh',
    title: 'Refresh All Windows',
    category: 'Application',
    source: 'core',
    enabled: true,
  },
];

function withCommandStore(commands: RegisteredCommand[]) {
  return function CommandStoreDecorator(Story: React.ComponentType) {
    useEffect(() => {
      const cmdsMap = new Map<string, RegisteredCommand>();
      for (const cmd of commands) {
        cmdsMap.set(cmd.id, cmd);
      }
      useCommandRegistryStore.setState({ commands: cmdsMap });

      return () => {
        useCommandRegistryStore.setState({ commands: new Map() });
      };
    }, []);

    return <Story />;
  };
}

const meta: Meta<typeof CommandPalette> = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
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
  },
};

export default meta;

type Story = StoryObj<typeof CommandPalette>;

/**
 * Closed state - the command palette is not visible.
 */
export const Closed: Story = {
  args: {
    visible: false,
  },
};

/**
 * Open state with pre-registered commands.
 * Shows the full command list with categories, shortcuts, and icons.
 */
export const Open: Story = {
  args: {
    visible: true,
  },
  decorators: [withCommandStore(MOCK_COMMANDS)],
};
