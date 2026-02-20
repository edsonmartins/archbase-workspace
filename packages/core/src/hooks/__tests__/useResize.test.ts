import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── PointerEvent polyfill (jsdom doesn't define it) ───────
if (typeof PointerEvent === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).PointerEvent = MouseEvent;
}

// ── Hoisted mocks ─────────────────────────────────────────

const { mockWindowsStore, mockWindowHolder } = vi.hoisted(() => {
  const mockWindowHolder = {
    current: {
      id: 'win-1',
      position: { x: 100, y: 100 },
      size: { width: 800, height: 600 },
      constraints: { minWidth: 200, minHeight: 150, maxWidth: 1920, maxHeight: 1080 },
    } as Record<string, unknown>,
  };

  const mockWindowsStore = {
    setBounds: vi.fn(),
    focusWindow: vi.fn(),
  };

  return { mockWindowsStore, mockWindowHolder };
});

vi.mock('@archbase/workspace-state', () => ({
  useWindowsStore: Object.assign(
    (selector: (s: typeof mockWindowsStore) => unknown) => selector(mockWindowsStore),
    {
      getState: () => ({
        ...mockWindowsStore,
        windows: new Map([['win-1', mockWindowHolder.current]]),
      }),
    },
  ),
}));

// ── Imports ────────────────────────────────────────────────

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useResize } from '../useResize';
import type { ResizeDirection } from '../useResize';

// ── Helper ────────────────────────────────────────────────

type UseResizeReturn = ReturnType<typeof useResize>;

function ResizeComponent({ windowId, result }: { windowId: string; result: { current: UseResizeReturn | null } }) {
  result.current = useResize(windowId);
  return null;
}

function setup(windowId = 'win-1') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result: { current: UseResizeReturn | null } = { current: null };

  act(() => {
    root.render(React.createElement(ResizeComponent, { windowId, result }));
  });

  return {
    result,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function makePointerEvent(clientX: number, clientY: number, button = 0): React.PointerEvent {
  return {
    button,
    clientX,
    clientY,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.PointerEvent;
}

// ── Tests ─────────────────────────────────────────────────

describe('useResize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindowHolder.current = {
      id: 'win-1',
      position: { x: 100, y: 100 },
      size: { width: 800, height: 600 },
      constraints: { minWidth: 200, minHeight: 150, maxWidth: 1920, maxHeight: 1080 },
    };
  });

  it('returns getResizeHandleProps function', () => {
    const { result, cleanup } = setup();
    expect(typeof result.current?.getResizeHandleProps).toBe('function');
    cleanup();
  });

  it('getResizeHandleProps returns object with onPointerDown', () => {
    const { result, cleanup } = setup();
    const props = result.current!.getResizeHandleProps('e');
    expect(typeof props.onPointerDown).toBe('function');
    cleanup();
  });

  it('ignores non-left-button events', () => {
    const { result, cleanup } = setup();
    const props = result.current!.getResizeHandleProps('e');
    const event = makePointerEvent(0, 0, 2);
    props.onPointerDown(event);
    expect(mockWindowsStore.focusWindow).not.toHaveBeenCalled();
    cleanup();
  });

  it('focuses window on resize start', () => {
    const { result, cleanup } = setup();
    const props = result.current!.getResizeHandleProps('e');
    props.onPointerDown(makePointerEvent(900, 200));
    expect(mockWindowsStore.focusWindow).toHaveBeenCalledWith('win-1');
    // Cleanup
    document.dispatchEvent(new PointerEvent('pointerup'));
    cleanup();
  });

  it('sets directional cursor on body for "e" direction', () => {
    const { result, cleanup } = setup();
    result.current!.getResizeHandleProps('e').onPointerDown(makePointerEvent(900, 200));
    expect(document.body.style.cursor).toBe('e-resize');
    document.dispatchEvent(new PointerEvent('pointerup'));
    expect(document.body.style.cursor).toBe('');
    cleanup();
  });

  it('sets "se-resize" cursor for "se" direction', () => {
    const { result, cleanup } = setup();
    result.current!.getResizeHandleProps('se').onPointerDown(makePointerEvent(900, 700));
    expect(document.body.style.cursor).toBe('se-resize');
    document.dispatchEvent(new PointerEvent('pointerup'));
    cleanup();
  });

  it('calls setBounds when pointer moves (east resize)', () => {
    vi.useFakeTimers();
    const { result, cleanup } = setup();

    result.current!.getResizeHandleProps('e').onPointerDown(makePointerEvent(900, 200));

    // Simulate pointermove +50px east
    const moveEvent = new PointerEvent('pointermove', { clientX: 950, clientY: 200, bubbles: true });
    act(() => {
      document.dispatchEvent(moveEvent);
    });

    // RAF should fire
    act(() => {
      vi.runAllTimers();
    });

    expect(mockWindowsStore.setBounds).toHaveBeenCalledWith(
      'win-1',
      expect.objectContaining({
        width: 850, // 800 + 50
      }),
    );

    document.dispatchEvent(new PointerEvent('pointerup'));
    vi.useRealTimers();
    cleanup();
  });

  it('clamps width to minWidth constraint', () => {
    vi.useFakeTimers();
    const { result, cleanup } = setup();

    // Start resize from west edge
    result.current!.getResizeHandleProps('e').onPointerDown(makePointerEvent(900, 200));

    // Move far left — would make width negative
    const moveEvent = new PointerEvent('pointermove', { clientX: 100, clientY: 200, bubbles: true });
    act(() => {
      document.dispatchEvent(moveEvent);
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(mockWindowsStore.setBounds).toHaveBeenCalledWith(
      'win-1',
      expect.objectContaining({
        width: 200, // clamped to minWidth
      }),
    );

    document.dispatchEvent(new PointerEvent('pointerup'));
    vi.useRealTimers();
    cleanup();
  });

  it('calls setBounds when pointer moves (south resize)', () => {
    vi.useFakeTimers();
    const { result, cleanup } = setup();

    result.current!.getResizeHandleProps('s').onPointerDown(makePointerEvent(200, 700));

    const moveEvent = new PointerEvent('pointermove', { clientX: 200, clientY: 800, bubbles: true });
    act(() => {
      document.dispatchEvent(moveEvent);
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(mockWindowsStore.setBounds).toHaveBeenCalledWith(
      'win-1',
      expect.objectContaining({
        height: 700, // 600 + 100
      }),
    );

    document.dispatchEvent(new PointerEvent('pointerup'));
    vi.useRealTimers();
    cleanup();
  });

  it('attaches and removes event listeners to document', () => {
    const { result, cleanup } = setup();
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    result.current!.getResizeHandleProps('se').onPointerDown(makePointerEvent(900, 700));

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

    act(() => {
      document.dispatchEvent(new PointerEvent('pointerup'));
    });

    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
    cleanup();
  });

  it('each direction returns the correct onPointerDown handler', () => {
    const { result, cleanup } = setup();
    const directions: ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    for (const dir of directions) {
      const props = result.current!.getResizeHandleProps(dir);
      expect(typeof props.onPointerDown).toBe('function');
    }
    cleanup();
  });
});
