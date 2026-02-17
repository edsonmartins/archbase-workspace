import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockStore, mockSetState } = vi.hoisted(() => {
  const mockStore = {
    openWindow: vi.fn(() => 'new-win-id'),
    closeWindow: vi.fn(),
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    restoreWindow: vi.fn(),
    getWindow: vi.fn(),
    getWindowsByAppId: vi.fn((): any[] => []),
  };
  const mockSetState = vi.fn();
  return { mockStore, mockSetState };
});

vi.mock('@archbase/workspace-state', () => ({
  useWindowsStore: Object.assign(() => {}, {
    getState: () => mockStore,
    setState: mockSetState,
  }),
}));

import { createWindowService } from '../services/windowService';

describe('createWindowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('open calls openWindow with appId and opts', () => {
    const service = createWindowService('my-app', 'win-1');

    const id = service.open({ title: 'New Window', width: 800, height: 600, props: { foo: 'bar' } });

    expect(mockStore.openWindow).toHaveBeenCalledWith({
      appId: 'my-app',
      title: 'New Window',
      width: 800,
      height: 600,
      props: { foo: 'bar' },
    });
    expect(id).toBe('new-win-id');
  });

  it('close uses windowId when no wId is given', () => {
    const service = createWindowService('my-app', 'win-1');

    service.close();

    expect(mockStore.closeWindow).toHaveBeenCalledWith('win-1');
  });

  it('close uses provided wId when given', () => {
    const service = createWindowService('my-app', 'win-1');

    service.close('win-other');

    expect(mockStore.closeWindow).toHaveBeenCalledWith('win-other');
  });

  it('minimize calls minimizeWindow with the correct window id', () => {
    const service = createWindowService('my-app', 'win-1');

    service.minimize();

    expect(mockStore.minimizeWindow).toHaveBeenCalledWith('win-1');
  });

  it('maximize calls maximizeWindow with viewport dimensions', () => {
    // jsdom provides innerWidth/innerHeight via globalThis
    const vw = globalThis.innerWidth ?? 1920;
    const vh = globalThis.innerHeight ?? 1080;

    const service = createWindowService('my-app', 'win-1');

    service.maximize();

    expect(mockStore.maximizeWindow).toHaveBeenCalledWith('win-1', vw, vh);
  });

  it('restore calls restoreWindow', () => {
    const service = createWindowService('my-app', 'win-1');

    service.restore();

    expect(mockStore.restoreWindow).toHaveBeenCalledWith('win-1');
  });

  it('setTitle updates the window title via setState', () => {
    const existingWindow = { id: 'win-1', title: 'Old Title', appId: 'my-app', state: 'normal' };
    mockStore.getWindow.mockReturnValue(existingWindow);

    const service = createWindowService('my-app', 'win-1');

    service.setTitle('New Title');

    expect(mockStore.getWindow).toHaveBeenCalledWith('win-1');
    expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));

    // Execute the updater function to verify it sets the correct title
    const updater = mockSetState.mock.calls[0][0];
    const fakeState = {
      windows: new Map([['win-1', { id: 'win-1', title: 'Old Title', appId: 'my-app' }]]),
    };
    const result = updater(fakeState);
    expect(result.windows.get('win-1').title).toBe('New Title');
  });

  it('setTitle is a no-op for non-existent window', () => {
    mockStore.getWindow.mockReturnValue(undefined);

    const service = createWindowService('my-app', 'win-1');

    service.setTitle('Title');

    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('getAll returns mapped windows for appId', () => {
    mockStore.getWindowsByAppId.mockReturnValue([
      { id: 'win-1', title: 'Window 1', state: 'normal', appId: 'my-app' },
      { id: 'win-2', title: 'Window 2', state: 'minimized', appId: 'my-app' },
    ]);

    const service = createWindowService('my-app', 'win-1');
    const windows = service.getAll();

    expect(mockStore.getWindowsByAppId).toHaveBeenCalledWith('my-app');
    expect(windows).toEqual([
      { id: 'win-1', title: 'Window 1', state: 'normal' },
      { id: 'win-2', title: 'Window 2', state: 'minimized' },
    ]);
  });
});
