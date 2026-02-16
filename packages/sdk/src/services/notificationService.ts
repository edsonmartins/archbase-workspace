import { useNotificationsStore } from '@archbase/workspace-state';

export function createNotificationService() {
  const store = useNotificationsStore.getState;

  return {
    info(title: string, message?: string) {
      return store().notify({ type: 'info', title, message });
    },

    success(title: string, message?: string) {
      return store().notify({ type: 'success', title, message });
    },

    warning(title: string, message?: string) {
      return store().notify({ type: 'warning', title, message });
    },

    error(title: string, message?: string) {
      return store().notify({ type: 'error', title, message });
    },

    dismiss(id: string) {
      store().dismiss(id);
    },
  };
}
