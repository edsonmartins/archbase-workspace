import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ToastContainer } from '../ToastContainer';

const mockDismiss = vi.fn();

vi.mock('@archbase/workspace-state', () => {
  const useNotificationsFn = vi.fn();

  return {
    useNotifications: useNotificationsFn,
    useNotificationsStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ dismiss: mockDismiss }),
  };
});

import { useNotifications } from '@archbase/workspace-state';

const mockUseNotifications = vi.mocked(useNotifications);

function createMockNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    type: 'info',
    title: 'Test',
    message: 'msg',
    duration: 0,
    dismissible: true,
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockDismiss.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderToastContainer() {
  act(() => {
    root.render(<ToastContainer />);
  });
}

describe('ToastContainer', () => {
  it('renders aria-live="polite" container', () => {
    mockUseNotifications.mockReturnValue([]);
    renderToastContainer();
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it('renders toast with role="alert"', () => {
    mockUseNotifications.mockReturnValue([createMockNotification()] as never);
    renderToastContainer();
    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
  });

  it('renders dismiss button with aria-label', () => {
    mockUseNotifications.mockReturnValue([createMockNotification()] as never);
    renderToastContainer();
    const btn = container.querySelector('[aria-label="Dismiss notification"]');
    expect(btn).not.toBeNull();
  });

  it('renders toast icon based on type', () => {
    mockUseNotifications.mockReturnValue([
      createMockNotification({ id: 'n-info', type: 'info' }),
    ] as never);
    renderToastContainer();
    const icon = container.querySelector('.toast-icon');
    expect(icon).not.toBeNull();
    expect(icon!.textContent).toBe('i');
  });

  it('renders toast title and message', () => {
    mockUseNotifications.mockReturnValue([
      createMockNotification({ title: 'Alert Title', message: 'Alert body' }),
    ] as never);
    renderToastContainer();
    const title = container.querySelector('.toast-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Alert Title');
    const message = container.querySelector('.toast-message');
    expect(message).not.toBeNull();
    expect(message!.textContent).toBe('Alert body');
  });

  it('renders empty when no notifications', () => {
    mockUseNotifications.mockReturnValue([]);
    renderToastContainer();
    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(0);
    // Container still exists
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });
});
