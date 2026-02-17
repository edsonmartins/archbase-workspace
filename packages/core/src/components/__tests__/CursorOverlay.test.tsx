import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CursorOverlay } from '../CursorOverlay';

interface RemoteCursorMock {
  user: { id: string; displayName: string; color: string };
  cursor: { x: number; y: number; visible: boolean };
}

let mockCursors: RemoteCursorMock[] = [];

vi.mock('@archbase/workspace-state', () => ({
  useRemoteCursors: () => mockCursors,
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  mockCursors = [];
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

describe('CursorOverlay', () => {
  it('returns null when no cursors', () => {
    mockCursors = [];
    renderSync(<CursorOverlay />);
    expect(container.innerHTML).toBe('');
  });

  it('renders cursor elements for visible cursors', () => {
    mockCursors = [
      { user: { id: 'u1', displayName: 'Alice', color: '#ff0000' }, cursor: { x: 100, y: 200, visible: true } },
      { user: { id: 'u2', displayName: 'Bob', color: '#00ff00' }, cursor: { x: 300, y: 400, visible: true } },
    ];
    renderSync(<CursorOverlay />);
    const cursorElements = container.querySelectorAll('.remote-cursor');
    expect(cursorElements.length).toBe(2);
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Bob');
  });

  it('hides non-visible cursors', () => {
    mockCursors = [
      { user: { id: 'u1', displayName: 'Alice', color: '#ff0000' }, cursor: { x: 100, y: 200, visible: true } },
      { user: { id: 'u2', displayName: 'Bob', color: '#00ff00' }, cursor: { x: 300, y: 400, visible: false } },
    ];
    renderSync(<CursorOverlay />);
    const cursorElements = container.querySelectorAll('.remote-cursor');
    expect(cursorElements.length).toBe(1);
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).not.toContain('Bob');
  });

  it('has aria-hidden="true"', () => {
    mockCursors = [
      { user: { id: 'u1', displayName: 'Alice', color: '#ff0000' }, cursor: { x: 100, y: 200, visible: true } },
    ];
    renderSync(<CursorOverlay />);
    const overlay = container.querySelector('.cursor-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.getAttribute('aria-hidden')).toBe('true');
  });
});
