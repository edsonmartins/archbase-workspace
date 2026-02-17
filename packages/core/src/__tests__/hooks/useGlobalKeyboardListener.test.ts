import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ── Hoisted mocks (available before vi.mock factories) ───

const {
  mockRegister,
  mockUnregister,
  mockGetFocusedWindow,
  mockCloseWindow,
  mockMinimizeAll,
  mockFocusNext,
  mockFocusPrevious,
  mockTileWindows,
  mockCascadeWindows,
  mockParseKeyCombo,
  mockMatchesKeyCombo,
  mockShortcutsHolder,
} = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockUnregister: vi.fn(),
  mockGetFocusedWindow: vi.fn(),
  mockCloseWindow: vi.fn(),
  mockMinimizeAll: vi.fn(),
  mockFocusNext: vi.fn(),
  mockFocusPrevious: vi.fn(),
  mockTileWindows: vi.fn(),
  mockCascadeWindows: vi.fn(),
  mockParseKeyCombo: vi.fn().mockReturnValue({ key: 'k', ctrl: true }),
  mockMatchesKeyCombo: vi.fn().mockReturnValue(false),
  mockShortcutsHolder: {
    shortcuts: [] as Array<{
      id: string;
      combo: { key: string; ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean };
      label: string;
      scope: string;
      enabled: boolean;
    }>,
  },
}));

// ── Mocks ─────────────────────────────────────────────────

vi.mock('@archbase/workspace-state', () => ({
  useShortcutsStore: Object.assign(() => ({}), {
    getState: () => ({
      register: mockRegister,
      unregister: mockUnregister,
      getAllShortcuts: () => mockShortcutsHolder.shortcuts,
    }),
  }),
  useWindowsStore: Object.assign(() => ({}), {
    getState: () => ({
      getFocusedWindow: mockGetFocusedWindow,
      closeWindow: mockCloseWindow,
      minimizeAll: mockMinimizeAll,
      focusNext: mockFocusNext,
      focusPrevious: mockFocusPrevious,
      tileWindows: mockTileWindows,
      cascadeWindows: mockCascadeWindows,
    }),
  }),
}));

vi.mock('../../utils/parseKeyCombo', () => ({
  parseKeyCombo: (...args: unknown[]) => mockParseKeyCombo(...args),
  matchesKeyCombo: (...args: unknown[]) => mockMatchesKeyCombo(...args),
  IS_MAC: false,
}));

// ── Import under test (after mocks) ──────────────────────

import { useGlobalKeyboardListener } from '../../hooks/useGlobalKeyboardListener';

// ── Test Component ───────────────────────────────────────

function TestComponent({
  onToggleLauncher,
  onToggleCommandPalette,
}: {
  onToggleLauncher: () => void;
  onToggleCommandPalette: () => void;
}) {
  useGlobalKeyboardListener({ onToggleLauncher, onToggleCommandPalette });
  return null;
}

// ── Test Suite ───────────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.clearAllMocks();
  mockShortcutsHolder.shortcuts = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderHook(
  onToggleLauncher = vi.fn(),
  onToggleCommandPalette = vi.fn(),
) {
  act(() => {
    root.render(
      React.createElement(TestComponent, {
        onToggleLauncher,
        onToggleCommandPalette,
      }),
    );
  });
  return { onToggleLauncher, onToggleCommandPalette };
}

describe('useGlobalKeyboardListener', () => {
  it('registers built-in shortcuts on mount', () => {
    renderHook();
    // BUILT_IN_SHORTCUTS has 9 entries; register should be called for each
    expect(mockRegister).toHaveBeenCalledTimes(9);

    // Verify call arguments include the expected shortcut ids
    const registeredIds = mockRegister.mock.calls.map(
      (call: unknown[]) => (call[0] as { id: string }).id,
    );
    expect(registeredIds).toContain('workspace.openLauncher');
    expect(registeredIds).toContain('workspace.closeWindow');
    expect(registeredIds).toContain('workspace.minimizeAll');
    expect(registeredIds).toContain('workspace.focusNext');
    expect(registeredIds).toContain('workspace.focusPrevious');
    expect(registeredIds).toContain('workspace.openCommandPalette');
  });

  it('unregisters shortcuts on unmount', () => {
    renderHook();
    expect(mockUnregister).not.toHaveBeenCalled();

    // Unmount
    act(() => root.unmount());

    expect(mockUnregister).toHaveBeenCalledTimes(9);
    const unregisteredIds = mockUnregister.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(unregisteredIds).toContain('workspace.openLauncher');
    expect(unregisteredIds).toContain('workspace.closeWindow');
    expect(unregisteredIds).toContain('workspace.minimizeAll');

    // Re-create root for afterEach cleanup
    root = createRoot(container);
  });

  it('dispatches keydown matching launcher shortcut calls onToggleLauncher', () => {
    mockShortcutsHolder.shortcuts = [
      {
        id: 'workspace.openLauncher',
        combo: { key: 'k', ctrl: true },
        label: 'Open App Launcher',
        scope: 'global',
        enabled: true,
      },
    ];

    // Make matchesKeyCombo return true for this shortcut
    mockMatchesKeyCombo.mockReturnValue(true);

    const { onToggleLauncher } = renderHook();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(onToggleLauncher).toHaveBeenCalledTimes(1);
  });

  it('ignores keydown when target is INPUT element', () => {
    mockShortcutsHolder.shortcuts = [
      {
        id: 'workspace.openLauncher',
        combo: { key: 'k', ctrl: true },
        label: 'Open App Launcher',
        scope: 'global',
        enabled: true,
      },
    ];

    mockMatchesKeyCombo.mockReturnValue(true);

    const { onToggleLauncher } = renderHook();

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(onToggleLauncher).not.toHaveBeenCalled();
    input.remove();
  });

  it('calls closeWindow when close shortcut matches and window focused', () => {
    const focusedWindow = { id: 'win-1', title: 'Test', appId: 'test' };
    mockGetFocusedWindow.mockReturnValue(focusedWindow);

    mockShortcutsHolder.shortcuts = [
      {
        id: 'workspace.closeWindow',
        combo: { key: 'w', ctrl: true },
        label: 'Close Window',
        scope: 'global',
        enabled: true,
      },
    ];

    mockMatchesKeyCombo.mockReturnValue(true);

    renderHook();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'w',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(mockCloseWindow).toHaveBeenCalledWith('win-1');
  });

  it('calls minimizeAll when minimize shortcut matches', () => {
    mockShortcutsHolder.shortcuts = [
      {
        id: 'workspace.minimizeAll',
        combo: { key: 'm', ctrl: true },
        label: 'Minimize All',
        scope: 'global',
        enabled: true,
      },
    ];

    mockMatchesKeyCombo.mockReturnValue(true);

    renderHook();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'm',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(mockMinimizeAll).toHaveBeenCalledTimes(1);
  });

  it('only fires shortcuts with scope=global from global keydown', () => {
    const globalAction = vi.fn();
    mockShortcutsHolder.shortcuts = [
      {
        id: 'workspace.openLauncher',
        combo: { key: 'k', ctrl: true },
        label: 'Open App Launcher',
        scope: 'global',
        enabled: true,
      },
    ];

    mockMatchesKeyCombo.mockReturnValue(true);

    const { onToggleLauncher } = renderHook();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(onToggleLauncher).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire shortcuts with scope=window from the global listener', () => {
    mockShortcutsHolder.shortcuts = [
      {
        id: 'app.custom',
        combo: { key: 'k', ctrl: true },
        label: 'Window-scoped Shortcut',
        scope: 'window',
        enabled: true,
      },
    ];

    mockMatchesKeyCombo.mockReturnValue(true);

    const { onToggleLauncher } = renderHook();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    // The window-scoped shortcut should be skipped entirely
    expect(onToggleLauncher).not.toHaveBeenCalled();
  });

  it('does NOT fire shortcuts with scope=app from the global listener', () => {
    mockShortcutsHolder.shortcuts = [
      {
        id: 'app.scoped',
        combo: { key: 'a', ctrl: true },
        label: 'App-scoped Shortcut',
        scope: 'app',
        enabled: true,
      },
    ];

    mockMatchesKeyCombo.mockReturnValue(true);

    renderHook();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    // No action should have been called
    expect(mockCloseWindow).not.toHaveBeenCalled();
    expect(mockMinimizeAll).not.toHaveBeenCalled();
    expect(mockFocusNext).not.toHaveBeenCalled();
    expect(mockFocusPrevious).not.toHaveBeenCalled();
    expect(mockTileWindows).not.toHaveBeenCalled();
    expect(mockCascadeWindows).not.toHaveBeenCalled();
  });
});
