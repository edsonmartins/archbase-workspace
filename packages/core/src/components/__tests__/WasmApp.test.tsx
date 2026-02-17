import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ── Hoisted mocks ──────────────────────────────────────────

const { mockLoadWasmModule, mockDestroyWasmRuntime, mockGetWasmRuntime, mockApi } =
  vi.hoisted(() => ({
    mockLoadWasmModule: vi.fn(),
    mockDestroyWasmRuntime: vi.fn(),
    mockGetWasmRuntime: vi.fn(),
    mockApi: {
      render: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      setSDK: vi.fn(),
      onKeyDown: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    },
  }));

vi.mock('../../services/wasmLoader', () => ({
  loadWasmModule: mockLoadWasmModule,
  destroyWasmRuntime: mockDestroyWasmRuntime,
  getWasmRuntime: mockGetWasmRuntime,
  clearWasmModuleCache: vi.fn(),
}));

const { mockCreateSecureSDK } = vi.hoisted(() => ({
  mockCreateSecureSDK: vi.fn(() => ({
    appId: 'test',
    windowId: 'win-1',
    windows: {},
    notifications: {},
  })),
}));

vi.mock('@archbase/workspace-sdk', () => ({
  createSecureSDK: mockCreateSecureSDK,
  WorkspaceProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../ShadowContainer', () => ({
  ShadowContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'shadow-container' }, children),
}));

// ── Stub jsdom-missing globals ─────────────────────────────

class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

// ── Import under test (after mocks) ──────────────────────

import { WasmApp } from '../WasmApp';

// ── Test data ──────────────────────────────────────────────

const wasmManifest = {
  id: 'test.wasm.app',
  name: 'test_wasm',
  version: '1.0.0',
  entrypoint: '',
  remoteEntry: '',
  displayName: 'Test WASM',
  wasm: {
    wasmUrl: 'http://localhost:3009/app.wasm',
    jsGlueUrl: 'http://localhost:3009/adapter.js',
    moduleType: 'standalone' as const,
    renderMode: 'canvas-2d' as const,
  },
  permissions: [],
};

const fakeRuntime = {
  module: {} as WebAssembly.Module,
  instance: {} as WebAssembly.Instance,
  memory: {} as WebAssembly.Memory,
  api: mockApi,
  destroy: vi.fn(),
};

// ── Helpers ────────────────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadWasmModule.mockResolvedValue(fakeRuntime);
  mockGetWasmRuntime.mockReturnValue(fakeRuntime);
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

async function renderAndWait(element: React.ReactNode) {
  await act(async () => {
    root.render(element);
    await new Promise((r) => setTimeout(r, 50));
  });
}

// ── Tests ──────────────────────────────────────────────────

describe('WasmApp', () => {
  it('renders loading state initially (before loadWasmModule resolves)', () => {
    // Make loadWasmModule never resolve during this test
    mockLoadWasmModule.mockReturnValue(new Promise(() => {}));

    renderSync(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    const loading = container.querySelector('.remote-app-loading');
    expect(loading).toBeTruthy();
    expect(loading!.textContent).toContain('Loading');
  });

  it('renders canvas element for canvas-2d mode', async () => {
    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('does not render canvas for dom mode', async () => {
    const domManifest = {
      ...wasmManifest,
      wasm: { ...wasmManifest.wasm, renderMode: 'dom' as const },
    };

    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={domManifest} />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();
  });

  it('renders DOM container for dom mode', async () => {
    const domManifest = {
      ...wasmManifest,
      wasm: { ...wasmManifest.wasm, renderMode: 'dom' as const },
    };

    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={domManifest} />,
    );

    const domContainer = container.querySelector('.wasm-dom-container');
    expect(domContainer).toBeTruthy();
  });

  it('renders both canvas and DOM for hybrid mode', async () => {
    const hybridManifest = {
      ...wasmManifest,
      wasm: { ...wasmManifest.wasm, renderMode: 'hybrid' as const },
    };

    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={hybridManifest} />,
    );

    const canvas = container.querySelector('canvas');
    const domContainer = container.querySelector('.wasm-dom-container');
    expect(canvas).toBeTruthy();
    expect(domContainer).toBeTruthy();
  });

  it('shows error state when loadWasmModule rejects', async () => {
    mockLoadWasmModule.mockRejectedValue(new Error('WASM compilation failed'));

    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    const error = container.querySelector('.remote-app-error');
    expect(error).toBeTruthy();
    expect(container.textContent).toContain('Failed to load');
    expect(container.textContent).toContain('WASM compilation failed');
  });

  it('error state shows retry button', async () => {
    mockLoadWasmModule.mockRejectedValue(new Error('Load failed'));

    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    const retryBtn = container.querySelector('.remote-app-retry-btn');
    expect(retryBtn).toBeTruthy();
    expect(retryBtn!.textContent).toBe('Retry');
  });

  it('calls destroyWasmRuntime on unmount', async () => {
    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    act(() => root.unmount());
    // Recreate root so afterEach cleanup doesn't fail
    root = createRoot(container);

    expect(mockDestroyWasmRuntime).toHaveBeenCalledWith('win-1');
  });

  it('creates secure SDK with manifest', async () => {
    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    expect(mockCreateSecureSDK).toHaveBeenCalledWith(
      'test.wasm.app',
      'win-1',
      wasmManifest,
    );
  });

  it('injects SDK via api.setSDK after load', async () => {
    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    expect(mockApi.setSDK).toHaveBeenCalledTimes(1);
    // The SDK object should be the return value of createSecureSDK
    expect(mockApi.setSDK).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'test', windowId: 'win-1' }),
    );
  });

  it('container has tabIndex=0 for keyboard focus', async () => {
    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    const wasmContainer = container.querySelector('.wasm-app-container');
    expect(wasmContainer).toBeTruthy();
    expect(wasmContainer!.getAttribute('tabindex')).toBe('0');
  });

  it('shows displayName in loading state', () => {
    mockLoadWasmModule.mockReturnValue(new Promise(() => {}));

    renderSync(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    const loading = container.querySelector('.remote-app-loading');
    expect(loading).toBeTruthy();
    expect(loading!.textContent).toContain('Test WASM');
  });

  it('hides loading state after module loads', async () => {
    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    const loading = container.querySelector('.remote-app-loading');
    expect(loading).toBeNull();
  });

  it('falls back to manifest.name when displayName is not set', () => {
    mockLoadWasmModule.mockReturnValue(new Promise(() => {}));
    const noDisplayName = { ...wasmManifest, displayName: undefined };

    renderSync(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={noDisplayName} />,
    );

    const loading = container.querySelector('.remote-app-loading');
    expect(loading!.textContent).toContain('test_wasm');
  });

  it('passes correct config to loadWasmModule', async () => {
    await renderAndWait(
      <WasmApp appId="test.wasm.app" windowId="win-1" manifest={wasmManifest} />,
    );

    expect(mockLoadWasmModule).toHaveBeenCalledWith(
      wasmManifest.wasm,
      'win-1',
      expect.any(HTMLDivElement),
      expect.any(HTMLCanvasElement),
    );
  });
});
