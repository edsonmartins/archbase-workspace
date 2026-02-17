import type { WorkspaceSDK } from '@archbase/workspace-types';
import type { Permission, PermissionGrant, SettingValue, WindowState, CommandHandler } from '@archbase/workspace-types';
import { BRIDGE_MARKER, isBridgeMessage } from './types';
import type { BridgeResponse, BridgeError } from './types';

/** Default timeout for bridge calls (ms) */
const DEFAULT_TIMEOUT = 10_000;

/** Generate a cryptographically random request ID */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * SDK interface for sandboxed iframe apps.
 * Extends WorkspaceSDK but overrides methods that become async over the bridge.
 * Callers must `await` windows.open() and windows.getAll() in sandboxed mode.
 */
export interface IframeBridgeSDK extends Omit<WorkspaceSDK, 'windows'> {
  /** Clean up the bridge listener and reject all pending requests */
  destroy(): void;

  readonly windows: {
    /** Returns a Promise in bridge mode (unlike the sync host SDK) */
    open(opts: { title: string; width?: number; height?: number; props?: Record<string, unknown> }): Promise<string>;
    close(windowId?: string): void;
    minimize(windowId?: string): void;
    maximize(windowId?: string): void;
    restore(windowId?: string): void;
    setTitle(title: string, windowId?: string): void;
    /** Returns a Promise in bridge mode (unlike the sync host SDK) */
    getAll(): Promise<Array<{ id: string; title: string; state: WindowState }>>;
  };
}

export interface IframeBridgeOptions {
  /** Target origin for postMessage. Defaults to '*' (dev only — set to host origin in production). */
  targetOrigin?: string;
}

/**
 * Creates a WorkspaceSDK-compatible object that communicates via postMessage
 * to the host bridge. All bridged methods are fire-and-forget for void returns.
 *
 * This is used inside a sandboxed iframe app.
 */
export function createIframeBridgeSDK(appId: string, windowId: string, options?: IframeBridgeOptions): IframeBridgeSDK {
  const targetOrigin = options?.targetOrigin ?? '*';
  const pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  function handleMessage(event: MessageEvent) {
    // Only accept messages from parent window
    if (event.source !== window.parent) return;

    // Origin validation (defense-in-depth)
    if (targetOrigin !== '*' && event.origin !== targetOrigin) return;

    if (!isBridgeMessage(event.data)) return;
    const msg = event.data;

    if (msg.type === 'sdk-response') {
      const response = msg as BridgeResponse;
      const pending = pendingRequests.get(response.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(response.id);
        pending.resolve(response.result);
      }
    } else if (msg.type === 'sdk-error') {
      const error = msg as BridgeError;
      const pending = pendingRequests.get(error.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(error.id);
        pending.reject(new Error(error.error));
      }
    }
  }

  window.addEventListener('message', handleMessage);

  /**
   * Send a bridge request to the host and return a promise for the response.
   */
  function call(method: string, args: unknown[], timeout = DEFAULT_TIMEOUT): Promise<unknown> {
    const id = generateId();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`Bridge timeout: ${method}`));
      }, timeout);

      pendingRequests.set(id, { resolve, reject, timer });

      window.parent.postMessage(
        {
          [BRIDGE_MARKER]: true,
          type: 'sdk-request',
          id,
          method,
          args,
        },
        targetOrigin,
      );
    });
  }

  /** Fire-and-forget: call without caring about response/errors */
  function fire(method: string, args: unknown[]): void {
    call(method, args).catch(() => {
      // Swallow errors for fire-and-forget operations
    });
  }

  function destroy() {
    window.removeEventListener('message', handleMessage);
    for (const [id, entry] of pendingRequests) {
      clearTimeout(entry.timer);
      entry.reject(new Error('Bridge destroyed'));
    }
    pendingRequests.clear();
  }

  return {
    appId,
    windowId,
    destroy,

    windows: {
      async open(opts) {
        const result = await call('windows.open', [opts]);
        return result as string;
      },
      close(wId) {
        fire('windows.close', [wId]);
      },
      minimize(wId) {
        fire('windows.minimize', [wId]);
      },
      maximize(wId) {
        fire('windows.maximize', [wId]);
      },
      restore(wId) {
        fire('windows.restore', [wId]);
      },
      setTitle(title, wId) {
        fire('windows.setTitle', [title, wId]);
      },
      async getAll() {
        const result = await call('windows.getAll', []);
        return result as Array<{ id: string; title: string; state: WindowState }>;
      },
    },

    commands: {
      register(_commandId: string, _handler: CommandHandler) {
        // Registration cannot be bridged — callbacks don't serialize.
        // Sandboxed apps should use contributes.commands in manifest instead.
        return () => {};
      },
      execute(commandId, ...args) {
        return call('commands.execute', [commandId, ...args]) as Promise<void>;
      },
    },

    notifications: {
      info(title, message?) {
        fire('notifications.info', [title, message]);
        return '';
      },
      success(title, message?) {
        fire('notifications.success', [title, message]);
        return '';
      },
      warning(title, message?) {
        fire('notifications.warning', [title, message]);
        return '';
      },
      error(title, message?) {
        fire('notifications.error', [title, message]);
        return '';
      },
      dismiss(id) {
        fire('notifications.dismiss', [id]);
      },
    },

    settings: {
      get<T extends SettingValue>(_key: string): T | undefined {
        // Sync get can't be bridged via postMessage (requires async round-trip).
        // Sandboxed apps that need settings should pre-load them via the host
        // or use an async wrapper around permissions.request().
        return undefined;
      },
      set(key, value) {
        fire('settings.set', [key, value]);
      },
      onChange(_key: string, _handler: (value: SettingValue) => void) {
        // Event subscriptions can't be bridged — callbacks don't serialize.
        // Sandboxed apps should poll settings.get() or use a dedicated
        // bridge event channel (future enhancement).
        return () => {};
      },
    },

    storage: {
      get<T>(_key: string): T | null {
        // Sync get can't be bridged
        return null;
      },
      set(key, value) {
        fire('storage.set', [key, value]);
      },
      remove(key) {
        fire('storage.remove', [key]);
      },
      clear() {
        fire('storage.clear', []);
      },
      keys() {
        // Sync keys() can't be bridged
        return [];
      },
    },

    contextMenu: {
      show(position, items) {
        // H7: Callbacks in items.action won't survive postMessage serialization.
        // Only the serializable properties (id, label, icon) will be sent.
        fire('contextMenu.show', [position, items.map(({ action: _, ...rest }) => rest)]);
      },
    },

    permissions: {
      check(_permission: Permission): PermissionGrant {
        // Sync check can't be bridged — fail closed
        return 'denied';
      },
      async request(permission) {
        const result = await call('permissions.request', [permission]);
        return result as boolean;
      },
      list() {
        // Sync list() can't be bridged
        return [];
      },
    },

    collaboration: {
      get isConnected() { return false; },
      get currentRoom() { return null; },
      get currentUser() { return null; },
      async join() { /* no-op in sandboxed iframe */ },
      leave() {},
      getUsers() { return []; },
      setStatus() {},
      shareWindow() {},
      unshareWindow() {},
      getSharedWindows() { return []; },
      followUser() {},
      unfollowUser() {},
      getFollowState() { return { followingUserId: null }; },
      onUserJoined() { return () => {}; },
      onUserLeft() { return () => {}; },
      onCursorMove() { return () => {}; },
      onWindowShared() { return () => {}; },
    },
  };
}
