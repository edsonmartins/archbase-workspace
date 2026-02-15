import { useEffect, useRef } from 'react';
import { useAppRegistryStore, useRegistryStatus } from '@archbase/workspace-state';
import { KNOWN_MANIFESTS } from '../knownManifests';
import { registerAllMFRemotes } from '../services/remoteLoader';

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

    // Register known manifests (sync validation)
    registerManifests(KNOWN_MANIFESTS);

    // Register all validated apps as MF remotes
    const allApps = Array.from(useAppRegistryStore.getState().apps.values());
    registerAllMFRemotes(allApps);

    setStatus('ready');
  }, [registerManifests, setStatus]);
}

export { useRegistryStatus };
