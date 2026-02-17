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
});
