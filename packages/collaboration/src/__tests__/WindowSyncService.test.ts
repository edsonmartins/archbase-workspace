import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import { WindowSyncService, type YWindowData } from '../services/WindowSyncService';

function makeWindowData(id: string, overrides?: Partial<YWindowData>): YWindowData {
  return {
    id,
    title: `Window ${id}`,
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    state: 'normal',
    zIndex: 1,
    sharedBy: 'user-1',
    mode: 'edit',
    participants: ['user-1'],
    ...overrides,
  };
}

describe('WindowSyncService', () => {
  let ydoc: Y.Doc;
  let service: WindowSyncService;
  let onRemoteUpdate: ReturnType<typeof vi.fn>;
  let onRemoteRemove: ReturnType<typeof vi.fn>;
  let getLocalWindows: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ydoc = new Y.Doc();
    onRemoteUpdate = vi.fn();
    onRemoteRemove = vi.fn();
    getLocalWindows = vi.fn().mockReturnValue(new Map());

    service = new WindowSyncService(ydoc, {
      onRemoteWindowUpdate: onRemoteUpdate,
      onRemoteWindowRemove: onRemoteRemove,
      getLocalWindows,
    });
  });

  afterEach(() => {
    service.stop();
    ydoc.destroy();
  });

  it('starts and stops without error', () => {
    service.start();
    service.stop();
  });

  it('detects Yjs map changes (remote → local)', () => {
    service.start();

    // Simulate remote change via Y.Doc
    const yWindows = ydoc.getMap<YWindowData>('windows');
    yWindows.set('win-1', makeWindowData('win-1'));

    expect(onRemoteUpdate).toHaveBeenCalledWith(
      'win-1',
      expect.objectContaining({ id: 'win-1', title: 'Window win-1' }),
    );
  });

  it('detects Yjs map deletions (remote → local)', () => {
    service.start();

    const yWindows = ydoc.getMap<YWindowData>('windows');
    yWindows.set('win-1', makeWindowData('win-1'));
    onRemoteUpdate.mockClear();

    yWindows.delete('win-1');
    expect(onRemoteRemove).toHaveBeenCalledWith('win-1');
  });

  it('syncs local window to Yjs when shared', () => {
    service.start();

    const data = makeWindowData('win-1');
    service.shareWindow('win-1', 'user-1', 'edit');
    service.syncLocalWindow('win-1', data);

    const yWindows = ydoc.getMap<YWindowData>('windows');
    expect(yWindows.get('win-1')).toBeDefined();
    expect(yWindows.get('win-1')?.title).toBe('Window win-1');
  });

  it('does not sync unshared windows to Yjs', () => {
    service.start();

    const data = makeWindowData('win-1');
    service.syncLocalWindow('win-1', data);

    const yWindows = ydoc.getMap<YWindowData>('windows');
    expect(yWindows.get('win-1')).toBeUndefined();
  });

  it('unsharing removes window from Yjs', () => {
    service.start();

    service.shareWindow('win-1', 'user-1');
    service.syncLocalWindow('win-1', makeWindowData('win-1'));

    const yWindows = ydoc.getMap<YWindowData>('windows');
    expect(yWindows.has('win-1')).toBe(true);

    service.unshareWindow('win-1');
    expect(yWindows.has('win-1')).toBe(false);
    expect(service.isShared('win-1')).toBe(false);
  });

  it('emits window shared event', () => {
    service.start();

    const handler = vi.fn();
    service.onWindowShared(handler);

    service.shareWindow('win-1', 'user-1', 'view');

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        windowId: 'win-1',
        sharedBy: 'user-1',
        mode: 'view',
      }),
    );
  });

  it('returns shared windows list', () => {
    service.start();

    service.shareWindow('win-1', 'user-1');
    service.shareWindow('win-2', 'user-1', 'view');

    const shared = service.getSharedWindows();
    expect(shared.length).toBe(2);
    expect(shared.map((s) => s.windowId).sort()).toEqual(['win-1', 'win-2']);
  });

  it('prevents echo loops (suppression flags)', () => {
    service.start();

    // When Yjs triggers an update, onRemoteUpdate is called.
    // But the onRemoteUpdate handler should NOT trigger syncLocalWindow
    // back to Yjs (that's the caller's responsibility with suppress flags).

    const yWindows = ydoc.getMap<YWindowData>('windows');
    yWindows.set('win-1', makeWindowData('win-1'));

    // onRemoteUpdate was called
    expect(onRemoteUpdate).toHaveBeenCalledTimes(1);

    // If we now sync the same window, it should work (suppress is reset)
    service.shareWindow('win-1', 'user-1');
    service.syncLocalWindow('win-1', makeWindowData('win-1', { x: 200 }));

    const updated = yWindows.get('win-1');
    expect(updated?.x).toBe(200);
  });
});
