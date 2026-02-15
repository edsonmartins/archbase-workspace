import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { WorkspaceNotification, NotificationType } from '@archbase/workspace-types';

// ============================================================
// Types
// ============================================================

export interface NotifyOptions {
  type: NotificationType;
  title: string;
  message?: string;
  /** Duration in ms. 0 = persistent. Default: 5000 */
  duration?: number;
  dismissible?: boolean;
}

interface NotificationsStoreState {
  notifications: Map<string, WorkspaceNotification>;
}

interface NotificationsStoreActions {
  notify: (opts: NotifyOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

type NotificationsStore = NotificationsStoreState & NotificationsStoreActions;

const DEFAULT_DURATION = 5000;
const MAX_NOTIFICATIONS = 100;

// ============================================================
// Store
// ============================================================

export const useNotificationsStore = create<NotificationsStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      notifications: new Map(),

      notify: (opts) => {
        const id = crypto.randomUUID();
        const notification: WorkspaceNotification = {
          id,
          type: opts.type,
          title: opts.title,
          message: opts.message,
          duration: opts.duration ?? DEFAULT_DURATION,
          createdAt: Date.now(),
          dismissible: opts.dismissible ?? true,
        };

        set((state) => {
          const notifications = new Map(state.notifications);
          notifications.set(id, notification);

          // Evict oldest entries if exceeding limit
          if (notifications.size > MAX_NOTIFICATIONS) {
            const iter = notifications.keys();
            while (notifications.size > MAX_NOTIFICATIONS) {
              const oldest = iter.next().value;
              if (oldest !== undefined) notifications.delete(oldest);
            }
          }

          return { notifications };
        });

        return id;
      },

      dismiss: (id) => {
        const { notifications } = get();
        if (!notifications.has(id)) return;

        set((state) => {
          const notifications = new Map(state.notifications);
          notifications.delete(id);
          return { notifications };
        });
      },

      dismissAll: () => {
        set({ notifications: new Map() });
      },
    })),
    { name: 'NotificationsStore' },
  ),
);

// ============================================================
// React Hook Selectors
// ============================================================

let cachedNotificationsArray: WorkspaceNotification[] = [];
let cachedNotificationsMap: Map<string, WorkspaceNotification> | null = null;

export const useNotifications = () =>
  useNotificationsStore((state) => {
    if (state.notifications !== cachedNotificationsMap) {
      cachedNotificationsMap = state.notifications;
      cachedNotificationsArray = Array.from(state.notifications.values());
    }
    return cachedNotificationsArray;
  });
