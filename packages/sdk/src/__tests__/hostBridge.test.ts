import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHostBridge } from '../bridge/hostBridge';
import { BRIDGE_MARKER } from '../bridge/types';
import type { WorkspaceSDK } from '@archbase/workspace-types';

function createMockSDK(): WorkspaceSDK {
  return {
    appId: 'test-app',
    windowId: 'win-1',
    windows: {
      open: vi.fn(() => 'new-win-id'),
      close: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
      restore: vi.fn(),
      setTitle: vi.fn(),
      getAll: vi.fn(() => []),
    },
    commands: {
      register: vi.fn(() => () => {}),
      execute: vi.fn(async () => {}),
    },
    notifications: {
      info: vi.fn(() => 'notif-1'),
      success: vi.fn(() => 'notif-2'),
      warning: vi.fn(() => 'notif-3'),
      error: vi.fn(() => 'notif-4'),
      dismiss: vi.fn(),
    },
    settings: {
      get: vi.fn(),
      set: vi.fn(),
      onChange: vi.fn(() => () => {}),
    },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      keys: vi.fn(() => []),
    },
    contextMenu: {
      show: vi.fn(),
    },
    permissions: {
      check: vi.fn(() => 'granted' as const),
      request: vi.fn(async () => true),
      list: vi.fn(() => []),
    },
  };
}

function createMockIframe(): HTMLIFrameElement {
  const contentWindow = {
    postMessage: vi.fn(),
  };
  return {
    contentWindow,
  } as unknown as HTMLIFrameElement;
}

function makeBridgeRequest(method: string, args: unknown[] = [], id = 'req-1') {
  return {
    [BRIDGE_MARKER]: true,
    type: 'sdk-request',
    id,
    method,
    args,
  };
}

describe('createHostBridge', () => {
  let sdk: WorkspaceSDK;
  let iframe: HTMLIFrameElement;
  let cleanup: () => void;

  beforeEach(() => {
    sdk = createMockSDK();
    iframe = createMockIframe();
  });

  afterEach(() => {
    cleanup?.();
  });

  function dispatchMessage(data: unknown, origin = 'http://localhost:9999') {
    const event = new MessageEvent('message', {
      data,
      origin,
      source: iframe.contentWindow as Window,
    });
    window.dispatchEvent(event);
  }

  it('dispatches valid SDK method calls', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('windows.open', [{ title: 'Test' }]));

    await new Promise((r) => setTimeout(r, 10));
    expect(sdk.windows.open).toHaveBeenCalledWith({ title: 'Test' });
  });

  it('sends response back to iframe', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('windows.open', [{ title: 'X' }], 'req-42'));

    await new Promise((r) => setTimeout(r, 10));
    expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        [BRIDGE_MARKER]: true,
        type: 'sdk-response',
        id: 'req-42',
        result: 'new-win-id',
      }),
      expect.any(String),
    );
  });

  it('sends error for disallowed methods', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('evil.method', [], 'req-bad'));

    await new Promise((r) => setTimeout(r, 10));
    expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        [BRIDGE_MARKER]: true,
        type: 'sdk-error',
        id: 'req-bad',
        error: expect.stringContaining('not allowed'),
      }),
      expect.any(String),
    );
  });

  it('rejects commands.register (not in whitelist)', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('commands.register', ['cmd', null], 'req-reg'));

    await new Promise((r) => setTimeout(r, 10));
    expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sdk-error',
        error: expect.stringContaining('not allowed'),
      }),
      expect.any(String),
    );
  });

  it('ignores non-bridge messages', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage({ random: 'data' });

    await new Promise((r) => setTimeout(r, 10));
    expect(iframe.contentWindow!.postMessage).not.toHaveBeenCalled();
  });

  it('validates origin when specified', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: 'http://trusted.example.com' });
    dispatchMessage(makeBridgeRequest('windows.open', [{ title: 'X' }]), 'http://evil.com');

    await new Promise((r) => setTimeout(r, 10));
    expect(sdk.windows.open).not.toHaveBeenCalled();
  });

  it('validates message source is the expected iframe', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });

    const event = new MessageEvent('message', {
      data: makeBridgeRequest('windows.open', [{ title: 'X' }]),
      origin: 'http://localhost:9999',
      source: window, // not iframe.contentWindow
    });
    window.dispatchEvent(event);

    await new Promise((r) => setTimeout(r, 10));
    expect(sdk.windows.open).not.toHaveBeenCalled();
  });

  it('validates request shape (rejects malformed requests)', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    // Missing args array
    dispatchMessage({
      [BRIDGE_MARKER]: true,
      type: 'sdk-request',
      id: 'req-malformed',
      method: 'windows.open',
      args: 'not-an-array',
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(sdk.windows.open).not.toHaveBeenCalled();
    expect(iframe.contentWindow!.postMessage).not.toHaveBeenCalled();
  });

  it('dispatches notifications.info correctly', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('notifications.info', ['Hello', 'World']));

    await new Promise((r) => setTimeout(r, 10));
    expect(sdk.notifications.info).toHaveBeenCalledWith('Hello', 'World');
  });

  it('dispatches storage.set correctly', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('storage.set', ['key', 'value']));

    await new Promise((r) => setTimeout(r, 10));
    expect(sdk.storage.set).toHaveBeenCalledWith('key', 'value');
  });

  it('handles async SDK methods (commands.execute)', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('commands.execute', ['some.command'], 'req-async'));

    await new Promise((r) => setTimeout(r, 50));
    expect(sdk.commands.execute).toHaveBeenCalledWith('some.command');
    expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sdk-response',
        id: 'req-async',
      }),
      expect.any(String),
    );
  });

  it('cleanup stops listening', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    cleanup();

    dispatchMessage(makeBridgeRequest('windows.open', [{ title: 'X' }]));
    await new Promise((r) => setTimeout(r, 10));
    expect(sdk.windows.open).not.toHaveBeenCalled();
  });

  it('sends error response when SDK method throws (M7)', async () => {
    (sdk.windows.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('boom');
    });
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('windows.open', [{ title: 'X' }], 'req-err'));

    await new Promise((r) => setTimeout(r, 10));
    expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sdk-error',
        id: 'req-err',
        error: 'boom',
      }),
      expect.any(String),
    );
  });

  it('handles concurrent requests with different IDs independently (M8)', async () => {
    cleanup = createHostBridge({ sdk, iframe, origin: '*' });
    dispatchMessage(makeBridgeRequest('windows.open', [{ title: 'A' }], 'req-a'));
    dispatchMessage(makeBridgeRequest('notifications.info', ['Hello'], 'req-b'));

    await new Promise((r) => setTimeout(r, 10));
    expect(sdk.windows.open).toHaveBeenCalledWith({ title: 'A' });
    expect(sdk.notifications.info).toHaveBeenCalledWith('Hello');

    const calls = (iframe.contentWindow!.postMessage as ReturnType<typeof vi.fn>).mock.calls;
    const ids = calls.map((c: unknown[]) => (c[0] as { id: string }).id);
    expect(ids).toContain('req-a');
    expect(ids).toContain('req-b');
  });
});
