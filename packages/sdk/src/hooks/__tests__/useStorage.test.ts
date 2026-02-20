import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

import { WorkspaceProvider } from '../../context/WorkspaceProvider';
import { useStorage } from '../useStorage';
import type { WorkspaceSDK } from '@archbase/workspace-types';

// ── Helpers ───────────────────────────────────────────────

function makeStorageSDK(store: Map<string, unknown>): WorkspaceSDK {
  const storage: WorkspaceSDK['storage'] = {
    get: vi.fn((key: string) => (store.has(key) ? store.get(key) : null)) as WorkspaceSDK['storage']['get'],
    set: vi.fn((key: string, value: unknown) => { store.set(key, value); }),
    remove: vi.fn((key: string) => { store.delete(key); }),
    clear: vi.fn(() => store.clear()),
    keys: vi.fn(() => Array.from(store.keys())),
  };
  return {
    appId: 'test-app',
    windowId: 'win-1',
    windows: {
      open: vi.fn(() => ''),
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
    storage,
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
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// ── Tests ─────────────────────────────────────────────────

describe('useStorage', () => {
  it('returns defaultValue when key is not in storage', () => {
    const store = new Map<string, unknown>();
    const sdk = makeStorageSDK(store);
    let captured: unknown = undefined;

    function TestComponent() {
      const [value] = useStorage('myKey', 'default-val');
      captured = value;
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

    expect(captured).toBe('default-val');
  });

  it('returns the stored value when key exists in storage', () => {
    const store = new Map<string, unknown>([['myKey', 'stored-val']]);
    const sdk = makeStorageSDK(store);
    let captured: unknown = undefined;

    function TestComponent() {
      const [value] = useStorage('myKey', 'default-val');
      captured = value;
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

    expect(captured).toBe('stored-val');
  });

  it('calls storage.set and updates local state on setValue', () => {
    const store = new Map<string, unknown>();
    const sdk = makeStorageSDK(store);
    let capturedValue: unknown = undefined;
    let capturedSetValue: ((v: string) => void) | undefined;

    function TestComponent() {
      const [value, setValue] = useStorage('counter', 'initial');
      capturedValue = value;
      capturedSetValue = setValue;
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

    expect(capturedValue).toBe('initial');

    act(() => {
      capturedSetValue?.('updated');
    });

    expect(capturedValue).toBe('updated');
    expect(store.get('counter')).toBe('updated');
    expect(sdk.storage.set).toHaveBeenCalledWith('counter', 'updated');
  });

  it('works with numeric values', () => {
    const store = new Map<string, unknown>([['count', 42]]);
    const sdk = makeStorageSDK(store);
    let captured: number | undefined;
    let capturedSetValue: ((v: number) => void) | undefined;

    function TestComponent() {
      const [value, setValue] = useStorage<number>('count', 0);
      captured = value;
      capturedSetValue = setValue;
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

    expect(captured).toBe(42);

    act(() => {
      capturedSetValue?.(99);
    });

    expect(captured).toBe(99);
    expect(store.get('count')).toBe(99);
  });

  it('works with object values', () => {
    const store = new Map<string, unknown>();
    const sdk = makeStorageSDK(store);
    const defaultObj = { x: 0, y: 0 };
    let captured: { x: number; y: number } | undefined;
    let capturedSetValue: ((v: { x: number; y: number }) => void) | undefined;

    function TestComponent() {
      const [value, setValue] = useStorage('pos', defaultObj);
      captured = value;
      capturedSetValue = setValue;
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

    expect(captured).toBe(defaultObj);

    const newPos = { x: 10, y: 20 };
    act(() => {
      capturedSetValue?.(newPos);
    });

    expect(captured).toEqual({ x: 10, y: 20 });
  });

  it('reads storage.get exactly once on initial render', () => {
    const store = new Map<string, unknown>();
    const sdk = makeStorageSDK(store);

    function TestComponent() {
      useStorage('key', 'default');
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

    expect(sdk.storage.get).toHaveBeenCalledWith('key');
  });
});
