import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { WorkspaceSDK, SettingsEntry } from '@archbase/workspace-types';
import { WorkspaceProvider, useWorkspaceContext } from '../context/WorkspaceProvider';
import { useWorkspace } from '../hooks/useWorkspace';
import { useCommand } from '../hooks/useCommand';
import { useSettingValue } from '../hooks/useSetting';
import { useStorage } from '../hooks/useStorage';
import { useWindowContext } from '../hooks/useWindowContext';

// ============================================================
// Mocks for @archbase/workspace-state hooks
// ============================================================

const mockUseSetting = vi.fn<(key: string) => SettingsEntry | undefined>();
const mockUseFocusedWindowId = vi.fn<() => string | undefined>();

vi.mock('@archbase/workspace-state', () => ({
  useSetting: (key: string) => mockUseSetting(key),
  useFocusedWindowId: () => mockUseFocusedWindowId(),
}));

// ============================================================
// Mock SDK factory
// ============================================================

function createMockSDK(overrides: Partial<WorkspaceSDK> = {}): WorkspaceSDK {
  return {
    appId: 'test-app',
    windowId: 'win-1',
    windows: {
      open: vi.fn(() => 'new-win-id'),
      close: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
      restore: vi.fn(),
      setTitle: vi.fn(),
      getAll: vi.fn(() => []),
    },
    commands: {
      register: vi.fn(() => vi.fn()),
      execute: vi.fn(async () => {}),
    },
    notifications: {
      info: vi.fn(() => 'notif-1'),
      success: vi.fn(() => 'notif-2'),
      warning: vi.fn(() => 'notif-3'),
      error: vi.fn(() => 'notif-4'),
      dismiss: vi.fn(),
    },
    settings: {
      get: vi.fn(),
      set: vi.fn(),
      onChange: vi.fn(() => () => {}),
    },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      keys: vi.fn(() => []),
    },
    contextMenu: {
      show: vi.fn(),
    },
    permissions: {
      check: vi.fn(() => 'granted' as const),
      request: vi.fn(async () => true),
      list: vi.fn(() => []),
    },
    collaboration: {
      get isConnected() { return false; },
      get currentRoom() { return null; },
      get currentUser() { return null; },
      async join() {},
      leave() {},
      getUsers() { return []; },
      setStatus() {},
      shareWindow() {},
      unshareWindow() {},
      getSharedWindows() { return []; },
      followUser() {},
      unfollowUser() {},
      getFollowState() { return { followingUserId: null }; },
      onUserJoined() { return () => {}; },
      onUserLeft() { return () => {}; },
      onCursorMove() { return () => {}; },
      onWindowShared() { return () => {}; },
    },
    ...overrides,
  };
}

// ============================================================
// DOM helpers for rendering React components without @testing-library/react
// ============================================================

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockUseSetting.mockReset();
  mockUseFocusedWindowId.mockReset();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

// ============================================================
// WorkspaceProvider & useWorkspaceContext
// ============================================================

describe('WorkspaceProvider', () => {
  it('provides the SDK value through context', () => {
    const sdk = createMockSDK();
    let contextValue: WorkspaceSDK | null = null;

    function Consumer() {
      contextValue = useWorkspaceContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <Consumer />
        </WorkspaceProvider>,
      );
    });

    expect(contextValue).toBe(sdk);
  });

  it('returns null when used outside of a provider', () => {
    let contextValue: WorkspaceSDK | null = 'not-null' as unknown as WorkspaceSDK;

    function Consumer() {
      contextValue = useWorkspaceContext();
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    expect(contextValue).toBeNull();
  });

  it('renders children correctly', () => {
    const sdk = createMockSDK();

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <div data-testid="child">Hello</div>
        </WorkspaceProvider>,
      );
    });

    expect(container.querySelector('[data-testid="child"]')?.textContent).toBe('Hello');
  });
});

// ============================================================
// useWorkspace
// ============================================================

describe('useWorkspace', () => {
  it('returns the SDK when inside WorkspaceProvider', () => {
    const sdk = createMockSDK();
    let result: WorkspaceSDK | null = null;

    function Consumer() {
      result = useWorkspace();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <Consumer />
        </WorkspaceProvider>,
      );
    });

    expect(result).toBe(sdk);
  });

  it('throws when used outside WorkspaceProvider', () => {
    const errors: Error[] = [];

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      componentDidCatch(error: Error) {
        errors.push(error);
      }

      render() {
        if (this.state.hasError) {
          return <div data-testid="error">Error caught</div>;
        }
        return this.props.children;
      }
    }

    function Consumer() {
      useWorkspace();
      return null;
    }

    act(() => {
      root.render(
        <ErrorBoundary>
          <Consumer />
        </ErrorBoundary>,
      );
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('useWorkspace must be used within a <WorkspaceProvider>');
  });
});

// ============================================================
// useCommand
// ============================================================

describe('useCommand', () => {
  it('registers a command on mount', () => {
    const sdk = createMockSDK();
    const handler = vi.fn();

    function TestComponent() {
      useCommand('test.cmd', handler);
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(sdk.commands.register).toHaveBeenCalledWith('test.cmd', expect.any(Function));
  });

  it('unregisters the command on unmount', () => {
    const sdk = createMockSDK();
    const unregister = vi.fn();
    (sdk.commands.register as ReturnType<typeof vi.fn>).mockReturnValue(unregister);
    const handler = vi.fn();

    function TestComponent() {
      useCommand('test.cmd', handler);
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(unregister).not.toHaveBeenCalled();

    // Unmount by rendering something else
    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <div />
        </WorkspaceProvider>,
      );
    });

    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('calls the latest handler via ref (no stale closure)', () => {
    const sdk = createMockSDK();
    let registeredHandler: ((...args: unknown[]) => void) | undefined;
    (sdk.commands.register as ReturnType<typeof vi.fn>).mockImplementation(
      (_id: string, handler: (...args: unknown[]) => void) => {
        registeredHandler = handler;
        return vi.fn();
      },
    );

    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    let handlerToUse = firstHandler;

    function TestComponent() {
      useCommand('test.cmd', handlerToUse);
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    // Update to second handler via re-render
    handlerToUse = secondHandler;
    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    // Call the registered handler - it should use the latest ref
    registeredHandler?.('arg1');
    expect(secondHandler).toHaveBeenCalledWith('arg1');
    expect(firstHandler).not.toHaveBeenCalled();
  });

  it('re-registers when commandId changes', () => {
    const sdk = createMockSDK();
    const unregister = vi.fn();
    (sdk.commands.register as ReturnType<typeof vi.fn>).mockReturnValue(unregister);
    const handler = vi.fn();

    function TestComponent({ commandId }: { commandId: string }) {
      useCommand(commandId, handler);
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent commandId="cmd.first" />
        </WorkspaceProvider>,
      );
    });

    expect(sdk.commands.register).toHaveBeenCalledTimes(1);
    expect(sdk.commands.register).toHaveBeenCalledWith('cmd.first', expect.any(Function));

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent commandId="cmd.second" />
        </WorkspaceProvider>,
      );
    });

    // Old command should be unregistered, new one registered
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(sdk.commands.register).toHaveBeenCalledTimes(2);
    expect(sdk.commands.register).toHaveBeenCalledWith('cmd.second', expect.any(Function));
  });
});

// ============================================================
// useSettingValue
// ============================================================

describe('useSettingValue', () => {
  it('returns the current setting value', () => {
    const sdk = createMockSDK();
    mockUseSetting.mockReturnValue({
      key: 'theme',
      value: 'dark',
      source: 'test-app',
      schema: { key: 'theme', type: 'string', default: 'light', description: 'Theme' },
    });

    let result: [string | undefined, (v: string) => void] | undefined;

    function TestComponent() {
      result = useSettingValue<string>('theme');
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(result).toBeDefined();
    expect(result![0]).toBe('dark');
    expect(typeof result![1]).toBe('function');
  });

  it('returns schema default when value is not set', () => {
    const sdk = createMockSDK();
    mockUseSetting.mockReturnValue({
      key: 'fontSize',
      value: undefined as unknown as number,
      source: 'test-app',
      schema: { key: 'fontSize', type: 'number', default: 14, description: 'Font size' },
    });

    let result: [number | undefined, (v: number) => void] | undefined;

    function TestComponent() {
      result = useSettingValue<number>('fontSize');
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    // value is falsy, so it falls through to schema.default
    expect(result![0]).toBe(14);
  });

  it('returns undefined when setting does not exist', () => {
    const sdk = createMockSDK();
    mockUseSetting.mockReturnValue(undefined);

    let result: [string | undefined, (v: string) => void] | undefined;

    function TestComponent() {
      result = useSettingValue<string>('nonexistent');
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(result![0]).toBeUndefined();
  });

  it('setValue calls sdk.settings.set', () => {
    const sdk = createMockSDK();
    mockUseSetting.mockReturnValue({
      key: 'theme',
      value: 'dark',
      source: 'test-app',
      schema: { key: 'theme', type: 'string', default: 'light', description: 'Theme' },
    });

    let setValue: ((v: string) => void) | undefined;

    function TestComponent() {
      const [, setVal] = useSettingValue<string>('theme');
      setValue = setVal;
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    act(() => {
      setValue!('light');
    });

    expect(sdk.settings.set).toHaveBeenCalledWith('theme', 'light');
  });
});

// ============================================================
// useStorage
// ============================================================

describe('useStorage', () => {
  it('returns stored value when present', () => {
    const sdk = createMockSDK();
    (sdk.storage.get as ReturnType<typeof vi.fn>).mockReturnValue('stored-value');

    let result: [string, (v: string) => void] | undefined;

    function TestComponent() {
      result = useStorage<string>('myKey', 'default');
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(result![0]).toBe('stored-value');
    expect(sdk.storage.get).toHaveBeenCalledWith('myKey');
  });

  it('returns default value when storage is empty', () => {
    const sdk = createMockSDK();
    (sdk.storage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

    let result: [number, (v: number) => void] | undefined;

    function TestComponent() {
      result = useStorage<number>('counter', 42);
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(result![0]).toBe(42);
  });

  it('setValue updates both local state and sdk storage', () => {
    const sdk = createMockSDK();
    (sdk.storage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

    let result: [string, (v: string) => void] | undefined;

    function TestComponent() {
      result = useStorage<string>('notes', '');
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(result![0]).toBe('');

    act(() => {
      result![1]('Hello World');
    });

    // After setting, the local value should update
    expect(result![0]).toBe('Hello World');
    // And the SDK storage should have been called
    expect(sdk.storage.set).toHaveBeenCalledWith('notes', 'Hello World');
  });

  it('handles complex objects as default values', () => {
    const sdk = createMockSDK();
    (sdk.storage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const defaultItems = [{ id: 1, text: 'default' }];
    let result: [typeof defaultItems, (v: typeof defaultItems) => void] | undefined;

    function TestComponent() {
      result = useStorage('items', defaultItems);
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(result![0]).toEqual(defaultItems);
  });
});

// ============================================================
// useWindowContext
// ============================================================

describe('useWindowContext', () => {
  it('returns window utilities with correct windowId', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue('win-1');

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(ctx).toBeDefined();
    expect(ctx!.windowId).toBe('win-1');
  });

  it('reports isFocused=true when focusedId matches sdk.windowId', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue('win-1');

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(ctx!.isFocused).toBe(true);
  });

  it('reports isFocused=false when another window is focused', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue('win-other');

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(ctx!.isFocused).toBe(false);
  });

  it('close() calls sdk.windows.close()', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue('win-1');

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    ctx!.close();
    expect(sdk.windows.close).toHaveBeenCalled();
  });

  it('minimize() calls sdk.windows.minimize()', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue('win-1');

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    ctx!.minimize();
    expect(sdk.windows.minimize).toHaveBeenCalled();
  });

  it('maximize() calls sdk.windows.maximize()', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue('win-1');

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    ctx!.maximize();
    expect(sdk.windows.maximize).toHaveBeenCalled();
  });

  it('restore() calls sdk.windows.restore()', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue('win-1');

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    ctx!.restore();
    expect(sdk.windows.restore).toHaveBeenCalled();
  });

  it('setTitle() calls sdk.windows.setTitle()', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue('win-1');

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    ctx!.setTitle('New Title');
    expect(sdk.windows.setTitle).toHaveBeenCalledWith('New Title');
  });

  it('reports isFocused=false when no window is focused', () => {
    const sdk = createMockSDK();
    mockUseFocusedWindowId.mockReturnValue(undefined);

    let ctx: ReturnType<typeof useWindowContext> | undefined;

    function TestComponent() {
      ctx = useWindowContext();
      return null;
    }

    act(() => {
      root.render(
        <WorkspaceProvider value={sdk}>
          <TestComponent />
        </WorkspaceProvider>,
      );
    });

    expect(ctx!.isFocused).toBe(false);
  });
});
