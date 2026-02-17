import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Window } from '../Window';

// Mock RemoteApp to avoid Module Federation side effects
vi.mock('../RemoteApp', () => ({
  RemoteApp: () => <div data-testid="remote-app" />,
}));

// Mock WindowHeader
vi.mock('../WindowHeader', () => ({
  WindowHeader: (props: Record<string, unknown>) => (
    <div data-testid="window-header" data-window-id={props.windowId} />
  ),
}));

const mockFocusWindow = vi.fn();

vi.mock('@archbase/workspace-state', () => ({
  useWindow: vi.fn(),
  useFocusedWindowId: vi.fn(),
  useWindowsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ focusWindow: mockFocusWindow }),
}));

vi.mock('../../hooks/useDrag', () => ({
  useDrag: () => ({ onPointerDown: vi.fn() }),
}));

vi.mock('../../hooks/useResize', () => ({
  useResize: () => ({
    getResizeHandleProps: (dir: string) => ({
      onPointerDown: vi.fn(),
      'data-resize-dir': dir,
    }),
  }),
}));

// Import mocked modules so we can control return values
import { useWindow, useFocusedWindowId } from '@archbase/workspace-state';

const mockUseWindow = vi.mocked(useWindow);
const mockUseFocusedWindowId = vi.mocked(useFocusedWindowId);

function createMockWindow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    appId: 'app1',
    title: 'Test Window',
    state: 'normal',
    position: { x: 100, y: 50 },
    size: { width: 600, height: 400 },
    zIndex: 10,
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
  mockFocusWindow.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderWindow(windowId = 'w1') {
  act(() => {
    root.render(<Window windowId={windowId} />);
  });
}

describe('Window', () => {
  it('renders null when window not found', () => {
    mockUseWindow.mockReturnValue(undefined as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderWindow();
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog role with window title as aria-label', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderWindow();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute('aria-label')).toBe('Test Window');
  });

  it('renders WindowHeader child', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderWindow();
    const header = container.querySelector('[data-testid="window-header"]');
    expect(header).not.toBeNull();
    expect(header!.getAttribute('data-window-id')).toBe('w1');
  });

  it('renders resize handles when resizable and not maximized', () => {
    mockUseWindow.mockReturnValue(createMockWindow({ state: 'normal' }) as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderWindow();
    const handles = container.querySelectorAll('[role="separator"]');
    expect(handles.length).toBe(8);
  });

  it('hides resize handles when maximized', () => {
    mockUseWindow.mockReturnValue(createMockWindow({ state: 'maximized' }) as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderWindow();
    const handles = container.querySelectorAll('[role="separator"]');
    expect(handles.length).toBe(0);
  });

  it('applies focused shadow style via zIndex', () => {
    const mockWin = createMockWindow({ zIndex: 42 });
    mockUseWindow.mockReturnValue(mockWin as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderWindow();
    const dialog = container.querySelector('[role="dialog"]') as HTMLDivElement;
    expect(dialog.style.zIndex).toBe('42');
  });

  it('calls focusWindow on pointerdown when not focused', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    mockUseFocusedWindowId.mockReturnValue('other-window');
    renderWindow();
    const dialog = container.querySelector('[role="dialog"]')!;
    act(() => {
      dialog.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(mockFocusWindow).toHaveBeenCalledWith('w1');
  });

  it('does not call focusWindow when already focused', () => {
    mockUseWindow.mockReturnValue(createMockWindow() as never);
    mockUseFocusedWindowId.mockReturnValue('w1');
    renderWindow();
    const dialog = container.querySelector('[role="dialog"]')!;
    act(() => {
      dialog.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(mockFocusWindow).not.toHaveBeenCalled();
  });
});
