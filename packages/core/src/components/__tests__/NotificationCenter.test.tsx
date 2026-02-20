import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// ── Hoisted mocks ─────────────────────────────────────────

const { mockClearHistory, mockHistoryHolder } = vi.hoisted(() => ({
  mockClearHistory: vi.fn(),
  mockHistoryHolder: {
    history: [] as Array<{
      id: string;
      type: 'info' | 'success' | 'warning' | 'error';
      title: string;
      message?: string;
      createdAt: number;
      dismissedAt?: number;
    }>,
  },
}));

vi.mock('@archbase/workspace-state', () => ({
  useNotificationHistory: () => mockHistoryHolder.history,
  useNotificationsStore: Object.assign(() => ({}), {
    getState: () => ({ clearHistory: mockClearHistory }),
  }),
}));

// ── Imports ────────────────────────────────────────────────

import { NotificationCenter } from '../NotificationCenter';

// ── Test scaffolding ──────────────────────────────────────

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.clearAllMocks();
  mockHistoryHolder.history = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderCenter(visible: boolean, onClose = vi.fn()) {
  act(() => {
    root.render(<NotificationCenter visible={visible} onClose={onClose} />);
  });
  return onClose;
}

// ── Tests ─────────────────────────────────────────────────

describe('NotificationCenter', () => {
  it('renders nothing when visible is false', () => {
    renderCenter(false);
    expect(container.querySelector('.notification-center')).toBeNull();
  });

  it('renders notification center when visible is true', () => {
    renderCenter(true);
    const el = container.querySelector('[aria-label="Notification Center"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('role')).toBe('complementary');
  });

  it('shows "No notifications" when history is empty', () => {
    mockHistoryHolder.history = [];
    renderCenter(true);
    expect(container.textContent).toContain('No notifications');
  });

  it('renders notification items from history', () => {
    mockHistoryHolder.history = [
      { id: 'n1', type: 'info', title: 'Info Title', message: 'Info body', createdAt: Date.now() },
      { id: 'n2', type: 'error', title: 'Error Title', createdAt: Date.now() },
    ];
    renderCenter(true);

    expect(container.textContent).toContain('Info Title');
    expect(container.textContent).toContain('Info body');
    expect(container.textContent).toContain('Error Title');
  });

  it('does not render "Clear All" button when history is empty', () => {
    mockHistoryHolder.history = [];
    renderCenter(true);
    expect(container.querySelector('[aria-label="Clear notification history"]')).toBeNull();
  });

  it('renders "Clear All" button when history has items', () => {
    mockHistoryHolder.history = [
      { id: 'n1', type: 'success', title: 'Done', createdAt: Date.now() },
    ];
    renderCenter(true);
    const btn = container.querySelector('[aria-label="Clear notification history"]');
    expect(btn).not.toBeNull();
  });

  it('calls clearHistory when "Clear All" is clicked', () => {
    mockHistoryHolder.history = [
      { id: 'n1', type: 'info', title: 'Notice', createdAt: Date.now() },
    ];
    renderCenter(true);
    const btn = container.querySelector('[aria-label="Clear notification history"]') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(mockClearHistory).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = renderCenter(true);
    const btn = container.querySelector('[aria-label="Close notification center"]') as HTMLButtonElement;
    act(() => {
      btn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the overlay (outside panel)', () => {
    const onClose = renderCenter(true);
    const overlay = container.querySelector('.notification-center-overlay') as HTMLElement;
    act(() => {
      overlay.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the panel', () => {
    const onClose = renderCenter(true);
    const panel = container.querySelector('.notification-center') as HTMLElement;
    act(() => {
      panel.click();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders correct icon for each notification type', () => {
    mockHistoryHolder.history = [
      { id: 'n-info', type: 'info', title: 'Info', createdAt: Date.now() },
    ];
    renderCenter(true);
    const icons = container.querySelectorAll('.notification-center-item-icon');
    expect(icons.length).toBeGreaterThan(0);
    expect(icons[0]?.textContent).toBe('i');
  });

  it('renders "Just now" for very recent notifications', () => {
    mockHistoryHolder.history = [
      { id: 'n1', type: 'info', title: 'Recent', createdAt: Date.now(), dismissedAt: Date.now() },
    ];
    renderCenter(true);
    expect(container.textContent).toContain('Just now');
  });
});
