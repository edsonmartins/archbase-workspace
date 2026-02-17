import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ── Mocks ─────────────────────────────────────────────────

const mockLoadRemote = vi.fn();
const mockGetApp = vi.fn();
const mockCreateSecureSDK = vi.fn().mockReturnValue({ windows: {}, notifications: {} });

vi.mock('@module-federation/enhanced/runtime', () => ({
  loadRemote: (...args: unknown[]) => mockLoadRemote(...args),
}));

vi.mock('@archbase/workspace-state', () => ({
  registryQueries: {
    getApp: (...args: unknown[]) => mockGetApp(...args),
  },
}));

vi.mock('@archbase/workspace-sdk', () => ({
  createSecureSDK: (...args: unknown[]) => mockCreateSecureSDK(...args),
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'workspace-provider' }, children),
}));

vi.mock('../ShadowContainer', () => ({
  ShadowContainer: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'shadow-container' }, children),
}));

vi.mock('../SandboxedApp', () => ({
  SandboxedApp: () => React.createElement('div', { 'data-testid': 'sandboxed-app' }, 'Sandboxed'),
}));

vi.mock('../WasmApp', () => ({
  WasmApp: (props: { appId: string; windowId: string }) =>
    React.createElement('div', { 'data-testid': 'wasm-app', 'data-appid': props.appId }),
}));

// ── Import under test (after mocks) ──────────────────────

import { RemoteApp } from '../RemoteApp';

// ── Helpers ──────────────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetApp.mockReturnValue(undefined);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderSync(element: React.ReactNode) {
  act(() => root.render(element));
}

// ── Tests ────────────────────────────────────────────────

describe('RemoteApp', () => {
  it('renders loading state initially', () => {
    // loadRemote returns a pending promise (never resolves during this test)
    mockLoadRemote.mockReturnValue(new Promise(() => {}));

    renderSync(<RemoteApp appId="test-app" windowId="win-1" />);

    const loading = container.querySelector('.remote-app-loading');
    expect(loading).toBeTruthy();
    expect(loading!.textContent).toContain('Loading');
  });

  it('renders error state on load failure', async () => {
    // loadRemote returns null → triggers "Failed to load remote app" error
    mockLoadRemote.mockResolvedValue(null);

    await act(async () => {
      root.render(<RemoteApp appId="broken-app" windowId="win-2" />);
      // Wait for the lazy load to resolve and the error boundary to catch
      await new Promise((r) => setTimeout(r, 50));
    });

    const error = container.querySelector('.remote-app-error');
    expect(error).toBeTruthy();
    expect(container.textContent).toContain('Failed to load');
  });

  it('renders app component on success', async () => {
    // Mock a successful remote component
    const FakeRemoteComponent = () => React.createElement('div', { className: 'remote-rendered' }, 'Hello from Remote');
    mockLoadRemote.mockResolvedValue({ default: FakeRemoteComponent });

    await act(async () => {
      root.render(<RemoteApp appId="hello-app" windowId="win-3" />);
      await new Promise((r) => setTimeout(r, 50));
    });

    const rendered = container.querySelector('.remote-rendered');
    expect(rendered).toBeTruthy();
    expect(rendered!.textContent).toBe('Hello from Remote');
  });

  it('shows retry button on error', async () => {
    mockLoadRemote.mockResolvedValue(null);

    await act(async () => {
      root.render(<RemoteApp appId="fail-app" windowId="win-4" />);
      await new Promise((r) => setTimeout(r, 50));
    });

    const retryBtn = container.querySelector('.remote-app-retry-btn');
    expect(retryBtn).toBeTruthy();
    expect(retryBtn!.textContent).toBe('Retry');
  });

  it('creates secure SDK with fallback manifest when registry returns nothing', () => {
    mockGetApp.mockReturnValue(undefined);

    renderSync(<RemoteApp appId="no-manifest-app" windowId="win-5" />);

    expect(mockCreateSecureSDK).toHaveBeenCalledTimes(1);
    const [appId, windowId, manifest] = mockCreateSecureSDK.mock.calls[0] as [string, string, { permissions: string[] }];
    expect(appId).toBe('no-manifest-app');
    expect(windowId).toBe('win-5');
    // Fallback manifest has empty permissions (deny-all)
    expect(manifest.permissions).toEqual([]);
  });

  // ── WASM integration tests ────────────────────────────────

  it('renders WasmApp when manifest has wasm config', () => {
    const wasmManifest = {
      id: 'test.wasm.app',
      name: 'test_wasm',
      version: '1.0.0',
      entrypoint: '',
      remoteEntry: '',
      wasm: {
        wasmUrl: 'http://localhost:3009/app.wasm',
        moduleType: 'standalone' as const,
        renderMode: 'canvas-2d' as const,
      },
      permissions: [],
    };
    mockGetApp.mockReturnValue(wasmManifest);

    renderSync(<RemoteApp appId="test.wasm.app" windowId="win-wasm-1" />);

    const wasmApp = container.querySelector('[data-testid="wasm-app"]');
    expect(wasmApp).toBeTruthy();
    expect(wasmApp!.getAttribute('data-appid')).toBe('test.wasm.app');
    // Should NOT render the normal MF loading path
    const loading = container.querySelector('.remote-app-loading');
    expect(loading).toBeNull();
  });

  it('does NOT render WasmApp for normal MF manifest', () => {
    const mfManifest = {
      id: 'test.mf.app',
      name: 'test_mf',
      version: '1.0.0',
      entrypoint: './App',
      remoteEntry: 'http://localhost:3001/mf-manifest.json',
      permissions: [],
    };
    mockGetApp.mockReturnValue(mfManifest);
    mockLoadRemote.mockReturnValue(new Promise(() => {}));

    renderSync(<RemoteApp appId="test.mf.app" windowId="win-mf-1" />);

    const wasmApp = container.querySelector('[data-testid="wasm-app"]');
    expect(wasmApp).toBeNull();
    // Normal MF path should render (loading state from Suspense)
    const loading = container.querySelector('.remote-app-loading');
    expect(loading).toBeTruthy();
  });

  it('WASM takes priority over sandbox when both are set', () => {
    const bothManifest = {
      id: 'test.both.app',
      name: 'test_both',
      version: '1.0.0',
      entrypoint: '',
      remoteEntry: '',
      wasm: {
        wasmUrl: 'http://localhost:3009/app.wasm',
        moduleType: 'standalone' as const,
        renderMode: 'canvas-2d' as const,
      },
      sandbox: true,
      permissions: [],
    };
    mockGetApp.mockReturnValue(bothManifest);

    renderSync(<RemoteApp appId="test.both.app" windowId="win-both-1" />);

    // WASM takes priority: WasmApp is rendered, not SandboxedApp
    const wasmApp = container.querySelector('[data-testid="wasm-app"]');
    const sandboxedApp = container.querySelector('[data-testid="sandboxed-app"]');
    expect(wasmApp).toBeTruthy();
    expect(sandboxedApp).toBeNull();
  });
});
