import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

import { WorkspaceProvider } from '../../context/WorkspaceProvider';
import { useCommand } from '../useCommand';
import type { WorkspaceSDK, CommandHandler } from '@archbase/workspace-types';

// ── Helpers ───────────────────────────────────────────────

function makeMockSDK(commandRegister: (id: string, h: CommandHandler) => () => void): WorkspaceSDK {
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
    commands: {
      register: commandRegister as WorkspaceSDK['commands']['register'],
      execute: vi.fn(),
    },
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
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// ── Tests ─────────────────────────────────────────────────

describe('useCommand', () => {
  it('registers a command on mount', () => {
    const mockUnregister = vi.fn();
    const mockRegister = vi.fn(() => mockUnregister);
    const handler = vi.fn();
    const sdk = makeMockSDK(mockRegister);

    function TestComponent() {
      useCommand('app.doSomething', handler);
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

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledWith('app.doSomething', expect.any(Function));
  });

  it('calls the unregister function on unmount', () => {
    const mockUnregister = vi.fn();
    const mockRegister = vi.fn(() => mockUnregister);
    const handler = vi.fn();
    const sdk = makeMockSDK(mockRegister);

    function TestComponent() {
      useCommand('app.doSomething', handler);
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

    expect(mockUnregister).not.toHaveBeenCalled();

    act(() => root.unmount());
    // Re-create root for afterEach cleanup
    root = createRoot(container);

    expect(mockUnregister).toHaveBeenCalledTimes(1);
  });

  it('forwards calls to the latest handler via ref', () => {
    const mockUnregister = vi.fn();
    let registeredWrapper: CommandHandler | undefined;
    const mockRegister = vi.fn((_id: string, h: CommandHandler) => {
      registeredWrapper = h;
      return mockUnregister;
    });

    const firstHandler: CommandHandler = vi.fn();
    const secondHandler: CommandHandler = vi.fn();

    // External holder — avoids React treating a function as a functional updater
    const handlerHolder = { current: firstHandler };
    const sdk = makeMockSDK(mockRegister);

    function TestComponent() {
      useCommand('app.action', handlerHolder.current);
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

    // Registered once
    expect(mockRegister).toHaveBeenCalledTimes(1);

    // Update handler and re-render — useCommand updates its internal handlerRef
    act(() => {
      handlerHolder.current = secondHandler;
      root.render(
        React.createElement(
          WorkspaceProvider,
          { value: sdk },
          React.createElement(TestComponent),
        ),
      );
    });

    // Register is NOT called again — hook uses a ref to forward calls
    expect(mockRegister).toHaveBeenCalledTimes(1);

    // But the wrapper now calls the latest handler
    registeredWrapper?.('payload');
    expect(secondHandler).toHaveBeenCalledWith('payload');
    expect(firstHandler).not.toHaveBeenCalled();
  });

  it('re-registers when commandId changes', () => {
    const mockUnregister = vi.fn();
    const mockRegister = vi.fn(() => mockUnregister);
    const handler = vi.fn();

    let setCommandId: (id: string) => void = () => {};

    function TestComponent() {
      const [cmdId, setId] = React.useState('app.first');
      setCommandId = setId;
      useCommand(cmdId, handler);
      return null;
    }

    act(() => {
      root.render(
        React.createElement(
          WorkspaceProvider,
          { value: makeMockSDK(mockRegister) },
          React.createElement(TestComponent),
        ),
      );
    });

    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledWith('app.first', expect.any(Function));

    act(() => {
      setCommandId('app.second');
    });

    // Old command unregistered, new command registered
    expect(mockUnregister).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledTimes(2);
    expect(mockRegister).toHaveBeenLastCalledWith('app.second', expect.any(Function));
  });
});
