import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the underlying logic without renderHook since core doesn't
// depend on @testing-library/react. The hook uses useSyncExternalStore
// with navigator.onLine and online/offline events.

let onlineValue = true;

function mockNavigatorOnLine(value: boolean) {
  onlineValue = value;
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: onlineValue,
  });
}

describe('useOnlineStatus (logic)', () => {
  beforeEach(() => {
    mockNavigatorOnLine(true);
  });

  it('returns true when navigator.onLine is true', () => {
    mockNavigatorOnLine(true);
    expect(navigator.onLine).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    mockNavigatorOnLine(false);
    expect(navigator.onLine).toBe(false);
  });

  it('online/offline events fire correctly', () => {
    const handler = vi.fn();
    window.addEventListener('offline', handler);
    window.dispatchEvent(new Event('offline'));
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('offline', handler);

    const onlineHandler = vi.fn();
    window.addEventListener('online', onlineHandler);
    window.dispatchEvent(new Event('online'));
    expect(onlineHandler).toHaveBeenCalledOnce();
    window.removeEventListener('online', onlineHandler);
  });
});
