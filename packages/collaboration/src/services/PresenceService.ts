import type { CollaborationUser, PresenceStatus, UserPresence } from '@archbase/workspace-types';

const IDLE_TIMEOUT_MS = 60_000;    // 60s → idle
const AWAY_TIMEOUT_MS = 300_000;   // 5min → away

export interface PresenceServiceOptions {
  user: CollaborationUser;
  onStatusChange: (status: PresenceStatus) => void;
}

/**
 * Service for managing local user presence (active/idle/away)
 * and tracking remote user presence.
 *
 * Idle detection:
 * - Listens for mouse/keyboard activity
 * - After 60s of inactivity → 'idle'
 * - After 5min of inactivity → 'away'
 * - Any input resets to 'active'
 */
export class PresenceService {
  private user: CollaborationUser;
  private onStatusChange: (status: PresenceStatus) => void;
  private currentStatus: PresenceStatus = 'active';
  private lastActivity = Date.now();
  private idleTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private remoteUsers = new Map<string, UserPresence>();
  private userJoinedListeners = new Set<(user: CollaborationUser) => void>();
  private userLeftListeners = new Set<(userId: string) => void>();

  constructor(options: PresenceServiceOptions) {
    this.user = options.user;
    this.onStatusChange = options.onStatusChange;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastActivity = Date.now();
    this.currentStatus = 'active';

    if (typeof document !== 'undefined') {
      document.addEventListener('pointermove', this.handleActivity);
      document.addEventListener('keydown', this.handleActivity);
      document.addEventListener('pointerdown', this.handleActivity);
    }

    // Check for idle/away every 10 seconds
    this.idleTimer = setInterval(() => this.checkIdle(), 10_000);
  }

  stop(): void {
    this.running = false;
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointermove', this.handleActivity);
      document.removeEventListener('keydown', this.handleActivity);
      document.removeEventListener('pointerdown', this.handleActivity);
    }
    this.remoteUsers.clear();
  }

  getStatus(): PresenceStatus {
    return this.currentStatus;
  }

  setStatus(status: PresenceStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    this.onStatusChange(status);
  }

  // Remote user management

  handleUserJoined(user: CollaborationUser, joinedAt: number): void {
    this.remoteUsers.set(user.id, {
      user,
      status: 'active',
      joinedAt,
    });
    for (const handler of this.userJoinedListeners) {
      handler(user);
    }
  }

  handleUserLeft(userId: string): void {
    this.remoteUsers.delete(userId);
    for (const handler of this.userLeftListeners) {
      handler(userId);
    }
  }

  handleRemotePresenceUpdate(
    userId: string,
    status: PresenceStatus,
    focusedWindowId?: string,
  ): void {
    const existing = this.remoteUsers.get(userId);
    if (existing) {
      this.remoteUsers.set(userId, {
        ...existing,
        status,
        focusedWindowId,
      });
    }
  }

  getUsers(): UserPresence[] {
    return Array.from(this.remoteUsers.values());
  }

  getUser(userId: string): UserPresence | undefined {
    return this.remoteUsers.get(userId);
  }

  onUserJoined(handler: (user: CollaborationUser) => void): () => void {
    this.userJoinedListeners.add(handler);
    return () => {
      this.userJoinedListeners.delete(handler);
    };
  }

  onUserLeft(handler: (userId: string) => void): () => void {
    this.userLeftListeners.add(handler);
    return () => {
      this.userLeftListeners.delete(handler);
    };
  }

  // Private

  private handleActivity = (): void => {
    this.lastActivity = Date.now();
    if (this.currentStatus !== 'active') {
      this.setStatus('active');
    }
  };

  private checkIdle(): void {
    const elapsed = Date.now() - this.lastActivity;

    if (elapsed >= AWAY_TIMEOUT_MS && this.currentStatus !== 'away') {
      this.setStatus('away');
    } else if (elapsed >= IDLE_TIMEOUT_MS && this.currentStatus === 'active') {
      this.setStatus('idle');
    }
  }
}
