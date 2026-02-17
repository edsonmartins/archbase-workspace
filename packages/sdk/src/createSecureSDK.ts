import type { AppManifest, Permission, PermissionGrant, WorkspaceSDK } from '@archbase/workspace-types';
import { usePermissionsStore, ALL_PERMISSIONS } from '@archbase/workspace-state';
import { createWorkspaceSDK } from './createSDK';

// ============================================================
// Permission Enforcement
// ============================================================

function checkAndEnforce(
  appId: string,
  permission: Permission,
  declaredPermissions: Set<Permission>,
): boolean {
  const store = usePermissionsStore.getState();
  const currentGrant = store.checkPermission(appId, permission);

  if (currentGrant === 'granted') return true;
  if (currentGrant === 'denied') return false;

  // State is 'prompt': not yet decided
  if (!declaredPermissions.has(permission)) {
    // Not declared in manifest → deny without persisting
    // (so that adding the permission to manifest later will re-prompt)
    return false;
  }

  // Declared but not yet decided — app must call sdk.permissions.request() first
  return false;
}

// ============================================================
// Wrapped Services
// ============================================================

function wrapNotifications(
  inner: WorkspaceSDK['notifications'],
  appId: string,
  declared: Set<Permission>,
): WorkspaceSDK['notifications'] {
  const check = () => checkAndEnforce(appId, 'notifications', declared);

  return {
    info(title, message?) {
      if (!check()) return '';
      return inner.info(title, message);
    },
    success(title, message?) {
      if (!check()) return '';
      return inner.success(title, message);
    },
    warning(title, message?) {
      if (!check()) return '';
      return inner.warning(title, message);
    },
    error(title, message?) {
      if (!check()) return '';
      return inner.error(title, message);
    },
    dismiss(id) {
      if (!check()) return;
      inner.dismiss(id);
    },
  };
}

function wrapStorage(
  inner: WorkspaceSDK['storage'],
  appId: string,
  declared: Set<Permission>,
): WorkspaceSDK['storage'] {
  const check = () => checkAndEnforce(appId, 'storage', declared);

  return {
    get<T>(key: string): T | null {
      if (!check()) return null;
      return inner.get<T>(key);
    },
    set(key, value) {
      if (!check()) return;
      inner.set(key, value);
    },
    remove(key) {
      if (!check()) return;
      inner.remove(key);
    },
    clear() {
      if (!check()) return;
      inner.clear();
    },
    keys() {
      if (!check()) return [];
      return inner.keys();
    },
  };
}

function wrapCollaboration(
  inner: WorkspaceSDK['collaboration'],
  appId: string,
  declared: Set<Permission>,
): WorkspaceSDK['collaboration'] {
  const check = () => checkAndEnforce(appId, 'collaboration', declared);
  const noop = () => {};

  return {
    get isConnected() { return check() ? inner.isConnected : false; },
    get currentRoom() { return check() ? inner.currentRoom : null; },
    get currentUser() { return check() ? inner.currentUser : null; },

    async join(roomId) {
      if (!check()) return;
      return inner.join(roomId);
    },
    leave() {
      if (!check()) return;
      inner.leave();
    },
    getUsers() { return check() ? inner.getUsers() : []; },
    setStatus(status) {
      if (!check()) return;
      inner.setStatus(status);
    },
    shareWindow(windowId, mode?) {
      if (!check()) return;
      inner.shareWindow(windowId, mode);
    },
    unshareWindow(windowId) {
      if (!check()) return;
      inner.unshareWindow(windowId);
    },
    getSharedWindows() { return check() ? inner.getSharedWindows() : []; },
    followUser(userId) {
      if (!check()) return;
      inner.followUser(userId);
    },
    unfollowUser() {
      if (!check()) return;
      inner.unfollowUser();
    },
    getFollowState() { return { followingUserId: null }; },
    onUserJoined(handler) { return check() ? inner.onUserJoined(handler) : noop; },
    onUserLeft(handler) { return check() ? inner.onUserLeft(handler) : noop; },
    onCursorMove(handler) { return check() ? inner.onCursorMove(handler) : noop; },
    onWindowShared(handler) { return check() ? inner.onWindowShared(handler) : noop; },
  };
}

// ============================================================
// Permissions Service
// ============================================================

function createPermissionsService(
  appId: string,
  manifest: AppManifest,
  declared: Set<Permission>,
): WorkspaceSDK['permissions'] {

  return {
    check(permission: Permission): PermissionGrant {
      const store = usePermissionsStore.getState();
      const grant = store.checkPermission(appId, permission);
      if (grant === 'prompt' && !declared.has(permission)) {
        return 'denied';
      }
      return grant;
    },

    async request(permission: Permission): Promise<boolean> {
      const store = usePermissionsStore.getState();
      const current = store.checkPermission(appId, permission);

      if (current === 'granted') return true;
      if (current === 'denied') return false;

      if (!declared.has(permission)) {
        // Not declared in manifest → deny without persisting
        return false;
      }

      const result = await store.requestPermission(
        appId,
        manifest.displayName ?? manifest.name,
        manifest.icon,
        permission,
      );
      return result === 'granted';
    },

    list() {
      const store = usePermissionsStore.getState();
      return ALL_PERMISSIONS.map((permission) => {
        const grant = store.checkPermission(appId, permission);
        const effective = grant === 'prompt' && !declared.has(permission) ? 'denied' : grant;
        return { permission, grant: effective as PermissionGrant };
      });
    },
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Create a permission-aware SDK instance.
 * Wraps the base SDK with permission checks on notifications and storage services.
 * Other services (windows, commands, contextMenu, settings) are passed through unchanged
 * because they are non-destructive and already scoped per-app.
 *
 * **Currently enforced permissions:**
 * - `'notifications'` — gates `notifications.*` methods
 * - `'storage'` — gates `storage.*` methods
 * - `'collaboration'` — gates `collaboration.*` methods
 */
export function createSecureSDK(
  appId: string,
  windowId: string,
  manifest: AppManifest,
): WorkspaceSDK {
  const innerSDK = createWorkspaceSDK(appId, windowId);
  const declaredPermissions = new Set(manifest.permissions ?? []);

  return {
    appId: innerSDK.appId,
    windowId: innerSDK.windowId,
    windows: innerSDK.windows,
    commands: innerSDK.commands,
    settings: innerSDK.settings,
    contextMenu: innerSDK.contextMenu,

    notifications: wrapNotifications(innerSDK.notifications, appId, declaredPermissions),
    storage: wrapStorage(innerSDK.storage, appId, declaredPermissions),
    permissions: createPermissionsService(appId, manifest, declaredPermissions),
    collaboration: wrapCollaboration(innerSDK.collaboration, appId, declaredPermissions),
  };
}
