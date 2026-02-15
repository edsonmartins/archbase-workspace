// ============================================================
// Notification Types
// ============================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface WorkspaceNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  /** Duration in ms. 0 = persistent (no auto-dismiss). Default: 5000 */
  duration: number;
  createdAt: number;
  dismissible: boolean;
}
