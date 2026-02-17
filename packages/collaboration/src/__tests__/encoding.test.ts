import { describe, it, expect } from 'vitest';
import { encodeMessage, decodeMessage } from '../utils/encoding';
import type { CollaborationMessage } from '@archbase/workspace-types';

describe('encoding', () => {
  it('encodes and decodes a binary sync message', () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const msg: CollaborationMessage = {
      type: 'sync-update',
      roomId: 'room-1',
      payload,
    };

    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);

    expect(decoded.type).toBe('sync-update');
    expect(decoded.roomId).toBe('room-1');
    expect(decoded.payload).toBeInstanceOf(Uint8Array);
    expect(Array.from(decoded.payload as Uint8Array)).toEqual([1, 2, 3, 4, 5]);
  });

  it('encodes and decodes a JSON payload message', () => {
    const msg: CollaborationMessage = {
      type: 'room-joined',
      roomId: 'test-room',
      senderId: 'user-1',
      targetId: 'user-2',
      payload: { userId: 'user-1', displayName: 'Alice' },
    };

    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);

    expect(decoded.type).toBe('room-joined');
    expect(decoded.roomId).toBe('test-room');
    expect(decoded.senderId).toBe('user-1');
    expect(decoded.targetId).toBe('user-2');
    expect((decoded.payload as Record<string, unknown>).userId).toBe('user-1');
    expect((decoded.payload as Record<string, unknown>).displayName).toBe('Alice');
  });

  it('handles all message types without error', () => {
    const types = [
      'sync-step1', 'sync-step2', 'sync-update', 'awareness-update',
      'rtc-offer', 'rtc-answer', 'rtc-ice-candidate',
      'room-joined', 'room-left', 'room-info', 'error',
    ] as const;

    for (const type of types) {
      // Only sync-* types use binary (Uint8Array) payloads
      const isBinary = type.startsWith('sync-');
      const msg: CollaborationMessage = {
        type,
        roomId: 'r',
        payload: isBinary ? new Uint8Array([42]) : { data: 'test' },
      };

      const encoded = encodeMessage(msg);
      const decoded = decodeMessage(encoded);
      expect(decoded.type).toBe(type);
    }
  });

  it('throws on unknown message type', () => {
    expect(() =>
      encodeMessage({
        type: 'unknown' as any,
        roomId: 'r',
        payload: {},
      }),
    ).toThrow('Unknown message type');
  });

  it('throws on too-short buffer', () => {
    expect(() => decodeMessage(new Uint8Array([1]).buffer)).toThrow('Message too short');
  });

  it('roundtrips empty binary payload', () => {
    const msg: CollaborationMessage = {
      type: 'sync-step1',
      roomId: 'room',
      payload: new Uint8Array(0),
    };

    const decoded = decodeMessage(encodeMessage(msg));
    expect(decoded.type).toBe('sync-step1');
    expect((decoded.payload as Uint8Array).length).toBe(0);
  });

  it('roundtrips unicode room ID', () => {
    const msg: CollaborationMessage = {
      type: 'room-info',
      roomId: 'sala-reunião-日本語',
      payload: { ok: true },
    };

    const decoded = decodeMessage(encodeMessage(msg));
    expect(decoded.roomId).toBe('sala-reunião-日本語');
  });
});
