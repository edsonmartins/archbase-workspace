import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { usePermissionsStore } from '@archbase/workspace-state';
import { PermissionPrompt } from './PermissionPrompt';

function PermissionPromptWrapper() {
  const requestPermission = usePermissionsStore((s) => s.requestPermission);

  useEffect(() => {
    requestPermission('demo.app', 'Demo App', '📦', 'notifications').catch(() => {});
  }, [requestPermission]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--desktop-bg)' }}>
      <PermissionPrompt />
    </div>
  );
}

const meta: Meta = {
  title: 'Components/PermissionPrompt',
  component: PermissionPromptWrapper,
};

export default meta;
type Story = StoryObj<typeof PermissionPromptWrapper>;

export const Default: Story = {};
