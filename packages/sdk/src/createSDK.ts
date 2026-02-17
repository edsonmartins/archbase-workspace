import type { WorkspaceSDK } from '@archbase/workspace-types';
import { useContextMenuStore } from '@archbase/workspace-state';
import { createWindowService } from './services/windowService';
import { createCommandService } from './services/commandService';
import { createNotificationService } from './services/notificationService';
import { createSettingsService } from './services/settingsService';
import { createStorageService } from './services/storageService';
import { createCollaborationService } from './services/collaborationService';

/**
 * Create a WorkspaceSDK instance scoped to a specific app and window.
 * This is the main factory function used by the host to provide SDK
 * instances to remote apps.
 */
export function createWorkspaceSDK(appId: string, windowId: string): WorkspaceSDK {
  return {
    appId,
    windowId,

    windows: createWindowService(appId, windowId),
    commands: createCommandService(appId),
    notifications: createNotificationService(),
    settings: createSettingsService(),
    storage: createStorageService(appId),

    contextMenu: {
      show(position, items) {
        useContextMenuStore.getState().open(position, items);
      },
    },

    // Fail-closed stub: base SDK denies all permissions by default.
    // Use createSecureSDK for proper permission enforcement with prompts.
    permissions: {
      check() {
        return 'denied';
      },
      request() {
        return Promise.resolve(false);
      },
      list() {
        return [];
      },
    },

    collaboration: createCollaborationService(),
  };
}
