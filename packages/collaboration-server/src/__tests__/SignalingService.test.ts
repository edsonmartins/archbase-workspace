import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalingService } from '../SignalingService';

describe('SignalingService', () => {
  let service: SignalingService;
  let mockRoom: { forwardToClient: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = new SignalingService();
    mockRoom = {
      forwardToClient: vi.fn(),
    };
  });

  it('forwards signaling message to target client', () => {
    const rawData = JSON.stringify({
      type: 'rtc-offer',
      senderId: 'user-1',
      targetId: 'user-2',
      payload: { sdp: 'offer-sdp', type: 'offer' },
    });

    service.handleSignaling(
      mockRoom as any,
      'user-1',
      { type: 'rtc-offer', targetId: 'user-2', payload: { sdp: 'offer-sdp', type: 'offer' } },
      rawData,
    );

    expect(mockRoom.forwardToClient).toHaveBeenCalledTimes(1);
    expect(mockRoom.forwardToClient).toHaveBeenCalledWith('user-2', rawData);
  });

  it('does nothing when targetId is missing', () => {
    const rawData = JSON.stringify({
      type: 'rtc-offer',
      senderId: 'user-1',
      payload: { sdp: 'offer-sdp' },
    });

    service.handleSignaling(
      mockRoom as any,
      'user-1',
      { type: 'rtc-offer', payload: { sdp: 'offer-sdp' } },
      rawData,
    );

    expect(mockRoom.forwardToClient).not.toHaveBeenCalled();
  });

  it('isSignalingMessage returns true for rtc-offer', () => {
    expect(service.isSignalingMessage('rtc-offer')).toBe(true);
  });

  it('isSignalingMessage returns true for rtc-answer', () => {
    expect(service.isSignalingMessage('rtc-answer')).toBe(true);
  });

  it('isSignalingMessage returns true for rtc-ice-candidate', () => {
    expect(service.isSignalingMessage('rtc-ice-candidate')).toBe(true);
  });

  it('isSignalingMessage returns false for other types', () => {
    expect(service.isSignalingMessage('sync-step1')).toBe(false);
    expect(service.isSignalingMessage('sync-update')).toBe(false);
    expect(service.isSignalingMessage('awareness-update')).toBe(false);
    expect(service.isSignalingMessage('room-joined')).toBe(false);
    expect(service.isSignalingMessage('room-left')).toBe(false);
    expect(service.isSignalingMessage('room-info')).toBe(false);
    expect(service.isSignalingMessage('error')).toBe(false);
    expect(service.isSignalingMessage('unknown-type')).toBe(false);
  });
});
