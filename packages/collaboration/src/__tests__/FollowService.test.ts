import { describe, it, expect, vi } from 'vitest';
import { FollowService } from '../services/FollowService';

describe('FollowService', () => {
  it('starts with no user being followed', () => {
    const service = new FollowService({
      onFollowChange: vi.fn(),
      onFocusWindow: vi.fn(),
    });

    expect(service.isFollowing()).toBe(false);
    expect(service.getState().followingUserId).toBeNull();
  });

  it('follows and unfollows a user', () => {
    const onFollowChange = vi.fn();
    const service = new FollowService({
      onFollowChange,
      onFocusWindow: vi.fn(),
    });

    service.follow('user-2');
    expect(service.isFollowing()).toBe(true);
    expect(service.getState().followingUserId).toBe('user-2');
    expect(onFollowChange).toHaveBeenCalledWith({ followingUserId: 'user-2' });

    service.unfollow();
    expect(service.isFollowing()).toBe(false);
    expect(onFollowChange).toHaveBeenCalledWith({ followingUserId: null });
  });

  it('focuses window when followed user changes focus', () => {
    const onFocusWindow = vi.fn();
    const service = new FollowService({
      onFollowChange: vi.fn(),
      onFocusWindow,
    });

    service.follow('user-2');
    service.handleRemoteFocusChange('user-2', 'win-1');

    expect(onFocusWindow).toHaveBeenCalledWith('win-1');
  });

  it('ignores focus changes from non-followed users', () => {
    const onFocusWindow = vi.fn();
    const service = new FollowService({
      onFollowChange: vi.fn(),
      onFocusWindow,
    });

    service.follow('user-2');
    service.handleRemoteFocusChange('user-3', 'win-1');

    expect(onFocusWindow).not.toHaveBeenCalled();
  });

  it('ignores focus changes when not following anyone', () => {
    const onFocusWindow = vi.fn();
    const service = new FollowService({
      onFollowChange: vi.fn(),
      onFocusWindow,
    });

    service.handleRemoteFocusChange('user-2', 'win-1');
    expect(onFocusWindow).not.toHaveBeenCalled();
  });

  it('ignores undefined focusedWindowId', () => {
    const onFocusWindow = vi.fn();
    const service = new FollowService({
      onFollowChange: vi.fn(),
      onFocusWindow,
    });

    service.follow('user-2');
    service.handleRemoteFocusChange('user-2', undefined);

    expect(onFocusWindow).not.toHaveBeenCalled();
  });
});
