import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useSettingsStore } from '@archbase/workspace-state';

import { WorkspaceProvider } from '../../context/WorkspaceProvider';
import { useSettingValue } from '../useSetting';
import type { WorkspaceSDK, SettingValue } from '@archbase/workspace-types';

// ── Helpers ───────────────────────────────────────────────

function makeSettingsSDK(): WorkspaceSDK {
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
    settings: {
      get: vi.fn(),
      set: vi.fn(),
      onChange: vi.fn(() => vi.fn()),
    },
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

function resetSettingsStore() {
  useSettingsStore.setState({ values: new Map() });
}

// ── Test scaffolding ──────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  resetSettingsStore();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// ── Tests ─────────────────────────────────────────────────

describe('useSettingValue', () => {
  it('returns undefined when the key is not registered', () => {
    const sdk = makeSettingsSDK();
    let captured: SettingValue | undefined = 'sentinel';

    function TestComponent() {
      const [value] = useSettingValue('workspace.nonexistent');
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

    expect(captured).toBeUndefined();
  });

  it('returns the setting default value when set but no override', () => {
    useSettingsStore.getState().registerSettings('workspace', [
      { key: 'workspace.theme', type: 'string', default: 'dark', description: '' },
    ]);

    const sdk = makeSettingsSDK();
    let captured: SettingValue | undefined = undefined;

    function TestComponent() {
      const [value] = useSettingValue('workspace.theme');
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

    expect(captured).toBe('dark');
  });

  it('returns the overridden value when setValue was called in the store', () => {
    useSettingsStore.getState().registerSettings('workspace', [
      { key: 'workspace.theme', type: 'string', default: 'dark', description: '' },
    ]);
    useSettingsStore.getState().setValue('workspace.theme', 'light');

    const sdk = makeSettingsSDK();
    let captured: SettingValue | undefined = undefined;

    function TestComponent() {
      const [value] = useSettingValue('workspace.theme');
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

    expect(captured).toBe('light');
  });

  it('setValue delegates to sdk.settings.set', () => {
    useSettingsStore.getState().registerSettings('workspace', [
      { key: 'workspace.theme', type: 'string', default: 'dark', description: '' },
    ]);

    const sdk = makeSettingsSDK();
    let capturedSetValue: ((v: string) => void) | undefined;

    function TestComponent() {
      const [, setValue] = useSettingValue<string>('workspace.theme');
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

    act(() => {
      capturedSetValue?.('light');
    });

    expect(sdk.settings.set).toHaveBeenCalledWith('workspace.theme', 'light');
  });

  it('setValue is stable across re-renders (same function reference when key unchanged)', () => {
    useSettingsStore.getState().registerSettings('workspace', [
      { key: 'workspace.theme', type: 'string', default: 'dark', description: '' },
    ]);

    const sdk = makeSettingsSDK();
    const setValueRefs: Array<(v: string) => void> = [];

    function TestComponent() {
      const [, setValue] = useSettingValue<string>('workspace.theme');
      setValueRefs.push(setValue);
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

    // Trigger a state change to force re-render
    act(() => {
      useSettingsStore.getState().setValue('workspace.theme', 'light');
    });

    expect(setValueRefs.length).toBeGreaterThanOrEqual(1);
    // If there are multiple renders, the setValue ref should be stable
    if (setValueRefs.length > 1) {
      expect(setValueRefs[0]).toBe(setValueRefs[1]);
    }
  });

  it('works with boolean setting type', () => {
    useSettingsStore.getState().registerSettings('workspace', [
      { key: 'workspace.showClock', type: 'boolean', default: true, description: '' },
    ]);

    const sdk = makeSettingsSDK();
    let captured: SettingValue | undefined;

    function TestComponent() {
      const [value] = useSettingValue('workspace.showClock');
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

    expect(captured).toBe(true);
  });
});
