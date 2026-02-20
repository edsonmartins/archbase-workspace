import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

import { WorkspaceProvider } from '../../context/WorkspaceProvider';
import { useWorkspace } from '../useWorkspace';
import type { WorkspaceSDK } from '@archbase/workspace-types';

// ── Minimal mock SDK ──────────────────────────────────────

function makeMockSDK(overrides: Partial<WorkspaceSDK> = {}): WorkspaceSDK {
  return {
    appId: 'test-app',
    windowId: 'win-1',
    windows: {
      open: vi.fn(() => 'new-win'),
      close: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
      restore: vi.fn(),
      setTitle: vi.fn(),
      getAll: vi.fn(() => []),
    },
    commands: { register: vi.fn(() => vi.fn()), execute: vi.fn() },
    notifications: {
      info: vi.fn(() => ''),
      success: vi.fn(() => ''),
      warning: vi.fn(() => ''),
      error: vi.fn(() => ''),
      dismiss: vi.fn(),
    },
    settings: { get: vi.fn(), set: vi.fn(), onChange: vi.fn(() => vi.fn()) },
    storage: { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn(), clear: vi.fn(), keys: vi.fn(() => []) },
    contextMenu: { show: vi.fn() },
    permissions: {
      check: vi.fn(() => 'denied' as const),
      request: vi.fn(() => Promise.resolve(false)),
      list: vi.fn(() => []),
    },
    collaboration: {} as WorkspaceSDK['collaboration'],
    ...overrides,
  };
}

// ── Test scaffolding ──────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// ── Tests ─────────────────────────────────────────────────

describe('useWorkspace', () => {
  it('returns the SDK instance provided by WorkspaceProvider', () => {
    const sdk = makeMockSDK();
    let captured: WorkspaceSDK | null = null;

    function TestComponent() {
      captured = useWorkspace();
      return null;
    }

    act(() => {
      root.render(
        React.createElement(
          WorkspaceProvider,
          { value: sdk },
          React.createElement(TestComponent),
        ),
      );
    });

    expect(captured).toBe(sdk);
  });

  it('exposes the correct appId from the SDK', () => {
    const sdk = makeMockSDK({ appId: 'my-unique-app' });
    let appId = '';

    function TestComponent() {
      appId = useWorkspace().appId;
      return null;
    }

    act(() => {
      root.render(
        React.createElement(
          WorkspaceProvider,
          { value: sdk },
          React.createElement(TestComponent),
        ),
      );
    });

    expect(appId).toBe('my-unique-app');
  });

  it('exposes the correct windowId from the SDK', () => {
    const sdk = makeMockSDK({ windowId: 'win-99' });
    let windowId = '';

    function TestComponent() {
      windowId = useWorkspace().windowId;
      return null;
    }

    act(() => {
      root.render(
        React.createElement(
          WorkspaceProvider,
          { value: sdk },
          React.createElement(TestComponent),
        ),
      );
    });

    expect(windowId).toBe('win-99');
  });

  it('throws when used outside a WorkspaceProvider', () => {
    const errorMessages: string[] = [];

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false };
      static getDerivedStateFromError() {
        return { hasError: true };
      }
      override componentDidCatch(err: Error) {
        errorMessages.push(err.message);
      }
      override render() {
        return this.state.hasError ? null : this.props.children;
      }
    }

    function BadComponent() {
      useWorkspace();
      return null;
    }

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root.render(
        React.createElement(
          ErrorBoundary,
          null,
          React.createElement(BadComponent),
        ),
      );
    });

    errorSpy.mockRestore();

    expect(errorMessages.some((m) => m.includes('WorkspaceProvider'))).toBe(true);
  });

  it('returns the same SDK reference across re-renders (identity)', () => {
    const sdk = makeMockSDK();
    const captured: WorkspaceSDK[] = [];

    function TestComponent() {
      captured.push(useWorkspace());
      return null;
    }

    act(() => {
      root.render(
        React.createElement(
          WorkspaceProvider,
          { value: sdk },
          React.createElement(TestComponent),
        ),
      );
    });

    // Force a re-render with same SDK value
    act(() => {
      root.render(
        React.createElement(
          WorkspaceProvider,
          { value: sdk },
          React.createElement(TestComponent),
        ),
      );
    });

    expect(captured.length).toBeGreaterThanOrEqual(1);
    expect(captured[0]).toBe(sdk);
    if (captured.length > 1) {
      expect(captured[1]).toBe(sdk);
    }
  });
});
