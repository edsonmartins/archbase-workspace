import type { FollowState } from '@archbase/workspace-types';

export interface FollowServiceCallbacks {
  onFollowChange: (state: FollowState) => void;
  onFocusWindow: (windowId: string) => void;
}

/**
 * Service for follow mode — follow another user's cursor/focus.
 *
 * When following a user, their focused window changes trigger
 * local focus changes to keep in sync.
 */
export class FollowService {
  private followingUserId: string | null = null;
  private callbacks: FollowServiceCallbacks;

  constructor(callbacks: FollowServiceCallbacks) {
    this.callbacks = callbacks;
  }

  follow(userId: string): void {
    this.followingUserId = userId;
    this.callbacks.onFollowChange({ followingUserId: userId });
  }

  unfollow(): void {
    this.followingUserId = null;
    this.callbacks.onFollowChange({ followingUserId: null });
  }

  getState(): FollowState {
    return { followingUserId: this.followingUserId };
  }

  isFollowing(): boolean {
    return this.followingUserId !== null;
  }

  /**
   * Called when a remote user changes their focused window.
   * If we are following that user, focus the same window locally.
   */
  handleRemoteFocusChange(userId: string, focusedWindowId: string | undefined): void {
    if (this.followingUserId !== userId || !focusedWindowId) return;
    this.callbacks.onFocusWindow(focusedWindowId);
  }
}
