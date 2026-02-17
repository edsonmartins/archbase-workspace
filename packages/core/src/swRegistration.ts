/**
 * Register the service worker.
 * Only registers in production (non-localhost) or when explicitly enabled.
 * In development, SW can interfere with HMR and MF dynamic loading.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const isDev =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '[::1]';
  if (isDev && !localStorage.getItem('archbase:sw:enable-dev')) return;

  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.warn('[SW] Registration failed:', error);
  }
}
