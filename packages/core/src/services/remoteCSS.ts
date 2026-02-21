/**
 * Remote CSS Loader
 *
 * Module Federation with Rspack `experiments: { css: true }` emits CSS as native
 * chunks, but the MF runtime only loads JS chunks from remotes — it does NOT
 * automatically inject <link> tags for the remote's CSS assets.
 *
 * This service reads the remote's mf-manifest.json, extracts CSS assets from
 * exposed modules, and injects them as <link rel="stylesheet"> into <head>.
 *
 * Each CSS file is loaded at most once (deduped by href) and kept in the DOM
 * for the lifetime of the session (no cleanup needed — files are small and cached).
 */

interface MFManifestExpose {
  id: string;
  assets: {
    css: { sync: string[]; async: string[] };
    js: { sync: string[]; async: string[] };
  };
}

interface MFManifest {
  exposes?: MFManifestExpose[];
}

const loadedCSS = new Set<string>();
const manifestCache = new Map<string, Promise<MFManifest | null>>();

function fetchManifest(manifestUrl: string): Promise<MFManifest | null> {
  if (!manifestCache.has(manifestUrl)) {
    manifestCache.set(
      manifestUrl,
      fetch(manifestUrl)
        .then((r) => (r.ok ? (r.json() as Promise<MFManifest>) : null))
        .catch(() => null),
    );
  }
  return manifestCache.get(manifestUrl)!;
}

function injectStylesheet(href: string): Promise<void> {
  if (loadedCSS.has(href)) return Promise.resolve();

  // Check if a link with this href already exists in the DOM
  const existing = document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
  for (const el of existing) {
    if (el.href === href) {
      loadedCSS.add(href);
      return Promise.resolve();
    }
  }

  return new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => {
      loadedCSS.add(href);
      resolve();
    };
    link.onerror = () => {
      // CSS load failure is non-critical — resolve anyway so app still renders
      console.warn(`[remoteCSS] Failed to load stylesheet: ${href}`);
      resolve();
    };
    document.head.appendChild(link);
  });
}

/**
 * Load CSS assets from a remote MF module's manifest.
 *
 * @param remoteEntry - The remote's mf-manifest.json URL
 *   (e.g., "http://localhost:3010/mf-manifest.json")
 */
export async function loadRemoteCSS(remoteEntry: string): Promise<void> {
  const manifestUrl = remoteEntry;
  const baseUrl = manifestUrl.replace(/\/[^/]+$/, '');

  const manifest = await fetchManifest(manifestUrl);
  if (!manifest?.exposes) return;

  const cssFiles: string[] = [];
  for (const expose of manifest.exposes) {
    for (const file of expose.assets.css.sync) {
      cssFiles.push(`${baseUrl}/${file}`);
    }
    for (const file of expose.assets.css.async) {
      cssFiles.push(`${baseUrl}/${file}`);
    }
  }

  if (cssFiles.length === 0) return;

  console.log(`[remoteCSS] Injecting ${cssFiles.length} stylesheet(s) from ${manifestUrl}:`, cssFiles);
  await Promise.all(cssFiles.map(injectStylesheet));
}
