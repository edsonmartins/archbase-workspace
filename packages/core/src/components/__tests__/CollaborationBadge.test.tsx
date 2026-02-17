import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CollaborationBadge } from '../CollaborationBadge';

let mockSharedWindows: Array<{
  windowId: string;
  sharedBy: string;
  mode: string;
  participants: string[];
}> = [];

vi.mock('@archbase/workspace-state', () => ({
  useSharedWindows: () => mockSharedWindows,
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  mockSharedWindows = [];
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

describe('CollaborationBadge', () => {
  it('returns null when window is not shared', () => {
    mockSharedWindows = [];
    renderSync(<CollaborationBadge windowId="w1" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders badge when window is shared', () => {
    mockSharedWindows = [
      { windowId: 'w1', sharedBy: 'user1', mode: 'edit', participants: ['user1', 'user2'] },
    ];
    renderSync(<CollaborationBadge windowId="w1" />);
    const badge = container.querySelector('.collab-badge');
    expect(badge).not.toBeNull();
  });

  it('shows participant count', () => {
    mockSharedWindows = [
      { windowId: 'w1', sharedBy: 'user1', mode: 'edit', participants: ['user1', 'user2'] },
    ];
    renderSync(<CollaborationBadge windowId="w1" />);
    const badge = container.querySelector('.collab-badge');
    expect(badge!.textContent).toContain('2');
  });

  it('shows correct title with singular/plural', () => {
    // Plural case: 2 users
    mockSharedWindows = [
      { windowId: 'w1', sharedBy: 'user1', mode: 'edit', participants: ['user1', 'user2'] },
    ];
    renderSync(<CollaborationBadge windowId="w1" />);
    let badge = container.querySelector('.collab-badge') as HTMLElement;
    expect(badge.getAttribute('title')).toBe('Shared (2 users)');

    // Singular case: 1 user
    mockSharedWindows = [
      { windowId: 'w1', sharedBy: 'user1', mode: 'edit', participants: ['user1'] },
    ];
    renderSync(<CollaborationBadge windowId="w1" />);
    badge = container.querySelector('.collab-badge') as HTMLElement;
    expect(badge.getAttribute('title')).toBe('Shared (1 user)');
  });
});
