import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockNotify = vi.fn(() => 'notif-id');
const mockDismiss = vi.fn();

vi.mock('@archbase/workspace-state', () => ({
  useNotificationsStore: { getState: () => ({ notify: mockNotify, dismiss: mockDismiss }) },
}));

import { createNotificationService } from '../services/notificationService';

describe('createNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('info calls notify with type info', () => {
    const service = createNotificationService();

    service.info('Info Title', 'Info message');

    expect(mockNotify).toHaveBeenCalledWith({
      type: 'info',
      title: 'Info Title',
      message: 'Info message',
    });
  });

  it('success calls notify with type success', () => {
    const service = createNotificationService();

    service.success('Success Title', 'It worked');

    expect(mockNotify).toHaveBeenCalledWith({
      type: 'success',
      title: 'Success Title',
      message: 'It worked',
    });
  });

  it('warning calls notify with type warning', () => {
    const service = createNotificationService();

    service.warning('Warning Title', 'Be careful');

    expect(mockNotify).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Warning Title',
      message: 'Be careful',
    });
  });

  it('error calls notify with type error', () => {
    const service = createNotificationService();

    service.error('Error Title', 'Something failed');

    expect(mockNotify).toHaveBeenCalledWith({
      type: 'error',
      title: 'Error Title',
      message: 'Something failed',
    });
  });

  it('dismiss calls store dismiss with the notification id', () => {
    const service = createNotificationService();

    service.dismiss('notif-123');

    expect(mockDismiss).toHaveBeenCalledWith('notif-123');
  });

  it('returns the notification id from notify', () => {
    const service = createNotificationService();

    const id = service.info('Test');

    expect(id).toBe('notif-id');
  });
});
