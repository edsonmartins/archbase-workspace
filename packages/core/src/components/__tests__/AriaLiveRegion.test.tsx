import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ── Hoisted mocks ─────────────────────────────────────────

const { mockSubscribe, mockSubscribers } = vi.hoisted(() => {
  const mockSubscribers: Array<(windows: Map<string, unknown>, prev: Map<string, unknown>) => void> = [];
  const mockSubscribe = vi.fn(
    (_selector: unknown, handler: (w: Map<string, unknown>, p: Map<string, unknown>) => void) => {
      mockSubscribers.push(handler);
      return () => {
        const idx = mockSubscribers.indexOf(handler);
        if (idx >= 0) mockSubscribers.splice(idx, 1);
      };
    },
  );
  return { mockSubscribe, mockSubscribers };
});

vi.mock('@archbase/workspace-state', () => ({
  useWindowsStore: Object.assign(() => ({}), {
    subscribe: mockSubscribe,
    getState: () => ({ windows: new Map() }),
  }),
}));

// ── Imports ────────────────────────────────────────────────

import { AriaLiveRegion } from '../AriaLiveRegion';

// ── Test scaffolding ──────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.clearAllMocks();
  mockSubscribers.length = 0;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// ── Tests ─────────────────────────────────────────────────

describe('AriaLiveRegion', () => {
  it('renders an invisible status div with aria-live="polite"', () => {
    act(() => {
      root.render(<AriaLiveRegion />);
    });

    const el = container.querySelector('[role="status"][aria-live="polite"]');
    expect(el).not.toBeNull();
    expect(el!.getAttribute('aria-atomic')).toBe('true');
  });

  it('subscribes to window store on mount', () => {
    act(() => {
      root.render(<AriaLiveRegion />);
    });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('announces when a new window is added', () => {
    act(() => {
      root.render(<AriaLiveRegion />);
    });

    const win = { title: 'My App', id: 'w1', state: 'normal' };
    const prev = new Map<string, unknown>();
    const next = new Map<string, unknown>([['w1', win]]);

    act(() => {
      mockSubscribers[0]?.(next, prev);
    });

    const el = container.querySelector('[role="status"]');
    expect(el?.textContent).toContain('My App');
    expect(el?.textContent).toContain('opened');
  });

  it('announces when a window is removed', () => {
    act(() => {
      root.render(<AriaLiveRegion />);
    });

    const win = { title: 'Removed App', id: 'w1', state: 'normal' };
    const prev = new Map<string, unknown>([['w1', win]]);
    const next = new Map<string, unknown>();

    act(() => {
      mockSubscribers[0]?.(next, prev);
    });

    const el = container.querySelector('[role="status"]');
    expect(el?.textContent).toContain('Removed App');
    expect(el?.textContent).toContain('closed');
  });

  it('announces when a window changes state', () => {
    act(() => {
      root.render(<AriaLiveRegion />);
    });

    const win = { title: 'Changed App', id: 'w1', state: 'minimized' };
    const prev = new Map<string, unknown>([['w1', { title: 'Changed App', id: 'w1', state: 'normal' }]]);
    const next = new Map<string, unknown>([['w1', win]]);

    act(() => {
      mockSubscribers[0]?.(next, prev);
    });

    const el = container.querySelector('[role="status"]');
    expect(el?.textContent).toContain('Changed App');
    expect(el?.textContent).toContain('minimized');
  });

  it('clears announcement after 3 seconds', () => {
    vi.useFakeTimers();

    act(() => {
      root.render(<AriaLiveRegion />);
    });

    const win = { title: 'Timer App', id: 'w1', state: 'normal' };
    act(() => {
      mockSubscribers[0]?.(
        new Map([['w1', win]]),
        new Map(),
      );
    });

    const el = container.querySelector('[role="status"]');
    expect(el?.textContent).toContain('Timer App');

    // Advance past 3 seconds
    act(() => {
      vi.advanceTimersByTime(3001);
    });

    expect(el?.textContent).toBe('');

    vi.useRealTimers();
  });

  it('is visually hidden (uses clip CSS pattern)', () => {
    act(() => {
      root.render(<AriaLiveRegion />);
    });

    const el = container.querySelector('[role="status"]') as HTMLElement | null;
    expect(el).not.toBeNull();
    // Position is absolute (visually hidden)
    expect(el!.style.position).toBe('absolute');
    expect(el!.style.width).toBe('1px');
    expect(el!.style.height).toBe('1px');
  });

  it('unsubscribes from store on unmount', () => {
    act(() => {
      root.render(<AriaLiveRegion />);
    });

    const initialSubscriberCount = mockSubscribers.length;
    expect(initialSubscriberCount).toBe(1);

    act(() => root.unmount());
    root = createRoot(container); // recreate for afterEach cleanup

    expect(mockSubscribers.length).toBe(0);
  });
});
