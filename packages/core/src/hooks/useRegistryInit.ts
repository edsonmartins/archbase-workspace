import { useEffect, useRef } from 'react';
import { useAppRegistryStore, useRegistryStatus, activationService } from '@archbase/workspace-state';
import { KNOWN_MANIFESTS } from '../knownManifests';
import { registerAllMFRemotes } from '../services/remoteLoader';
import { injectGlobalSDK } from '../services/sdkGlobal';

/**
 * Initializes the AppRegistry with known manifests and registers MF remotes.
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

      // Register all validated apps as MF remotes
      const allApps = Array.from(useAppRegistryStore.getState().apps.values());
      registerAllMFRemotes(allApps);

      // Inject global SDK factory for non-React apps
      injectGlobalSDK();

      // Initialize activation service (fires onDesktopReady)
      activationService.init();

      setStatus('ready');
    } catch (err) {
      console.error('[useRegistryInit] Initialization failed:', err);
      setStatus('error');
    }
  }, [registerManifests, setStatus]);
}

export { useRegistryStatus };
