import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectOS, detectBrowser, isPlatformCompatible } from '../platformCompat';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('detectOS', () => {
  it('returns "windows" for Windows user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    expect(detectOS()).toBe('windows');
  });

  it('returns "macos" for macOS user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    expect(detectOS()).toBe('macos');
  });

  it('returns "linux" for Linux user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    });
    expect(detectOS()).toBe('linux');
  });

  it('returns "unknown" for unknown user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'SomeCustomAgent/1.0',
    });
    expect(detectOS()).toBe('unknown');
  });
});

describe('detectBrowser', () => {
  it('returns "chrome" for Chrome user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    expect(detectBrowser()).toBe('chrome');
  });

  it('returns "edge" for Edge user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    });
    expect(detectBrowser()).toBe('edge');
  });

  it('returns "firefox" for Firefox user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    });
    expect(detectBrowser()).toBe('firefox');
  });

  it('returns "safari" for Safari user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    });
    expect(detectBrowser()).toBe('safari');
  });

  it('returns "unknown" for unknown browser user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'SomeCustomAgent/1.0',
    });
    expect(detectBrowser()).toBe('unknown');
  });
});

describe('isPlatformCompatible', () => {
  it('returns true when no platform config is given', () => {
    expect(isPlatformCompatible()).toBe(true);
    expect(isPlatformCompatible(undefined)).toBe(true);
  });

  it('returns true when platform OS matches current OS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    expect(isPlatformCompatible({ os: ['macos', 'linux'] })).toBe(true);
  });

  it('returns false when platform OS does not match current OS', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    expect(isPlatformCompatible({ os: ['windows', 'linux'] })).toBe(false);
  });

  it('returns true when platform browser matches current browser', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    expect(isPlatformCompatible({ browser: ['chrome', 'firefox'] })).toBe(true);
  });

  it('returns false when platform browser does not match current browser', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    expect(isPlatformCompatible({ browser: ['firefox', 'safari'] })).toBe(false);
  });

  it('returns true when empty arrays are provided', () => {
    expect(isPlatformCompatible({ os: [], browser: [] })).toBe(true);
  });
});
