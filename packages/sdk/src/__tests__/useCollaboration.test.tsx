import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// ============================================================
// Mocks for @archbase/workspace-state collaboration hooks
// vi.hoisted ensures variables are available when vi.mock is hoisted
// ============================================================

const mocks = vi.hoisted(() => ({
  useIsCollaborating: vi.fn(() => false),
  useCollaborationRoomId: vi.fn(() => null as string | null),
  useCollaborationUser: vi.fn(() => null as { id: string; name: string; color: string } | null),
  useCollaborationUsers: vi.fn(() => [] as { id: string; name: string; color: string }[]),
  useRemoteCursors: vi.fn(() => [] as { userId: string; x: number; y: number }[]),
  useSharedWindows: vi.fn(() => [] as string[]),
  useFollowingUser: vi.fn(() => null as string | null),
}));

vi.mock('@archbase/workspace-state', () => mocks);

import { useCollaboration } from '../hooks/useCollaboration';

// ============================================================
// DOM helpers
// ============================================================

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  mocks.useIsCollaborating.mockReturnValue(false);
  mocks.useCollaborationRoomId.mockReturnValue(null);
  mocks.useCollaborationUser.mockReturnValue(null);
  mocks.useCollaborationUsers.mockReturnValue([]);
  mocks.useRemoteCursors.mockReturnValue([]);
  mocks.useSharedWindows.mockReturnValue([]);
  mocks.useFollowingUser.mockReturnValue(null);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

// ============================================================
// useCollaboration
// ============================================================

describe('useCollaboration', () => {
  it('returns all collaboration state fields with defaults', () => {
    let result: ReturnType<typeof useCollaboration> | undefined;

    function Consumer() {
      result = useCollaboration();
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    expect(result).toBeDefined();
    expect(result!.isConnected).toBe(false);
    expect(result!.roomId).toBeNull();
    expect(result!.currentUser).toBeNull();
    expect(result!.users).toEqual([]);
    expect(result!.cursors).toEqual([]);
    expect(result!.sharedWindows).toEqual([]);
    expect(result!.followingUserId).toBeNull();
  });

  it('returns connected state when collaborating', () => {
    mocks.useIsCollaborating.mockReturnValue(true);
    mocks.useCollaborationRoomId.mockReturnValue('room-abc');
    mocks.useCollaborationUser.mockReturnValue({
      id: 'user-1',
      name: 'Alice',
      color: '#ff0000',
    });

    let result: ReturnType<typeof useCollaboration> | undefined;

    function Consumer() {
      result = useCollaboration();
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    expect(result!.isConnected).toBe(true);
    expect(result!.roomId).toBe('room-abc');
    expect(result!.currentUser).toEqual({
      id: 'user-1',
      name: 'Alice',
      color: '#ff0000',
    });
  });

  it('returns users list', () => {
    const usersList = [
      { id: 'user-1', name: 'Alice', color: '#ff0000' },
      { id: 'user-2', name: 'Bob', color: '#00ff00' },
      { id: 'user-3', name: 'Charlie', color: '#0000ff' },
    ];
    mocks.useCollaborationUsers.mockReturnValue(usersList);

    let result: ReturnType<typeof useCollaboration> | undefined;

    function Consumer() {
      result = useCollaboration();
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    expect(result!.users).toEqual(usersList);
    expect(result!.users).toHaveLength(3);
  });

  it('returns cursor data and shared windows', () => {
    const cursors = [
      { userId: 'user-2', x: 100, y: 200 },
      { userId: 'user-3', x: 300, y: 400 },
    ];
    const sharedWindows = ['win-1', 'win-2'];

    mocks.useRemoteCursors.mockReturnValue(cursors);
    mocks.useSharedWindows.mockReturnValue(sharedWindows);
    mocks.useFollowingUser.mockReturnValue('user-2');

    let result: ReturnType<typeof useCollaboration> | undefined;

    function Consumer() {
      result = useCollaboration();
      return null;
    }

    act(() => {
      root.render(<Consumer />);
    });

    expect(result!.cursors).toEqual(cursors);
    expect(result!.cursors).toHaveLength(2);
    expect(result!.sharedWindows).toEqual(sharedWindows);
    expect(result!.sharedWindows).toHaveLength(2);
    expect(result!.followingUserId).toBe('user-2');
  });
});
