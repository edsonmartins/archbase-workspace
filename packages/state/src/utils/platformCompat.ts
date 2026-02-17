import type { PlatformConfig } from '@archbase/workspace-types';

export function detectOS(): 'windows' | 'macos' | 'linux' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

export function detectBrowser(): 'chrome' | 'edge' | 'firefox' | 'safari' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  return 'unknown';
}

export function isPlatformCompatible(platform?: PlatformConfig): boolean {
  if (!platform) return true;
  const currentOS = detectOS();
  const currentBrowser = detectBrowser();
  if (platform.os && platform.os.length > 0 && !platform.os.includes(currentOS as any)) return false;
  if (platform.browser && platform.browser.length > 0 && !platform.browser.includes(currentBrowser as any))
    return false;
  return true;
}
