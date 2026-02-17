import type {
  InstalledPlugin,
  MarketplaceFilter,
  MarketplacePlugin,
  PluginUpdate,
} from '@archbase/workspace-types';

// ============================================================
// Semver Comparison
// ============================================================

/**
 * Compare two semver strings. Returns -1 if a < b, 0 if equal, 1 if a > b.
 * Expects format "MAJOR.MINOR.PATCH" (no pre-release/build metadata).
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

// ============================================================
// Filter & Sort
// ============================================================

export function filterPlugins(
  plugins: MarketplacePlugin[],
  filter: MarketplaceFilter,
): MarketplacePlugin[] {
  let result = plugins;

  if (filter.search) {
    const q = filter.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.manifest.displayName?.toLowerCase().includes(q) ||
        p.manifest.name.toLowerCase().includes(q) ||
        p.manifest.description?.toLowerCase().includes(q) ||
        p.manifest.keywords?.some((k) => k.toLowerCase().includes(q)),
    );
  }

  if (filter.category) {
    const cat = filter.category;
    result = result.filter((p) => p.categories.includes(cat));
  }

  if (filter.featured) {
    result = result.filter((p) => p.featured);
  }

  if (filter.sortBy) {
    result = [...result];
    switch (filter.sortBy) {
      case 'popular':
        result.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        result.sort((a, b) =>
          (a.manifest.displayName ?? a.manifest.name).localeCompare(
            b.manifest.displayName ?? b.manifest.name,
          ),
        );
        break;
    }
  }

  return result;
}

// ============================================================
// Update Detection
// ============================================================

export function detectUpdates(
  installed: Map<string, InstalledPlugin>,
  registry: MarketplacePlugin[],
): PluginUpdate[] {
  const updates: PluginUpdate[] = [];

  for (const plugin of registry) {
    const local = installed.get(plugin.manifest.id);
    if (!local) continue;

    if (compareSemver(local.manifest.version, plugin.manifest.version) < 0) {
      updates.push({
        pluginId: plugin.manifest.id,
        currentVersion: local.manifest.version,
        latestVersion: plugin.manifest.version,
        downloadUrl: plugin.downloadUrl,
      });
    }
  }

  return updates;
}

// ============================================================
// Categories
// ============================================================

export function getCategories(plugins: MarketplacePlugin[]): string[] {
  const set = new Set<string>();
  for (const p of plugins) {
    for (const cat of p.categories) {
      set.add(cat);
    }
  }
  return Array.from(set).sort();
}
