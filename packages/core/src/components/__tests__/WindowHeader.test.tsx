import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { WindowHeader } from '../WindowHeader';

// Mock CollaborationBadge to avoid side effects
vi.mock('../CollaborationBadge', () => ({
  CollaborationBadge: () => null,
}));

const mockCloseWindow = vi.fn();
const mockMinimizeWindow = vi.fn();
const mockToggleMaximize = vi.fn();
const mockOpenContextMenu = vi.fn();

vi.mock('@archbase/workspace-state', () => {
  const useWindowFn = vi.fn();

  return {
    useWindow: useWindowFn,
    useWindowsStore: Object.assign(
      (selector: (s: Record<string, unknown>) => unknown) =>
        selector({
          closeWindow: mockCloseWindow,
          minimizeWindow: mockMinimizeWindow,
          toggleMaximize: mockToggleMaximize,
        }),
      {
        getState: () => ({
          focusWindow: vi.fn(),
        }),
      },
    ),
    useContextMenuStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ open: mockOpenContextMenu }),
    useCollaborationStore: Object.assign(
      () => ({}),
      {
        getState: () => ({ connected: false, sharedWindows: new Set() }),
      },
    ),
    useSharedWindows: () => [],
  };
});

import { useWindow } from '@archbase/workspace-state';

const mockUseWindow = vi.mocked(useWindow);

function createMockWindow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    appId: 'app1',
    title: 'My Window',
    state: 'normal',
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    zIndex: 1,
    flags: { resizable: true, minimizable: true, maximizable: true, closable: true, alwaysOnTop: false },
    metadata: { icon: null },
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockCloseWindow.mockClear();
  mockMinimizeWindow.mockClear();
  mockToggleMaximize.mockClear();
  mockOpenContextMenu.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderHeader(windowId = 'w1', isFocused = true) {
  act(() => {
    root.render(
      <WindowHeader
        windowId={windowId}
        isFocused={isFocused}
        onDragPointerDown={vi.fn()}
      />,
    );
  });
}

describe('WindowHeader', () => {
  it('renders null when window not found', () => {
    mockUseWindow.mockReturnValue(undefined as never);
    renderHeader();
    expect(container.innerHTML).toBe('');
  });

  it('renders toolbar role with aria-label', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    renderHeader();
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.getAttribute('aria-label')).toBe('My Window window controls');
  });

  it('renders close button with aria-label="Close window"', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    renderHeader();
    const btn = container.querySelector('[aria-label="Close window"]');
    expect(btn).not.toBeNull();
  });

  it('renders minimize button with aria-label="Minimize window"', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    renderHeader();
    const btn = container.querySelector('[aria-label="Minimize window"]');
    expect(btn).not.toBeNull();
  });

  it('renders maximize button with correct aria-label for normal state', () => {
    mockUseWindow.mockReturnValue(createMockWindow({ state: 'normal' }) as never);
    renderHeader();
    const btn = container.querySelector('[aria-label="Maximize window"]');
    expect(btn).not.toBeNull();
  });

  it('renders maximize button with correct aria-label for maximized state', () => {
    mockUseWindow.mockReturnValue(createMockWindow({ state: 'maximized' }) as never);
    renderHeader();
    const btn = container.querySelector('[aria-label="Restore window"]');
    expect(btn).not.toBeNull();
  });

  it('clicking close calls closeWindow', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    renderHeader();
    const btn = container.querySelector('[aria-label="Close window"]') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(mockCloseWindow).toHaveBeenCalledWith('w1');
  });

  it('clicking minimize calls minimizeWindow', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    renderHeader();
    const btn = container.querySelector('[aria-label="Minimize window"]') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(mockMinimizeWindow).toHaveBeenCalledWith('w1');
  });

  it('clicking maximize calls toggleMaximize', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    renderHeader();
    const btn = container.querySelector('[aria-label="Maximize window"]') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(mockToggleMaximize).toHaveBeenCalled();
    expect(mockToggleMaximize.mock.calls[0][0]).toBe('w1');
  });

  it('displays window title text', () => {
    mockUseWindow.mockReturnValue(createMockWindow({ title: 'Hello Title' }) as never);
    renderHeader();
    const toolbar = container.querySelector('[role="toolbar"]')!;
    expect(toolbar.textContent).toContain('Hello Title');
  });
});
