import type { ActivationEvent, AppManifest, Unsubscribe } from '@archbase/workspace-types';
import { useAppRegistryStore, onAppRegistered } from '../stores/registry';

// ============================================================
// Internal State
// ============================================================

const activatedApps = new Set<string>();
const pendingActivations = new Map<string, AppManifest[]>();
const disposers: Unsubscribe[] = [];
let initialized = false;

// ============================================================
// Helpers
// ============================================================

function buildActivationMap(): void {
  pendingActivations.clear();
  const allApps = useAppRegistryStore.getState().apps;
  allApps.forEach((manifest) => {
    if (!manifest.activationEvents?.length) return;
    for (const event of manifest.activationEvents) {
      if (!pendingActivations.has(event)) {
        pendingActivations.set(event, []);
      }
      pendingActivations.get(event)!.push(manifest);
    }
  });
}

function addManifestToMap(manifest: AppManifest): void {
  if (!manifest.activationEvents?.length) return;
  for (const event of manifest.activationEvents) {
    if (!pendingActivations.has(event)) {
      pendingActivations.set(event, []);
    }
    const list = pendingActivations.get(event)!;
    if (!list.find((m) => m.id === manifest.id)) {
      list.push(manifest);
    }
  }
}

function activateApp(manifest: AppManifest): void {
  if (activatedApps.has(manifest.id)) return;
  activatedApps.add(manifest.id);
  // Note: contributions are already processed by the registry at registration time.
  // ActivationService only tracks activation state for lazy-loading of MF remotes.
}

function activateForEvent(event: ActivationEvent): void {
  const manifests = pendingActivations.get(event);
  if (!manifests?.length) return;
  for (const manifest of manifests) {
    activateApp(manifest);
  }
}


// ============================================================
// Public API
// ============================================================

export const activationService = {
  /**
   * Initialize the activation service.
   * Builds the activation map from all registered manifests,
   * fires 'onDesktopReady', and subscribes to new app registrations.
   */
  init(): void {
    if (initialized) return;
    initialized = true;

    buildActivationMap();

    // Fire onDesktopReady
    activateForEvent('onDesktopReady');

    // Subscribe to new app registrations
    const unsub = onAppRegistered((app) => {
      addManifestToMap(app);
      // If the app has onDesktopReady and we're already initialized, activate it
      if (app.activationEvents?.includes('onDesktopReady')) {
        activateApp(app);
      }
    });
    disposers.push(unsub);
  },

  /**
   * Fire an activation event. Any apps waiting for this event
   * will be activated.
   */
  fireEvent(event: ActivationEvent): void {
    activateForEvent(event);
  },

  /**
   * Check if an app has been activated.
   */
  isActivated(appId: string): boolean {
    return activatedApps.has(appId);
  },

  /**
   * Get list of app IDs that have not yet been activated.
   */
  getPendingApps(): string[] {
    const allApps = useAppRegistryStore.getState().apps;
    const pending: string[] = [];
    allApps.forEach((_, id) => {
      if (!activatedApps.has(id)) pending.push(id);
    });
    return pending;
  },

  /**
   * Dispose all listeners and reset internal state.
   */
  dispose(): void {
    for (const unsub of disposers) {
      unsub();
    }
    disposers.length = 0;
    activatedApps.clear();
    pendingActivations.clear();
    initialized = false;
  },
};
