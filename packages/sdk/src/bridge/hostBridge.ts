import type { WorkspaceSDK } from '@archbase/workspace-types';
import { BRIDGE_MARKER, isBridgeMessage } from './types';
import type { BridgeRequest, BridgeResponse, BridgeError } from './types';

/**
 * Allowed SDK method paths that the bridge will dispatch.
 * Note: Some sync methods (settings.get, storage.get, storage.keys, permissions.check,
 * permissions.list) are included for completeness even though the standard IframeBridgeSDK
 * stubs them locally. Custom iframe clients using raw postMessage can still call them.
 */
const ALLOWED_METHODS = new Set([
  // windows
  'windows.open',
  'windows.close',
  'windows.minimize',
  'windows.maximize',
  'windows.restore',
  'windows.setTitle',
  'windows.getAll',
  // commands (register cannot be bridged — callbacks don't serialize)
  'commands.execute',
  // notifications
  'notifications.info',
  'notifications.success',
  'notifications.warning',
  'notifications.error',
  'notifications.dismiss',
  // settings
  'settings.get',
  'settings.set',
  // storage
  'storage.get',
  'storage.set',
  'storage.remove',
  'storage.clear',
  'storage.keys',
  // contextMenu
  'contextMenu.show',
  // permissions
  'permissions.check',
  'permissions.request',
  'permissions.list',
]);

export interface HostBridgeOptions {
  /** The SDK instance to dispatch calls to */
  sdk: WorkspaceSDK;
  /** The iframe element to communicate with */
  iframe: HTMLIFrameElement;
  /** Expected origin of the iframe. Use '*' only in dev. */
  origin: string;
}

/**
 * Host-side bridge that listens for SDK requests from a sandboxed iframe
 * and dispatches them to a real WorkspaceSDK instance.
 *
 * Returns a cleanup function to stop listening.
 */
export function createHostBridge({ sdk, iframe, origin }: HostBridgeOptions): () => void {
  function handleMessage(event: MessageEvent) {
    // Origin validation
    if (origin !== '*' && event.origin !== origin) return;

    // Source validation — must come from the expected iframe
    if (event.source !== iframe.contentWindow) return;

    // Bridge message validation
    if (!isBridgeMessage(event.data)) return;
    const msg = event.data;
    if (msg.type !== 'sdk-request') return;

    const request = msg as BridgeRequest;

    // Validate request shape
    if (typeof request.id !== 'string' || typeof request.method !== 'string' || !Array.isArray(request.args)) {
      return;
    }

    void dispatchRequest(request, event.origin);
  }

  async function dispatchRequest(request: BridgeRequest, responseOrigin: string) {
    const { id, method, args } = request;

    // Whitelist check
    if (!ALLOWED_METHODS.has(method)) {
      sendError(id, `Method not allowed: ${method}`, responseOrigin);
      return;
    }

    try {
      const result = resolvePath(sdk, method, args);
      // Handle async results (e.g., commands.execute, permissions.request)
      const resolved = result instanceof Promise ? await result : result;
      sendResponse(id, resolved, responseOrigin);
    } catch (err) {
      sendError(id, err instanceof Error ? err.message : String(err), responseOrigin);
    }
  }

  function sendResponse(id: string, result: unknown, targetOrigin: string) {
    const response: BridgeResponse = {
      [BRIDGE_MARKER]: true,
      type: 'sdk-response',
      id,
      result,
    };
    iframe.contentWindow?.postMessage(response, targetOrigin);
  }

  function sendError(id: string, error: string, targetOrigin: string) {
    const response: BridgeError = {
      [BRIDGE_MARKER]: true,
      type: 'sdk-error',
      id,
      error,
    };
    iframe.contentWindow?.postMessage(response, targetOrigin);
  }

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Resolve a dot-notation method path on the SDK and call it.
 * e.g., 'windows.open' → sdk.windows.open(...args)
 */
function resolvePath(sdk: WorkspaceSDK, path: string, args: unknown[]): unknown {
  const parts = path.split('.');
  if (parts.length !== 2) {
    throw new Error(`Invalid method path: ${path}`);
  }

  const [namespace, method] = parts;
  const service = (sdk as unknown as Record<string, unknown>)[namespace];
  if (!service || typeof service !== 'object') {
    throw new Error(`Unknown service: ${namespace}`);
  }

  const fn = (service as Record<string, unknown>)[method];
  if (typeof fn !== 'function') {
    throw new Error(`Unknown method: ${path}`);
  }

  return fn.apply(service, args);
}
