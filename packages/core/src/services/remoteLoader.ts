import { registerRemotes } from '@module-federation/enhanced/runtime';
import type { AppManifest } from '@archbase/workspace-types';

const registeredRemotes = new Set<string>();

/**
 * Register a single MF remote from an AppManifest.
 * Uses registerRemotes from MF runtime to make the remote available for loadRemote.
 */
export function registerMFRemote(manifest: AppManifest): void {
  if (registeredRemotes.has(manifest.name)) return;

  try {
    registerRemotes(
      [
        {
          name: manifest.name,
          entry: manifest.remoteEntry,
        },
      ],
      { force: false },
    );
    registeredRemotes.add(manifest.name);
  } catch {
    // Remote may already be registered statically via rspack.config.
    // This is expected when running in dev mode with static remotes configured.
    registeredRemotes.add(manifest.name);
  }
}

/**
 * Register all MF remotes from an array of AppManifests.
 */
export function registerAllMFRemotes(manifests: AppManifest[]): void {
  for (const manifest of manifests) {
    registerMFRemote(manifest);
  }
}

/**
 * Check if a remote has been registered through this loader.
 */
export function isRemoteRegistered(name: string): boolean {
  return registeredRemotes.has(name);
}
