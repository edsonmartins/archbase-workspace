import { useEffect, useRef } from 'react';
import { useAppRegistryStore, useRegistryStatus, activationService, useMarketplaceStore } from '@archbase/workspace-state';
import { KNOWN_MANIFESTS } from '../knownManifests';
import { registerAllMFRemotes } from '../services/remoteLoader';
import { injectGlobalSDK } from '../services/sdkGlobal';

const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Initializes the AppRegistry with known manifests and registers MF remotes.
 * Also reactivates previously installed marketplace plugins from IDB.
 * Runs once on mount. Components should wait for registryStatus === 'ready'
 * before depending on registry data.
 */
export function useRegistryInit(): void {
  const initialized = useRef(false);
  const registerManifests = useAppRegistryStore((s) => s.registerManifests);
  const setStatus = useAppRegistryStore((s) => s.setStatus);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setStatus('loading');

    try {
      // Register known manifests (sync validation)
      registerManifests(KNOWN_MANIFESTS);

      // Reactivate installed marketplace plugins
      const { installed } = useMarketplaceStore.getState();
      if (installed.size > 0) {
        const installedManifests = Array.from(installed.values()).map((p) => p.manifest);
        registerManifests(installedManifests);
      }

      // Register all validated apps as MF remotes
      const allApps = Array.from(useAppRegistryStore.getState().apps.values());
      registerAllMFRemotes(allApps);

      // Inject global SDK factory for non-React apps
      injectGlobalSDK();

      // Initialize activation service (fires onDesktopReady)
      activationService.init();

      setStatus('ready');

      // Check for plugin updates in the background
      const { lastRegistryFetch, fetchRegistry, checkUpdates } = useMarketplaceStore.getState();
      if (!lastRegistryFetch || Date.now() - lastRegistryFetch > UPDATE_CHECK_INTERVAL) {
        fetchRegistry().then(() => checkUpdates()).catch(() => {});
      }
    } catch (err) {
      console.error('[useRegistryInit] Initialization failed:', err);
      setStatus('error');
    }
  }, [registerManifests, setStatus]);
}

export { useRegistryStatus };
