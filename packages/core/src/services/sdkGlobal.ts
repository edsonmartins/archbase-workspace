import { createSecureSDK } from '@archbase/workspace-sdk';
import { registryQueries } from '@archbase/workspace-state';
import type { AppManifest } from '@archbase/workspace-types';

/** Deny-all fallback manifest when no registered manifest is found */
const DENY_ALL_MANIFEST: AppManifest = {
  id: 'unknown',
  name: 'unknown',
  version: '0.0.0',
  entrypoint: '',
  remoteEntry: '',
  permissions: [], // No permissions declared → all guarded services blocked
};

declare global {
  interface Window {
    __archbase_workspace__?: {
      createSDK: (appId: string, windowId: string) => ReturnType<typeof createSecureSDK>;
    };
  }
}

/**
 * Injects a global SDK factory for non-React apps (Angular, Vue, Svelte).
 * Usage: window.__archbase_workspace__.createSDK('my-app', 'win-1')
 *
 * Uses createSecureSDK to enforce the permission system.
 * If the app has a registered manifest, its declared permissions apply.
 * Otherwise a deny-all fallback manifest is used.
 */
export function injectGlobalSDK(): void {
  if (typeof globalThis.window === 'undefined') return;
  if (globalThis.window.__archbase_workspace__) return; // Already injected

  globalThis.window.__archbase_workspace__ = {
    createSDK: (appId: string, windowId: string) => {
      const manifest = registryQueries.getApp(appId) ?? { ...DENY_ALL_MANIFEST, id: appId, name: appId };
      return createSecureSDK(appId, windowId, manifest);
    },
  };
}
