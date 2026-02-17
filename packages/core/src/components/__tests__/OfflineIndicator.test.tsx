import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { OfflineIndicator } from '../OfflineIndicator';

let mockOnline = true;

vi.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnline,
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  mockOnline = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderSync(element: React.ReactNode) {
  act(() => root.render(element));
}

describe('OfflineIndicator', () => {
  it('returns null when online', () => {
    mockOnline = true;
    renderSync(<OfflineIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('renders status badge when offline', () => {
    mockOnline = false;
    renderSync(<OfflineIndicator />);
    const indicator = container.querySelector('.offline-indicator');
    expect(indicator).not.toBeNull();
    expect(container.textContent).toContain('Offline');
  });

  it('has role="status" and aria-label', () => {
    mockOnline = false;
    renderSync(<OfflineIndicator />);
    const indicator = container.querySelector('[role="status"]');
    expect(indicator).not.toBeNull();
    expect(indicator!.getAttribute('aria-label')).toBe('You are offline');
  });
});
