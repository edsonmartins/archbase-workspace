import type { Meta, StoryObj } from '@storybook/react';
import { useCommandRegistryStore } from '@archbase/workspace-state';
import { useEffect } from 'react';
import { CommandPalette } from './CommandPalette';

function CommandPaletteWrapper() {
  const register = useCommandRegistryStore((s) => s.register);

  useEffect(() => {
    register({
      id: 'story.hello',
      title: 'Say Hello',
      category: 'Demo',
      icon: '👋',
      source: 'story',
      enabled: true,
      handler: () => alert('Hello!'),
    });
    register({
      id: 'story.settings',
      title: 'Open Settings',
      category: 'Workspace',
      icon: '⚙️',
      keybinding: 'Cmd+,',
      source: 'story',
      enabled: true,
      handler: () => alert('Settings'),
    });
  }, [register]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--desktop-bg)' }}>
      <CommandPalette visible={true} onClose={() => {}} />
    </div>
  );
}

const meta: Meta = {
  title: 'Components/CommandPalette',
  component: CommandPaletteWrapper,
};

export default meta;
type Story = StoryObj<typeof CommandPaletteWrapper>;

export const Default: Story = {};
