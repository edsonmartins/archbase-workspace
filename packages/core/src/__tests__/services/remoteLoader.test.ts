import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppManifest } from '@archbase/workspace-types';

// ── Mock ─────────────────────────────────────────────────

const mockRegisterRemotes = vi.fn();

vi.mock('@module-federation/enhanced/runtime', () => ({
  registerRemotes: (...args: unknown[]) => mockRegisterRemotes(...args),
}));

// ── Helpers ──────────────────────────────────────────────

function makeManifest(name: string, overrides: Partial<AppManifest> = {}): AppManifest {
  return {
    id: `dev.archbase.${name}`,
    name,
    version: '1.0.0',
    entrypoint: `./App`,
    remoteEntry: `http://localhost:3001/mf-manifest.json`,
    ...overrides,
  };
}

/**
 * We need a fresh module for each test because remoteLoader has module-level
 * state (the `registeredRemotes` Set). We use vi.resetModules() + dynamic import.
 */
async function freshImport() {
  vi.resetModules();
  const mod = await import('../../services/remoteLoader');
  return mod;
}

// ── Tests ────────────────────────────────────────────────

describe('remoteLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registerMFRemote registers a new remote', async () => {
    const { registerMFRemote } = await freshImport();
    const manifest = makeManifest('hello_world');

    registerMFRemote(manifest);

    expect(mockRegisterRemotes).toHaveBeenCalledTimes(1);
    expect(mockRegisterRemotes).toHaveBeenCalledWith(
      [{ name: 'hello_world', entry: manifest.remoteEntry }],
      { force: false },
    );
  });

  it('registerMFRemote skips already-registered remotes (idempotent)', async () => {
    const { registerMFRemote } = await freshImport();
    const manifest = makeManifest('hello_world');

    registerMFRemote(manifest);
    registerMFRemote(manifest);

    // Only called once — second call is skipped because the name is already in the Set
    expect(mockRegisterRemotes).toHaveBeenCalledTimes(1);
  });

  it('registerMFRemote handles thrown errors gracefully', async () => {
    const { registerMFRemote, isRemoteRegistered } = await freshImport();
    const manifest = makeManifest('broken_app');

    mockRegisterRemotes.mockImplementationOnce(() => {
      throw new Error('Remote already registered');
    });

    // Should not throw
    expect(() => registerMFRemote(manifest)).not.toThrow();

    // The remote is still added to the internal set (catch block adds it)
    expect(isRemoteRegistered('broken_app')).toBe(true);
  });

  it('registerAllMFRemotes registers multiple remotes', async () => {
    const { registerAllMFRemotes } = await freshImport();
    const manifests = [
      makeManifest('app_one'),
      makeManifest('app_two'),
      makeManifest('app_three'),
    ];

    registerAllMFRemotes(manifests);

    expect(mockRegisterRemotes).toHaveBeenCalledTimes(3);
  });

  it('isRemoteRegistered returns true for registered', async () => {
    const { registerMFRemote, isRemoteRegistered } = await freshImport();
    const manifest = makeManifest('registered_app');

    registerMFRemote(manifest);

    expect(isRemoteRegistered('registered_app')).toBe(true);
  });

  it('isRemoteRegistered returns false for unregistered', async () => {
    const { isRemoteRegistered } = await freshImport();

    expect(isRemoteRegistered('nonexistent_app')).toBe(false);
  });
});
