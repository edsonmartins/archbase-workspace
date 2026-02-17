import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────

const mockSDK = { windows: {}, notifications: {} };
const mockCreateSecureSDK = vi.fn().mockReturnValue(mockSDK);
const mockGetApp = vi.fn();

vi.mock('@archbase/workspace-sdk', () => ({
  createSecureSDK: (...args: unknown[]) => mockCreateSecureSDK(...args),
}));

vi.mock('@archbase/workspace-state', () => ({
  registryQueries: {
    getApp: (...args: unknown[]) => mockGetApp(...args),
  },
}));

// ── Import under test (after mocks) ──────────────────────

import { injectGlobalSDK } from '../../services/sdkGlobal';

// ── Tests ────────────────────────────────────────────────

describe('sdkGlobal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any previous injection
    delete (globalThis.window as unknown as Record<string, unknown>).__archbase_workspace__;
  });

  afterEach(() => {
    delete (globalThis.window as unknown as Record<string, unknown>).__archbase_workspace__;
  });

  it('injectGlobalSDK sets window.__archbase_workspace__', () => {
    expect(globalThis.window.__archbase_workspace__).toBeUndefined();

    injectGlobalSDK();

    expect(globalThis.window.__archbase_workspace__).toBeDefined();
    expect(typeof globalThis.window.__archbase_workspace__!.createSDK).toBe('function');
  });

  it('createSDK uses registered manifest when available', () => {
    const registeredManifest = {
      id: 'my-app',
      name: 'my-app',
      version: '1.0.0',
      entrypoint: './App',
      remoteEntry: 'http://localhost:3001/mf-manifest.json',
      permissions: ['notifications'],
    };
    mockGetApp.mockReturnValue(registeredManifest);

    injectGlobalSDK();
    globalThis.window.__archbase_workspace__!.createSDK('my-app', 'win-1');

    expect(mockGetApp).toHaveBeenCalledWith('my-app');
    expect(mockCreateSecureSDK).toHaveBeenCalledWith('my-app', 'win-1', registeredManifest);
  });

  it('createSDK uses deny-all manifest when app not found', () => {
    mockGetApp.mockReturnValue(undefined);

    injectGlobalSDK();
    globalThis.window.__archbase_workspace__!.createSDK('unknown-app', 'win-2');

    expect(mockGetApp).toHaveBeenCalledWith('unknown-app');
    // The fallback manifest should have empty permissions (deny-all)
    const manifestArg = mockCreateSecureSDK.mock.calls[0][2] as {
      id: string;
      name: string;
      permissions: string[];
    };
    expect(manifestArg.id).toBe('unknown-app');
    expect(manifestArg.name).toBe('unknown-app');
    expect(manifestArg.permissions).toEqual([]);
  });

  it('injectGlobalSDK is idempotent (only injects once)', () => {
    injectGlobalSDK();
    const firstRef = globalThis.window.__archbase_workspace__;

    injectGlobalSDK();
    const secondRef = globalThis.window.__archbase_workspace__;

    // Same reference — not re-assigned
    expect(firstRef).toBe(secondRef);
  });

  it('skips injection in non-browser environment', () => {
    const originalWindow = globalThis.window;

    // Simulate non-browser by making globalThis.window undefined
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Should not throw
    expect(() => injectGlobalSDK()).not.toThrow();

    // Restore
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });
});
