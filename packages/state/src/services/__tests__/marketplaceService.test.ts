import { describe, it, expect } from 'vitest';
import type { MarketplacePlugin, InstalledPlugin, MarketplaceFilter } from '@archbase/workspace-types';
import {
  compareSemver,
  filterPlugins,
  detectUpdates,
  getCategories,
} from '../marketplaceService';

// ============================================================
// Helpers — use `as AppManifest` for test convenience
// ============================================================

import type { AppManifest } from '@archbase/workspace-types';

const BASE_MANIFEST: AppManifest = {
  id: 'test',
  name: 'test',
  version: '1.0.0',
  entrypoint: './src/App.tsx',
  remoteEntry: 'http://test/mf-manifest.json',
};

function makePlugin(overrides: Record<string, unknown> = {}): MarketplacePlugin {
  const { manifest: mOverrides, ...rest } = overrides;
  return {
    manifest: { ...BASE_MANIFEST, ...(mOverrides as object) },
    downloadUrl: 'http://test/mf-manifest.json',
    publishedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    downloads: 100,
    rating: 4.0,
    ratingCount: 10,
    categories: [] as string[],
    featured: false,
    ...rest,
  } as MarketplacePlugin;
}

function makeInstalled(overrides: Record<string, unknown> = {}): InstalledPlugin {
  const { manifest: mOverrides, ...rest } = overrides;
  return {
    manifest: { ...BASE_MANIFEST, ...(mOverrides as object) },
    downloadUrl: 'http://test/mf-manifest.json',
    installedAt: Date.now(),
    updatedAt: Date.now(),
    autoUpdate: true,
    ...rest,
  } as InstalledPlugin;
}

// ============================================================
// Mock Data
// ============================================================

const mockPlugins: MarketplacePlugin[] = [
  makePlugin({
    manifest: { id: 'plugin-1', name: 'awesome-calculator', displayName: 'Awesome Calculator', version: '2.0.0', description: 'A powerful calculator app', keywords: ['math', 'calculator', 'numbers'] },
    categories: ['productivity', 'tools'],
    featured: true,
    downloads: 5000,
    rating: 4.8,
    ratingCount: 120,
    updatedAt: '2025-01-15T10:00:00Z',
    downloadUrl: 'https://registry.test/plugin-1/2.0.0',
  }),
  makePlugin({
    manifest: { id: 'plugin-2', name: 'simple-notes', displayName: 'Simple Notes', version: '1.5.0', description: 'Take quick notes', keywords: ['notes', 'text', 'editor'] },
    categories: ['productivity'],
    featured: false,
    downloads: 3000,
    rating: 4.2,
    ratingCount: 56,
    updatedAt: '2025-01-10T10:00:00Z',
    downloadUrl: 'https://registry.test/plugin-2/1.5.0',
  }),
  makePlugin({
    manifest: { id: 'plugin-3', name: 'game-tetris', displayName: 'Tetris Game', version: '3.1.2', description: 'Classic tetris game', keywords: ['game', 'tetris', 'fun'] },
    categories: ['games', 'entertainment'],
    featured: true,
    downloads: 8000,
    rating: 4.9,
    ratingCount: 200,
    updatedAt: '2025-01-20T10:00:00Z',
    downloadUrl: 'https://registry.test/plugin-3/3.1.2',
  }),
  makePlugin({
    manifest: { id: 'plugin-4', name: 'theme-dark', displayName: 'Dark Theme', version: '1.0.0', description: 'Beautiful dark theme' },
    categories: ['themes'],
    featured: false,
    downloads: 1500,
    rating: 4.0,
    ratingCount: 30,
    updatedAt: '2025-01-05T10:00:00Z',
    downloadUrl: 'https://registry.test/plugin-4/1.0.0',
  }),
];

const mockInstalled: Map<string, InstalledPlugin> = new Map([
  ['plugin-1', makeInstalled({ manifest: { id: 'plugin-1', name: 'awesome-calculator', version: '1.8.0' } })],
  ['plugin-2', makeInstalled({ manifest: { id: 'plugin-2', name: 'simple-notes', version: '1.5.0' } })],
  ['plugin-5', makeInstalled({ manifest: { id: 'plugin-5', name: 'old-plugin', version: '0.5.0' } })],
]);

// ============================================================
// compareSemver
// ============================================================

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
    expect(compareSemver('0.0.0', '0.0.0')).toBe(0);
  });

  it('returns -1 when a < b (major)', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
  });

  it('returns -1 when a < b (minor)', () => {
    expect(compareSemver('1.2.0', '1.3.0')).toBe(-1);
  });

  it('returns -1 when a < b (patch)', () => {
    expect(compareSemver('1.2.3', '1.2.4')).toBe(-1);
  });

  it('returns 1 when a > b (major)', () => {
    expect(compareSemver('3.0.0', '2.9.9')).toBe(1);
  });

  it('returns 1 when a > b (minor)', () => {
    expect(compareSemver('1.10.0', '1.5.0')).toBe(1);
  });

  it('returns 1 when a > b (patch)', () => {
    expect(compareSemver('1.2.10', '1.2.9')).toBe(1);
  });

  it('handles missing parts as 0', () => {
    expect(compareSemver('1.2', '1.2.0')).toBe(0);
    expect(compareSemver('2', '1.9.9')).toBe(1);
  });
});

// ============================================================
// filterPlugins
// ============================================================

describe('filterPlugins', () => {
  it('returns all plugins with no filters', () => {
    expect(filterPlugins(mockPlugins, {})).toHaveLength(4);
  });

  it('filters by displayName', () => {
    const result = filterPlugins(mockPlugins, { search: 'Calculator' });
    expect(result).toHaveLength(1);
    expect(result[0].manifest.id).toBe('plugin-1');
  });

  it('filters by name', () => {
    const result = filterPlugins(mockPlugins, { search: 'notes' });
    expect(result).toHaveLength(1);
    expect(result[0].manifest.id).toBe('plugin-2');
  });

  it('filters by description', () => {
    const result = filterPlugins(mockPlugins, { search: 'tetris' });
    expect(result).toHaveLength(1);
    expect(result[0].manifest.id).toBe('plugin-3');
  });

  it('filters by keywords', () => {
    const result = filterPlugins(mockPlugins, { search: 'game' });
    expect(result).toHaveLength(1);
    expect(result[0].manifest.id).toBe('plugin-3');
  });

  it('filters case-insensitively', () => {
    const result = filterPlugins(mockPlugins, { search: 'AWESOME' });
    expect(result).toHaveLength(1);
  });

  it('filters by category', () => {
    const result = filterPlugins(mockPlugins, { category: 'productivity' });
    expect(result).toHaveLength(2);
  });

  it('filters by featured', () => {
    const result = filterPlugins(mockPlugins, { featured: true });
    expect(result).toHaveLength(2);
  });

  it('combines filters', () => {
    const result = filterPlugins(mockPlugins, { search: 'calculator', category: 'tools' });
    expect(result).toHaveLength(1);
  });

  it('sorts by popular', () => {
    const result = filterPlugins(mockPlugins, { sortBy: 'popular' });
    expect(result.map((p) => p.downloads)).toEqual([8000, 5000, 3000, 1500]);
  });

  it('sorts by recent', () => {
    const result = filterPlugins(mockPlugins, { sortBy: 'recent' });
    expect(result.map((p) => p.manifest.id)).toEqual(['plugin-3', 'plugin-1', 'plugin-2', 'plugin-4']);
  });

  it('sorts by rating', () => {
    const result = filterPlugins(mockPlugins, { sortBy: 'rating' });
    expect(result.map((p) => p.rating)).toEqual([4.9, 4.8, 4.2, 4.0]);
  });

  it('sorts by name', () => {
    const result = filterPlugins(mockPlugins, { sortBy: 'name' });
    expect(result.map((p) => p.manifest.displayName)).toEqual(['Awesome Calculator', 'Dark Theme', 'Simple Notes', 'Tetris Game']);
  });

  it('does not mutate original array', () => {
    const original = [...mockPlugins];
    filterPlugins(mockPlugins, { sortBy: 'popular' });
    expect(mockPlugins).toEqual(original);
  });
});

// ============================================================
// detectUpdates
// ============================================================

describe('detectUpdates', () => {
  it('detects updates for outdated plugins', () => {
    const updates = detectUpdates(mockInstalled, mockPlugins);
    expect(updates).toHaveLength(1);
    expect(updates[0].pluginId).toBe('plugin-1');
    expect(updates[0].currentVersion).toBe('1.8.0');
    expect(updates[0].latestVersion).toBe('2.0.0');
  });

  it('skips up-to-date plugins', () => {
    const updates = detectUpdates(mockInstalled, mockPlugins);
    expect(updates.find((u) => u.pluginId === 'plugin-2')).toBeUndefined();
  });

  it('skips plugins not in marketplace', () => {
    const updates = detectUpdates(mockInstalled, mockPlugins);
    expect(updates.find((u) => u.pluginId === 'plugin-5')).toBeUndefined();
  });

  it('returns empty when nothing installed', () => {
    expect(detectUpdates(new Map(), mockPlugins)).toEqual([]);
  });

  it('returns empty when marketplace is empty', () => {
    expect(detectUpdates(mockInstalled, [])).toEqual([]);
  });
});

// ============================================================
// getCategories
// ============================================================

describe('getCategories', () => {
  it('extracts unique sorted categories', () => {
    expect(getCategories(mockPlugins)).toEqual(['entertainment', 'games', 'productivity', 'themes', 'tools']);
  });

  it('deduplicates categories', () => {
    const plugins = [
      makePlugin({ categories: ['tools', 'productivity'] }),
      makePlugin({ manifest: { id: 'x' }, categories: ['productivity', 'tools'] }),
    ];
    expect(getCategories(plugins)).toEqual(['productivity', 'tools']);
  });

  it('returns empty for empty input', () => {
    expect(getCategories([])).toEqual([]);
  });

  it('handles plugins with no categories', () => {
    const plugins = [
      makePlugin({ categories: [] }),
      makePlugin({ manifest: { id: 'x' }, categories: ['tools'] }),
    ];
    expect(getCategories(plugins)).toEqual(['tools']);
  });
});
