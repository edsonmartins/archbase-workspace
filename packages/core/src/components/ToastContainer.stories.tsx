import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { useNotificationsStore } from '@archbase/workspace-state';
import { ToastContainer } from './ToastContainer';

function ToastStoryWrapper() {
  const notify = useNotificationsStore((s) => s.notify);

  useEffect(() => {
    notify({
      type: 'info',
      title: 'Information',
      message: 'This is an informational toast notification.',
    });
    notify({
      type: 'success',
      title: 'Success',
      message: 'Operation completed successfully!',
    });
    notify({
      type: 'error',
      title: 'Error',
      message: 'Something went wrong.',
      duration: 0, // persistent
    });
  }, [notify]);

  return <ToastContainer />;
}

const meta: Meta = {
  title: 'Components/ToastContainer',
  component: ToastStoryWrapper,
};

export default meta;
type Story = StoryObj<typeof ToastStoryWrapper>;

export const Default: Story = {};
