import type { AppManifest } from './index';

// ============================================================
// Plugin Marketplace Types (Phase 6.5)
// ============================================================

/** Plugin entry in the marketplace registry catalog */
export interface MarketplacePlugin {
  manifest: AppManifest;
  downloadUrl: string;
  publishedAt: string;
  updatedAt: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  categories: string[];
  featured: boolean;
}

/** Plugin installed locally (persisted in IDB) */
export interface InstalledPlugin {
  manifest: AppManifest;
  downloadUrl: string;
  installedAt: number;
  updatedAt: number;
  autoUpdate: boolean;
}

/** Local rating for a plugin */
export interface PluginRating {
  pluginId: string;
  rating: number;
  review?: string;
  createdAt: number;
}

/** Available update for an installed plugin */
export interface PluginUpdate {
  pluginId: string;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  changelog?: string;
}

/** Search/filter criteria for marketplace browsing */
export interface MarketplaceFilter {
  search?: string;
  category?: string;
  sortBy?: 'popular' | 'recent' | 'rating' | 'name';
  featured?: boolean;
}

/** Response shape from the plugin registry JSON */
export interface RegistryResponse {
  version: number;
  lastUpdated: string;
  plugins: MarketplacePlugin[];
  categories: string[];
}
