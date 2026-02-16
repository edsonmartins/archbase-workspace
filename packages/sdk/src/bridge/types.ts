/**
 * PostMessage bridge protocol for sandboxed iframe apps.
 *
 * All messages carry the `__archbase_bridge__` marker to distinguish
 * them from other postMessage traffic.
 */

/** Unique marker to identify bridge messages */
export const BRIDGE_MARKER = '__archbase_bridge__' as const;

// ── Request (iframe → host) ──────────────────────────────────

export interface BridgeRequest {
  [BRIDGE_MARKER]: true;
  type: 'sdk-request';
  /** Unique ID for request/response correlation */
  id: string;
  /** Dot-notation SDK method path, e.g. 'windows.open', 'notifications.info' */
  method: string;
  /** Arguments to pass to the SDK method */
  args: unknown[];
}

// ── Response (host → iframe) ─────────────────────────────────

export interface BridgeResponse {
  [BRIDGE_MARKER]: true;
  type: 'sdk-response';
  id: string;
  result: unknown;
}

export interface BridgeError {
  [BRIDGE_MARKER]: true;
  type: 'sdk-error';
  id: string;
  error: string;
}

// ── Event (host → iframe, for subscriptions) ─────────────────
// Reserved for future use: event push from host to iframe (e.g., settings.onChange).
// Not currently produced or consumed; the type is defined for protocol completeness.

export interface BridgeEvent {
  [BRIDGE_MARKER]: true;
  type: 'sdk-event';
  event: string;
  payload: unknown;
}

// ── Union Types ──────────────────────────────────────────────

export type BridgeMessageFromIframe = BridgeRequest;
export type BridgeMessageFromHost = BridgeResponse | BridgeError | BridgeEvent;
export type BridgeMessage = BridgeMessageFromIframe | BridgeMessageFromHost;

// ── Type Guard ───────────────────────────────────────────────

const VALID_BRIDGE_TYPES: ReadonlySet<string> = new Set([
  'sdk-request', 'sdk-response', 'sdk-error', 'sdk-event',
]);

export function isBridgeMessage(data: unknown): data is BridgeMessage {
  if (typeof data !== 'object' || data === null) return false;
  // Use Object.hasOwn to avoid prototype chain traversal
  if (!Object.hasOwn(data, BRIDGE_MARKER)) return false;
  const record = data as Record<string, unknown>;
  return (
    record[BRIDGE_MARKER] === true &&
    typeof record.type === 'string' &&
    VALID_BRIDGE_TYPES.has(record.type)
  );
}
