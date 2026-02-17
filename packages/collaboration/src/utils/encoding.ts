import type { CollaborationMessage, CollaborationMessageType } from '@archbase/workspace-types';

/**
 * Simple TLV-style encoding for collaboration messages.
 *
 * Format:
 *   [type (1 byte)] [roomId length (2 bytes)] [roomId (UTF-8)] [payload]
 *
 * - Type byte maps to CollaborationMessageType via MESSAGE_TYPE_MAP
 * - Payload is either raw bytes (for Yjs sync/awareness) or JSON-encoded object
 */

const MESSAGE_TYPES: CollaborationMessageType[] = [
  'sync-step1',
  'sync-step2',
  'sync-update',
  'awareness-update',
  'rtc-offer',
  'rtc-answer',
  'rtc-ice-candidate',
  'room-joined',
  'room-left',
  'room-info',
  'error',
];

const TYPE_TO_BYTE = new Map<CollaborationMessageType, number>();
const BYTE_TO_TYPE = new Map<number, CollaborationMessageType>();

for (let i = 0; i < MESSAGE_TYPES.length; i++) {
  TYPE_TO_BYTE.set(MESSAGE_TYPES[i], i);
  BYTE_TO_TYPE.set(i, MESSAGE_TYPES[i]);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Encode a CollaborationMessage into an ArrayBuffer.
 */
export function encodeMessage(msg: CollaborationMessage): ArrayBuffer {
  const typeByte = TYPE_TO_BYTE.get(msg.type);
  if (typeByte === undefined) {
    throw new Error(`Unknown message type: ${msg.type}`);
  }

  const roomIdBytes = encoder.encode(msg.roomId);
  if (roomIdBytes.length > 65535) {
    throw new Error('Room ID too long');
  }

  let payloadBytes: Uint8Array;
  if (msg.payload instanceof Uint8Array) {
    payloadBytes = msg.payload;
  } else {
    // Encode senderId and targetId into the JSON payload for non-binary messages
    const jsonPayload = {
      ...msg.payload,
      ...(msg.senderId ? { _senderId: msg.senderId } : {}),
      ...(msg.targetId ? { _targetId: msg.targetId } : {}),
    };
    payloadBytes = encoder.encode(JSON.stringify(jsonPayload));
  }

  // 1 (type) + 2 (roomId length) + roomIdBytes.length + payloadBytes.length
  const buffer = new ArrayBuffer(1 + 2 + roomIdBytes.length + payloadBytes.length);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;
  view.setUint8(offset, typeByte);
  offset += 1;

  view.setUint16(offset, roomIdBytes.length, false); // big-endian
  offset += 2;

  bytes.set(roomIdBytes, offset);
  offset += roomIdBytes.length;

  bytes.set(payloadBytes, offset);

  return buffer;
}

/**
 * Decode an ArrayBuffer into a CollaborationMessage.
 */
export function decodeMessage(data: ArrayBuffer | Uint8Array): CollaborationMessage {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length < 3) {
    throw new Error('Message too short');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let offset = 0;
  const typeByte = view.getUint8(offset);
  offset += 1;

  const type = BYTE_TO_TYPE.get(typeByte);
  if (!type) {
    throw new Error(`Unknown message type byte: ${typeByte}`);
  }

  const roomIdLength = view.getUint16(offset, false);
  offset += 2;

  if (offset + roomIdLength > bytes.length) {
    throw new Error('Invalid roomId length');
  }

  const roomId = decoder.decode(bytes.slice(offset, offset + roomIdLength));
  offset += roomIdLength;

  const payloadBytes = bytes.slice(offset);

  // Binary types (Yjs sync) keep raw Uint8Array payload
  // awareness-update uses JSON (cursor/presence data), not raw Yjs bytes
  const isBinaryType =
    type === 'sync-step1' ||
    type === 'sync-step2' ||
    type === 'sync-update';

  let payload: Uint8Array | Record<string, unknown>;
  let senderId: string | undefined;
  let targetId: string | undefined;

  if (isBinaryType) {
    payload = payloadBytes;
  } else {
    try {
      const parsed = JSON.parse(decoder.decode(payloadBytes)) as Record<string, unknown>;
      senderId = parsed._senderId as string | undefined;
      targetId = parsed._targetId as string | undefined;
      delete parsed._senderId;
      delete parsed._targetId;
      payload = parsed;
    } catch {
      payload = {};
    }
  }

  return { type, roomId, senderId, targetId, payload };
}
