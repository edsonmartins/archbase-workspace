import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PresencePanel } from '../PresencePanel';

interface UserPresenceMock {
  user: { id: string; displayName: string; color: string };
  status: string;
}

let mockUsers: UserPresenceMock[] = [];
let mockCurrentUser: { id: string; displayName: string; color: string } | null = null;
let mockFollowingUser: string | null = null;
const mockSetFollowing = vi.fn();

vi.mock('@archbase/workspace-state', () => ({
  useCollaborationUsers: () => mockUsers,
  useCollaborationUser: () => mockCurrentUser,
  useFollowingUser: () => mockFollowingUser,
  useCollaborationStore: (selector: (s: { setFollowing: typeof mockSetFollowing }) => unknown) =>
    selector({ setFollowing: mockSetFollowing }),
}));

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  mockUsers = [];
  mockCurrentUser = null;
  mockFollowingUser = null;
  mockSetFollowing.mockClear();
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

describe('PresencePanel', () => {
  it('returns null when not visible', () => {
    renderSync(<PresencePanel visible={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders complementary role with aria-label', () => {
    renderSync(<PresencePanel visible={true} onClose={vi.fn()} />);
    const panel = container.querySelector('[role="complementary"]');
    expect(panel).not.toBeNull();
    expect(panel!.getAttribute('aria-label')).toBe('Online users');
  });

  it('renders online user count', () => {
    mockCurrentUser = { id: 'me', displayName: 'Me', color: '#00f' };
    mockUsers = [
      { user: { id: 'u1', displayName: 'Alice', color: '#f00' }, status: 'active' },
    ];
    renderSync(<PresencePanel visible={true} onClose={vi.fn()} />);
    expect(container.textContent).toContain('Online (2)');
  });

  it('renders current user with "(you)" suffix', () => {
    mockCurrentUser = { id: 'me', displayName: 'Me', color: '#00f' };
    renderSync(<PresencePanel visible={true} onClose={vi.fn()} />);
    expect(container.textContent).toContain('Me (you)');
  });

  it('renders follow/unfollow buttons', () => {
    mockUsers = [
      { user: { id: 'u1', displayName: 'Alice', color: '#f00' }, status: 'active' },
      { user: { id: 'u2', displayName: 'Bob', color: '#0f0' }, status: 'idle' },
    ];
    mockFollowingUser = 'u1';
    renderSync(<PresencePanel visible={true} onClose={vi.fn()} />);

    const buttons = container.querySelectorAll('button');
    // One close button + two follow/unfollow buttons
    const followButtons = Array.from(buttons).filter(
      (b) => b.textContent === 'Follow' || b.textContent === 'Unfollow',
    );
    expect(followButtons.length).toBe(2);

    // u1 is being followed, so its button should say "Unfollow"
    const unfollowBtn = container.querySelector('[aria-label="Unfollow Alice"]') as HTMLButtonElement;
    expect(unfollowBtn).not.toBeNull();
    expect(unfollowBtn.textContent).toBe('Unfollow');

    // u2 is not being followed, so its button should say "Follow"
    const followBtn = container.querySelector('[aria-label="Follow Bob"]') as HTMLButtonElement;
    expect(followBtn).not.toBeNull();
    expect(followBtn.textContent).toBe('Follow');
  });

  it('calls setFollowing on follow click', () => {
    mockUsers = [
      { user: { id: 'u1', displayName: 'Alice', color: '#f00' }, status: 'active' },
    ];
    mockFollowingUser = null;
    renderSync(<PresencePanel visible={true} onClose={vi.fn()} />);

    const followBtn = container.querySelector('[aria-label="Follow Alice"]') as HTMLButtonElement;
    expect(followBtn).not.toBeNull();

    act(() => followBtn.click());
    expect(mockSetFollowing).toHaveBeenCalledWith('u1');
  });
});
