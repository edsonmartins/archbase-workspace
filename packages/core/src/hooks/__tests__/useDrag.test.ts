import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── PointerEvent polyfill (jsdom doesn't define it) ───────
if (typeof PointerEvent === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).PointerEvent = MouseEvent;
}

// ── Hoisted mocks ─────────────────────────────────────────

const { mockWindowsStore, mockWindowData } = vi.hoisted(() => {
  const mockWindowData = {
    current: {
      id: 'win-1',
      state: 'normal',
      position: { x: 100, y: 100 },
      size: { width: 800, height: 600 },
    } as Record<string, unknown> | null,
  };

  const mockWindowsStore = {
    updatePosition: vi.fn(),
    setBounds: vi.fn(),
    focusWindow: vi.fn(),
    windows: new Map([['win-1', mockWindowData.current as Record<string, unknown>]]),
  };

  return { mockWindowsStore, mockWindowData };
});

vi.mock('@archbase/workspace-state', () => ({
  useWindow: () => mockWindowData.current,
  useWindowsStore: Object.assign(
    (selector: (s: typeof mockWindowsStore) => unknown) => selector(mockWindowsStore),
    {
      getState: () => ({
        ...mockWindowsStore,
        windows: new Map([['win-1', mockWindowData.current]]),
      }),
    },
  ),
}));

vi.mock('../../utils/computeSnapZones', () => ({
  computeSnapZones: vi.fn(() => []),
  getSnapZoneAtPosition: vi.fn(() => null),
}));

// ── Imports ────────────────────────────────────────────────

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useDrag } from '../useDrag';

// ── Helper ────────────────────────────────────────────────

type UseDragReturn = ReturnType<typeof useDrag>;

function DragComponent({ windowId, result }: { windowId: string; result: { current: UseDragReturn | null } }) {
  result.current = useDrag(windowId);
  return null;
}

function setup(windowId = 'win-1') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result: { current: UseDragReturn | null } = { current: null };

  act(() => {
    root.render(React.createElement(DragComponent, { windowId, result }));
  });

  return {
    result,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

// ── Tests ─────────────────────────────────────────────────

describe('useDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindowData.current = {
      id: 'win-1',
      state: 'normal',
      position: { x: 100, y: 100 },
      size: { width: 800, height: 600 },
    };
  });

  it('returns onPointerDown handler', () => {
    const { result, cleanup } = setup();
    expect(typeof result.current?.onPointerDown).toBe('function');
    cleanup();
  });

  it('ignores non-left-button pointer events', () => {
    const { result, cleanup } = setup();

    const event = { button: 2, clientX: 0, clientY: 0, target: document.createElement('div'), preventDefault: vi.fn() } as unknown as React.PointerEvent;
    result.current!.onPointerDown(event);

    expect(mockWindowsStore.focusWindow).not.toHaveBeenCalled();
    cleanup();
  });

  it('ignores pointer events on buttons', () => {
    const { result, cleanup } = setup();

    const button = document.createElement('button');
    document.body.appendChild(button);

    const event = {
      button: 0,
      clientX: 0,
      clientY: 0,
      target: button,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;
    result.current!.onPointerDown(event);

    expect(mockWindowsStore.focusWindow).not.toHaveBeenCalled();
    button.remove();
    cleanup();
  });

  it('ignores pointer events when window is maximized', () => {
    mockWindowData.current = {
      ...mockWindowData.current!,
      state: 'maximized',
    };

    const { result, cleanup } = setup();

    const event = {
      button: 0,
      clientX: 0,
      clientY: 0,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;
    result.current!.onPointerDown(event);

    expect(mockWindowsStore.focusWindow).not.toHaveBeenCalled();
    cleanup();
  });

  it('focuses the window on valid pointer down', () => {
    const { result, cleanup } = setup();

    const event = {
      button: 0,
      clientX: 200,
      clientY: 150,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;
    result.current!.onPointerDown(event);

    expect(mockWindowsStore.focusWindow).toHaveBeenCalledWith('win-1');
    cleanup();
  });

  it('attaches pointermove and pointerup listeners to document on drag start', () => {
    const { result, cleanup } = setup();

    const addSpy = vi.spyOn(document, 'addEventListener');
    const event = {
      button: 0,
      clientX: 200,
      clientY: 150,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;
    result.current!.onPointerDown(event);

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    addSpy.mockRestore();

    // Cleanup by firing pointerup
    document.dispatchEvent(new PointerEvent('pointerup'));
    cleanup();
  });

  it('sets body cursor to "grabbing" on drag start', () => {
    const { result, cleanup } = setup();

    const event = {
      button: 0,
      clientX: 200,
      clientY: 150,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;
    result.current!.onPointerDown(event);

    expect(document.body.style.cursor).toBe('grabbing');

    // Cleanup
    document.dispatchEvent(new PointerEvent('pointerup'));
    expect(document.body.style.cursor).toBe('');
    cleanup();
  });

  it('clears cursor and listeners on pointer up', () => {
    const { result, cleanup } = setup();

    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const event = {
      button: 0,
      clientX: 200,
      clientY: 150,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent;
    result.current!.onPointerDown(event);

    // Fire pointerup
    act(() => {
      document.dispatchEvent(new PointerEvent('pointerup'));
    });

    expect(document.body.style.cursor).toBe('');
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

    removeSpy.mockRestore();
    cleanup();
  });
});
