import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { StatusBarWidgets } from '../StatusBarWidgets';

let mockWidgets: Array<{ id: string; title: string; order: number }> = [];

vi.mock('@archbase/workspace-state', () => ({
  useStatusBarWidgets: () => mockWidgets,
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  mockWidgets = [];
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

describe('StatusBarWidgets', () => {
  it('returns null when no widgets', () => {
    mockWidgets = [];
    renderSync(<StatusBarWidgets />);
    expect(container.innerHTML).toBe('');
  });

  it('renders widgets with titles', () => {
    mockWidgets = [{ id: 'w1', title: 'Clock', order: 0 }];
    renderSync(<StatusBarWidgets />);
    const widget = container.querySelector('.status-bar-widget');
    expect(widget).not.toBeNull();
    expect(widget!.getAttribute('title')).toBe('Clock');
    expect(widget!.textContent).toContain('Clock');
  });

  it('renders multiple widgets', () => {
    mockWidgets = [
      { id: 'w1', title: 'Clock', order: 0 },
      { id: 'w2', title: 'Battery', order: 1 },
    ];
    renderSync(<StatusBarWidgets />);
    const widgets = container.querySelectorAll('.status-bar-widget');
    expect(widgets.length).toBe(2);
    expect(widgets[0].textContent).toContain('Clock');
    expect(widgets[1].textContent).toContain('Battery');
  });
});
