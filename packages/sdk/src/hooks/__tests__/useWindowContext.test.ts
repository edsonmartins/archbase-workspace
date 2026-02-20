import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ── Hoisted mocks ─────────────────────────────────────────

const { mockFocusedWindowId } = vi.hoisted(() => ({
  mockFocusedWindowId: { current: undefined as string | undefined },
}));

vi.mock('@archbase/workspace-state', () => ({
  useFocusedWindowId: () => mockFocusedWindowId.current,
}));

// ── Imports (after mocks) ─────────────────────────────────

import { WorkspaceProvider } from '../../context/WorkspaceProvider';
import { useWindowContext } from '../useWindowContext';
import type { WorkspaceSDK } from '@archbase/workspace-types';

// ── Helpers ───────────────────────────────────────────────

function makeWindowSDK(windowId = 'win-1'): WorkspaceSDK {
  const windows: WorkspaceSDK['windows'] = {
    open: vi.fn(() => ''),
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    restore: vi.fn(),
    setTitle: vi.fn(),
    getAll: vi.fn(() => []),
  };
  return {
    appId: 'test-app',
    windowId,
    windows,
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
  };
}

// ── Test scaffolding ──────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  mockFocusedWindowId.current = undefined;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// ── Tests ─────────────────────────────────────────────────

describe('useWindowContext', () => {
  it('returns the correct windowId', () => {
    const sdk = makeWindowSDK('win-42');
    const out = { windowId: '' };

    function TestComponent() {
      out.windowId = useWindowContext().windowId;
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

    expect(out.windowId).toBe('win-42');
  });

  it('isFocused is true when this window is focused', () => {
    const sdk = makeWindowSDK('win-focus');
    mockFocusedWindowId.current = 'win-focus';
    const out = { isFocused: false };

    function TestComponent() {
      out.isFocused = useWindowContext().isFocused;
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

    expect(out.isFocused).toBe(true);
  });

  it('isFocused is false when a different window is focused', () => {
    const sdk = makeWindowSDK('win-1');
    mockFocusedWindowId.current = 'win-2';
    const out = { isFocused: true };

    function TestComponent() {
      out.isFocused = useWindowContext().isFocused;
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

    expect(out.isFocused).toBe(false);
  });

  it('isFocused is false when no window is focused', () => {
    const sdk = makeWindowSDK('win-1');
    mockFocusedWindowId.current = undefined;
    const out = { isFocused: true };

    function TestComponent() {
      out.isFocused = useWindowContext().isFocused;
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

    expect(out.isFocused).toBe(false);
  });

  it('close() delegates to sdk.windows.close()', () => {
    const sdk = makeWindowSDK('win-1');
    const out = { close: () => {} };

    function TestComponent() {
      out.close = useWindowContext().close;
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

    out.close();
    expect(sdk.windows.close).toHaveBeenCalledTimes(1);
  });

  it('minimize() delegates to sdk.windows.minimize()', () => {
    const sdk = makeWindowSDK('win-1');
    const out = { minimize: () => {} };

    function TestComponent() {
      out.minimize = useWindowContext().minimize;
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

    out.minimize();
    expect(sdk.windows.minimize).toHaveBeenCalledTimes(1);
  });

  it('maximize() delegates to sdk.windows.maximize()', () => {
    const sdk = makeWindowSDK('win-1');
    const out = { maximize: () => {} };

    function TestComponent() {
      out.maximize = useWindowContext().maximize;
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

    out.maximize();
    expect(sdk.windows.maximize).toHaveBeenCalledTimes(1);
  });

  it('restore() delegates to sdk.windows.restore()', () => {
    const sdk = makeWindowSDK('win-1');
    const out = { restore: () => {} };

    function TestComponent() {
      out.restore = useWindowContext().restore;
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

    out.restore();
    expect(sdk.windows.restore).toHaveBeenCalledTimes(1);
  });

  it('setTitle() delegates to sdk.windows.setTitle()', () => {
    const sdk = makeWindowSDK('win-1');
    const out = { setTitle: (_title: string) => {} };

    function TestComponent() {
      out.setTitle = useWindowContext().setTitle;
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

    out.setTitle('My New Title');
    expect(sdk.windows.setTitle).toHaveBeenCalledWith('My New Title');
  });
});
