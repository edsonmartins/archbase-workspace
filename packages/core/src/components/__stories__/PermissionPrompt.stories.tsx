import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { usePermissionsStore } from '@archbase/workspace-state';
import type { PendingPrompt } from '@archbase/workspace-state';
import { PermissionPrompt } from '../PermissionPrompt';

function withPermissionPrompt(prompt: PendingPrompt | null) {
  return function PermissionPromptDecorator(Story: React.ComponentType) {
    useEffect(() => {
      usePermissionsStore.setState({ pendingPrompt: prompt, promptQueue: [] });

      return () => {
        usePermissionsStore.setState({ pendingPrompt: null, promptQueue: [] });
      };
    }, []);

    return <Story />;
  };
}

const meta: Meta<typeof PermissionPrompt> = {
  title: 'Components/PermissionPrompt',
  component: PermissionPrompt,
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 400,
          background: '#1e1e2e',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PermissionPrompt>;

/**
 * No prompt active - the permission prompt overlay is not rendered.
 */
export const NoPrompt: Story = {
  decorators: [withPermissionPrompt(null)],
};

/**
 * Active permission prompt asking the user to grant the "notifications"
 * permission for a sample app. Shows the app name, permission label,
 * description, and Allow/Deny buttons.
 */
export const WithPrompt: Story = {
  decorators: [
    withPermissionPrompt({
      id: 'prompt-1',
      appId: 'dev.archbase.hello-world',
      appDisplayName: 'Hello World',
      appIcon: 'H',
      permission: 'notifications',
      resolve: (grant) => {
        console.log(`Permission resolved: ${grant}`);
      },
    }),
  ],
};

/**
 * Permission prompt for clipboard.write permission.
 */
export const ClipboardPermission: Story = {
  decorators: [
    withPermissionPrompt({
      id: 'prompt-2',
      appId: 'dev.archbase.notes',
      appDisplayName: 'Notes',
      appIcon: 'N',
      permission: 'clipboard.write',
      resolve: (grant) => {
        console.log(`Permission resolved: ${grant}`);
      },
    }),
  ],
};

/**
 * Permission prompt for storage permission without an app icon.
 */
export const StoragePermissionNoIcon: Story = {
  decorators: [
    withPermissionPrompt({
      id: 'prompt-3',
      appId: 'dev.archbase.calculator',
      appDisplayName: 'Calculator',
      appIcon: undefined,
      permission: 'storage',
      resolve: (grant) => {
        console.log(`Permission resolved: ${grant}`);
      },
    }),
  ],
};
