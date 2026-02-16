import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createIframeBridgeSDK } from '../bridge/iframeBridge';
import { BRIDGE_MARKER } from '../bridge/types';
import type { BridgeRequest } from '../bridge/types';

// Mock window.parent.postMessage
const mockParentPostMessage = vi.fn();

beforeEach(() => {
  vi.stubGlobal('parent', { postMessage: mockParentPostMessage });
  mockParentPostMessage.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function respondToLastRequest(result: unknown) {
  const lastCall = mockParentPostMessage.mock.calls.at(-1);
  if (!lastCall) throw new Error('No postMessage call found');
  const request = lastCall[0] as BridgeRequest;

  // Simulate host response from parent
  const responseEvent = new MessageEvent('message', {
    data: {
      [BRIDGE_MARKER]: true,
      type: 'sdk-response',
      id: request.id,
      result,
    },
    source: window.parent as Window,
  });
  window.dispatchEvent(responseEvent);
}

function respondWithError(errorMsg: string) {
  const lastCall = mockParentPostMessage.mock.calls.at(-1);
  if (!lastCall) throw new Error('No postMessage call found');
  const request = lastCall[0] as BridgeRequest;

  const errorEvent = new MessageEvent('message', {
    data: {
      [BRIDGE_MARKER]: true,
      type: 'sdk-error',
      id: request.id,
      error: errorMsg,
    },
    source: window.parent as Window,
  });
  window.dispatchEvent(errorEvent);
}

describe('createIframeBridgeSDK', () => {
  afterEach(() => {
    // Clean up any created SDKs
  });

  it('creates SDK with correct appId and windowId', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    expect(sdk.appId).toBe('my-app');
    expect(sdk.windowId).toBe('win-1');
    sdk.destroy();
  });

  it('has a destroy method', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    expect(typeof sdk.destroy).toBe('function');
    sdk.destroy();
  });

  it('commands.execute sends bridge request', async () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const promise = sdk.commands.execute('some.cmd', 'arg1');

    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        [BRIDGE_MARKER]: true,
        type: 'sdk-request',
        method: 'commands.execute',
        args: ['some.cmd', 'arg1'],
      }),
      '*',
    );

    respondToLastRequest(undefined);
    await promise;
    sdk.destroy();
  });

  it('commands.register returns no-op (cannot bridge callbacks)', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const unregister = sdk.commands.register('test.cmd', () => {});
    expect(typeof unregister).toBe('function');
    unregister();
    sdk.destroy();
  });

  it('notifications.info fires and forgets, returns empty string', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const id = sdk.notifications.info('Hello', 'World');
    expect(id).toBe('');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'notifications.info',
        args: ['Hello', 'World'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('storage.set fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.storage.set('key', 'value');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'storage.set',
        args: ['key', 'value'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('storage.get returns null (sync methods cannot be bridged)', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    expect(sdk.storage.get('key')).toBeNull();
    sdk.destroy();
  });

  it('storage.keys returns empty array (sync limitation)', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    expect(sdk.storage.keys()).toEqual([]);
    sdk.destroy();
  });

  it('permissions.request sends bridge request and resolves', async () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const promise = sdk.permissions.request('notifications');

    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'permissions.request',
        args: ['notifications'],
      }),
      '*',
    );

    respondToLastRequest(true);
    const result = await promise;
    expect(result).toBe(true);
    sdk.destroy();
  });

  it('permissions.check returns denied (sync limitation, fail-closed)', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    expect(sdk.permissions.check('notifications')).toBe('denied');
    sdk.destroy();
  });

  it('handles error responses from host', async () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const promise = sdk.commands.execute('failing.cmd');

    respondWithError('Method not allowed: failing.cmd');
    await expect(promise).rejects.toThrow('Method not allowed');
    sdk.destroy();
  });

  it('settings.get returns undefined (sync limitation)', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    expect(sdk.settings.get('some.key')).toBeUndefined();
    sdk.destroy();
  });

  it('contextMenu.show strips action callbacks before sending', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.contextMenu.show({ x: 100, y: 200 }, [{ id: 'copy', label: 'Copy', action: () => {} }]);
    const sentMessage = mockParentPostMessage.mock.calls.at(-1)?.[0];
    // Verify action was stripped
    expect(sentMessage.args[1][0]).not.toHaveProperty('action');
    expect(sentMessage.args[1][0]).toHaveProperty('id', 'copy');
    expect(sentMessage.args[1][0]).toHaveProperty('label', 'Copy');
    sdk.destroy();
  });

  it('destroy removes listener and rejects pending requests', async () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const promise = sdk.commands.execute('some.cmd');
    sdk.destroy();
    await expect(promise).rejects.toThrow('Bridge destroyed');
  });

  it('uses non-predictable request IDs', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.notifications.info('A');
    sdk.notifications.info('B');
    const id1 = (mockParentPostMessage.mock.calls[0][0] as BridgeRequest).id;
    const id2 = (mockParentPostMessage.mock.calls[1][0] as BridgeRequest).id;
    expect(id1).not.toBe(id2);
    // IDs should not be simple sequential numbers
    expect(id1).not.toMatch(/^bridge-\d+$/);
    sdk.destroy();
  });

  it('rejects with timeout error when host does not respond', async () => {
    vi.useFakeTimers();
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const promise = sdk.commands.execute('slow.cmd');

    // Advance past the 10s default timeout
    vi.advanceTimersByTime(10_001);

    await expect(promise).rejects.toThrow('Bridge timeout: commands.execute');
    sdk.destroy();
    vi.useRealTimers();
  });

  it('ignores late response after timeout', async () => {
    vi.useFakeTimers();
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const promise = sdk.commands.execute('late.cmd');

    // Advance past timeout
    vi.advanceTimersByTime(10_001);
    await expect(promise).rejects.toThrow('Bridge timeout');

    // Late response should not cause errors
    respondToLastRequest('late-value');
    sdk.destroy();
    vi.useRealTimers();
  });

  it('ignores responses from non-parent sources', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const promise = sdk.commands.execute('some.cmd');

    // Send response from wrong source (not window.parent)
    const fakeEvent = new MessageEvent('message', {
      data: {
        [BRIDGE_MARKER]: true,
        type: 'sdk-response',
        id: (mockParentPostMessage.mock.calls[0][0] as BridgeRequest).id,
        result: 'fake',
      },
      // source defaults to null, not window.parent
    });
    window.dispatchEvent(fakeEvent);

    // Promise should still be pending (not resolved by fake response)
    // Resolve with real response
    respondToLastRequest('real');
    return promise.then((result) => {
      expect(result).toBe('real');
      sdk.destroy();
    });
  });

  it('windows.close fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.windows.close('win-1');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'windows.close',
        args: ['win-1'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('windows.minimize fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.windows.minimize('win-1');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'windows.minimize',
        args: ['win-1'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('windows.maximize fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.windows.maximize('win-1');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'windows.maximize',
        args: ['win-1'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('windows.restore fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.windows.restore('win-1');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'windows.restore',
        args: ['win-1'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('windows.setTitle fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.windows.setTitle('New Title', 'win-1');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'windows.setTitle',
        args: ['New Title', 'win-1'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('windows.getAll returns a promise', async () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const promise = sdk.windows.getAll();
    respondToLastRequest([{ id: 'win-1', title: 'Test', state: 'normal' }]);
    const result = await promise;
    expect(result).toEqual([{ id: 'win-1', title: 'Test', state: 'normal' }]);
    sdk.destroy();
  });

  it('notifications.success fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const id = sdk.notifications.success('Done', 'All good');
    expect(id).toBe('');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'notifications.success' }),
      '*',
    );
    sdk.destroy();
  });

  it('notifications.warning fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const id = sdk.notifications.warning('Caution');
    expect(id).toBe('');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'notifications.warning' }),
      '*',
    );
    sdk.destroy();
  });

  it('notifications.error fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const id = sdk.notifications.error('Failed');
    expect(id).toBe('');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'notifications.error' }),
      '*',
    );
    sdk.destroy();
  });

  it('notifications.dismiss fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.notifications.dismiss('notif-1');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'notifications.dismiss',
        args: ['notif-1'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('settings.set fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.settings.set('theme', 'dark');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'settings.set',
        args: ['theme', 'dark'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('settings.onChange returns a no-op unsubscribe', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    const unsub = sdk.settings.onChange('theme', () => {});
    expect(typeof unsub).toBe('function');
    unsub(); // should not throw
    sdk.destroy();
  });

  it('storage.remove fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.storage.remove('key');
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'storage.remove',
        args: ['key'],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('storage.clear fires and forgets', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    sdk.storage.clear();
    expect(mockParentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'storage.clear',
        args: [],
      }),
      '*',
    );
    sdk.destroy();
  });

  it('permissions.list returns empty array (sync limitation)', () => {
    const sdk = createIframeBridgeSDK('my-app', 'win-1');
    expect(sdk.permissions.list()).toEqual([]);
    sdk.destroy();
  });
});
