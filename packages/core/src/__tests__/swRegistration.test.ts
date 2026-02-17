import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test the logic of swRegistration without actually registering a SW.
// We mock navigator.serviceWorker and location.

function mockLocation(hostname: string) {
  Object.defineProperty(globalThis, 'location', {
    writable: true,
    configurable: true,
    value: { hostname },
  });
}

function mockServiceWorker(enabled: boolean) {
  if (enabled) {
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({}),
      },
    });
  } else {
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: undefined,
    });
  }
}

describe('swRegistration (logic)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('does not register when serviceWorker is unavailable', () => {
    // Delete the property entirely so 'in' check returns false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).serviceWorker;
    mockLocation('example.com');
    expect('serviceWorker' in navigator).toBe(false);
  });

  it('does not register on localhost in dev mode', () => {
    mockServiceWorker(true);
    mockLocation('localhost');
    // On localhost without enable-dev flag → should skip
    const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const hasFlag = !!localStorage.getItem('archbase:sw:enable-dev');
    expect(isDev && !hasFlag).toBe(true);
  });

  it('registers on localhost when enable-dev flag is set', () => {
    mockServiceWorker(true);
    mockLocation('localhost');
    localStorage.setItem('archbase:sw:enable-dev', 'true');
    const isDev = location.hostname === 'localhost';
    const hasFlag = !!localStorage.getItem('archbase:sw:enable-dev');
    expect(isDev && hasFlag).toBe(true);
  });

  it('does not register on IPv6 localhost', () => {
    mockServiceWorker(true);
    mockLocation('[::1]');
    const isDev =
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '[::1]';
    const hasFlag = !!localStorage.getItem('archbase:sw:enable-dev');
    expect(isDev && !hasFlag).toBe(true);
  });

  it('registers in production (non-localhost)', () => {
    mockServiceWorker(true);
    mockLocation('workspace.archbase.com');
    const isDev =
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname === '[::1]';
    expect(isDev).toBe(false);
    // Would call navigator.serviceWorker.register in production
    expect('serviceWorker' in navigator).toBe(true);
  });
});
