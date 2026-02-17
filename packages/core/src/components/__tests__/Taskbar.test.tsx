import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Taskbar } from '../Taskbar';

// Mock child components to avoid side effects
vi.mock('../StatusBarWidgets', () => ({
  StatusBarWidgets: () => null,
}));

vi.mock('../OfflineIndicator', () => ({
  OfflineIndicator: () => null,
}));

const mockFocusWindow = vi.fn();
const mockMinimizeWindow = vi.fn();
const mockCloseWindow = vi.fn();
const mockOpenContextMenu = vi.fn();

vi.mock('@archbase/workspace-state', () => {
  const useAllWindowsFn = vi.fn();
  const useFocusedWindowIdFn = vi.fn();

  return {
    useAllWindows: useAllWindowsFn,
    useFocusedWindowId: useFocusedWindowIdFn,
    useWindowsStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        focusWindow: mockFocusWindow,
        minimizeWindow: mockMinimizeWindow,
        closeWindow: mockCloseWindow,
      }),
    useContextMenuStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ open: mockOpenContextMenu }),
  };
});

import { useAllWindows, useFocusedWindowId } from '@archbase/workspace-state';

const mockUseAllWindows = vi.mocked(useAllWindows);
const mockUseFocusedWindowId = vi.mocked(useFocusedWindowId);

function createMockWindow(id: string, title: string, state = 'normal') {
  return {
    id,
    appId: `app-${id}`,
    title,
    state,
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    zIndex: 1,
    flags: { resizable: true, minimizable: true, maximizable: true, closable: true },
    metadata: { icon: null },
  };
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockFocusWindow.mockClear();
  mockMinimizeWindow.mockClear();
  mockCloseWindow.mockClear();
  mockOpenContextMenu.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderTaskbar() {
  act(() => {
    root.render(
      <Taskbar apps={[]} onOpenApp={vi.fn()} onOpenLauncher={vi.fn()} />,
    );
  });
}

describe('Taskbar', () => {
  it('renders toolbar role with aria-label="Taskbar"', () => {
    mockUseAllWindows.mockReturnValue([]);
    mockUseFocusedWindowId.mockReturnValue('');
    renderTaskbar();
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.getAttribute('aria-label')).toBe('Taskbar');
  });

  it('renders launcher button with aria-label', () => {
    mockUseAllWindows.mockReturnValue([]);
    mockUseFocusedWindowId.mockReturnValue('');
    renderTaskbar();
    const btn = container.querySelector('[aria-label="Open App Launcher (Cmd+K)"]');
    expect(btn).not.toBeNull();
  });

  it('renders a button for each window', () => {
    mockUseAllWindows.mockReturnValue([
      createMockWindow('w1', 'Window 1'),
      createMockWindow('w2', 'Window 2'),
      createMockWindow('w3', 'Window 3'),
    ] as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderTaskbar();
    const buttons = container.querySelectorAll('.taskbar-running-btn');
    expect(buttons.length).toBe(3);
  });

  it('active window button has aria-pressed=true', () => {
    mockUseAllWindows.mockReturnValue([
      createMockWindow('w1', 'Window 1'),
      createMockWindow('w2', 'Window 2'),
    ] as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderTaskbar();
    const buttons = container.querySelectorAll('.taskbar-running-btn');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('clicking minimized window calls focusWindow', () => {
    mockUseAllWindows.mockReturnValue([
      createMockWindow('w1', 'Window 1', 'minimized'),
    ] as never);
    mockUseFocusedWindowId.mockReturnValue('');
    renderTaskbar();
    const btn = container.querySelector('.taskbar-running-btn') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(mockFocusWindow).toHaveBeenCalledWith('w1');
  });

  it('clicking focused window calls minimizeWindow', () => {
    mockUseAllWindows.mockReturnValue([
      createMockWindow('w1', 'Window 1', 'normal'),
    ] as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderTaskbar();
    const btn = container.querySelector('.taskbar-running-btn') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(mockMinimizeWindow).toHaveBeenCalledWith('w1');
  });

  it('clicking unfocused window calls focusWindow', () => {
    mockUseAllWindows.mockReturnValue([
      createMockWindow('w1', 'Window 1', 'normal'),
    ] as never);
    mockUseFocusedWindowId.mockReturnValue('other');
    renderTaskbar();
    const btn = container.querySelector('.taskbar-running-btn') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(mockFocusWindow).toHaveBeenCalledWith('w1');
  });

  it('renders separator element', () => {
    mockUseAllWindows.mockReturnValue([]);
    mockUseFocusedWindowId.mockReturnValue('');
    renderTaskbar();
    const separator = container.querySelector('[role="separator"]');
    expect(separator).not.toBeNull();
  });
});
