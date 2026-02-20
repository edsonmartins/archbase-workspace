import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────

const {
  mockRegisterManifests,
  mockSetStatus,
  mockRegistryState,
  mockMarketplaceState,
  mockActivationInit,
  mockSetPreloadHandler,
  mockSetAutoStartHandler,
  mockRegisterAllMFRemotes,
  mockInjectGlobalSDK,
  mockKnownManifests,
} = vi.hoisted(() => ({
  mockRegisterManifests: vi.fn(),
  mockSetStatus: vi.fn(),
  mockRegistryState: {
    apps: new Map<string, unknown>(),
  },
  mockMarketplaceState: {
    installed: new Map<string, unknown>(),
    lastRegistryFetch: null as number | null,
    fetchRegistry: vi.fn().mockResolvedValue(undefined),
    checkUpdates: vi.fn().mockResolvedValue(undefined),
  },
  mockActivationInit: vi.fn(),
  mockSetPreloadHandler: vi.fn(),
  mockSetAutoStartHandler: vi.fn(),
  mockRegisterAllMFRemotes: vi.fn(),
  mockInjectGlobalSDK: vi.fn(),
  mockKnownManifests: [{ id: 'known-app', name: 'Known App', version: '1.0.0' }] as unknown[],
}));

vi.mock('@archbase/workspace-state', () => ({
  useAppRegistryStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ registerManifests: mockRegisterManifests, setStatus: mockSetStatus }),
    {
      getState: () => ({ apps: mockRegistryState.apps }),
    },
  ),
  useRegistryStatus: () => 'idle',
  useMarketplaceStore: Object.assign(() => ({}), {
    getState: () => mockMarketplaceState,
  }),
  activationService: { init: mockActivationInit },
  setPreloadHandler: mockSetPreloadHandler,
  setAutoStartHandler: mockSetAutoStartHandler,
}));

vi.mock('../../services/remoteLoader', () => ({
  registerAllMFRemotes: mockRegisterAllMFRemotes,
}));

vi.mock('../../services/sdkGlobal', () => ({
  injectGlobalSDK: mockInjectGlobalSDK,
}));

vi.mock('../../knownManifests', () => ({
  KNOWN_MANIFESTS: mockKnownManifests,
}));

// ── Imports ────────────────────────────────────────────────

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useRegistryInit } from '../useRegistryInit';

// ── Helper component ──────────────────────────────────────

function TestComponent() {
  useRegistryInit();
  return null;
}

// ── Tests ─────────────────────────────────────────────────

describe('useRegistryInit', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistryState.apps = new Map();
    mockMarketplaceState.installed = new Map();
    mockMarketplaceState.lastRegistryFetch = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('sets status to "loading" and then "ready" on successful init', () => {
    act(() => {
      root.render(React.createElement(TestComponent));
    });

    // setStatus called with 'loading' first, then 'ready'
    expect(mockSetStatus).toHaveBeenCalledWith('loading');
    expect(mockSetStatus).toHaveBeenCalledWith('ready');
    expect(mockSetStatus.mock.calls[0][0]).toBe('loading');
    expect(mockSetStatus.mock.calls[mockSetStatus.mock.calls.length - 1][0]).toBe('ready');
  });

  it('calls registerManifests with KNOWN_MANIFESTS', () => {
    act(() => {
      root.render(React.createElement(TestComponent));
    });

    expect(mockRegisterManifests).toHaveBeenCalledWith(mockKnownManifests);
  });

  it('calls registerAllMFRemotes with apps from registry', () => {
    const mockApp = { id: 'app1', name: 'App 1', remoteEntry: 'http://localhost:3001' };
    mockRegistryState.apps = new Map([['app1', mockApp]]);

    act(() => {
      root.render(React.createElement(TestComponent));
    });

    expect(mockRegisterAllMFRemotes).toHaveBeenCalledWith([mockApp]);
  });

  it('calls injectGlobalSDK', () => {
    act(() => {
      root.render(React.createElement(TestComponent));
    });

    expect(mockInjectGlobalSDK).toHaveBeenCalledTimes(1);
  });

  it('calls activationService.init', () => {
    act(() => {
      root.render(React.createElement(TestComponent));
    });

    expect(mockActivationInit).toHaveBeenCalledTimes(1);
  });

  it('registers installed marketplace plugins', () => {
    const plugin = {
      manifest: { id: 'plugin-1', name: 'Plugin One', version: '0.1.0' },
    };
    mockMarketplaceState.installed = new Map([['plugin-1', plugin]]);

    act(() => {
      root.render(React.createElement(TestComponent));
    });

    // registerManifests should be called twice: once for KNOWN_MANIFESTS, once for installed plugins
    expect(mockRegisterManifests).toHaveBeenCalledTimes(2);
    expect(mockRegisterManifests).toHaveBeenCalledWith([plugin.manifest]);
  });

  it('only initializes once even if re-rendered', () => {
    act(() => {
      root.render(React.createElement(TestComponent));
    });

    act(() => {
      root.render(React.createElement(TestComponent));
    });

    // Despite two renders, setStatus('loading') should only be called once
    const loadingCalls = mockSetStatus.mock.calls.filter((c: string[]) => c[0] === 'loading');
    expect(loadingCalls.length).toBe(1);
  });

  it('sets status to "error" when initialization throws', () => {
    mockRegisterManifests.mockImplementationOnce(() => {
      throw new Error('Registration failed');
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root.render(React.createElement(TestComponent));
    });

    expect(mockSetStatus).toHaveBeenCalledWith('error');
    errorSpy.mockRestore();
  });
});
