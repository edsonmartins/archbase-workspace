import { useState, useEffect, useMemo } from 'react';
import {
  useMarketplaceStore,
  useMarketplaceRegistry,
  useMarketplaceCategories,
  useMarketplaceStatus,
  filterPlugins,
} from '@archbase/workspace-state';
import type { MarketplaceFilter } from '@archbase/workspace-types';
import { MarketplaceHeader, type MarketplaceTab } from './components/MarketplaceHeader';
import { PluginCard } from './components/PluginCard';
import { PluginDetail } from './components/PluginDetail';
import { CategoryFilter } from './components/CategoryFilter';
import { InstalledList } from './components/InstalledList';
import { UpdatesPanel } from './components/UpdatesPanel';
import './styles/marketplace.css';

export default function MarketplaceApp() {
  const [tab, setTab] = useState<MarketplaceTab>('browse');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);

  const registry = useMarketplaceRegistry();
  const categories = useMarketplaceCategories();
  const status = useMarketplaceStatus();
  const fetchRegistry = useMarketplaceStore((s) => s.fetchRegistry);

  // Fetch registry on mount if not yet loaded
  useEffect(() => {
    if (status === 'idle') {
      fetchRegistry();
    }
  }, [status, fetchRegistry]);

  const filter: MarketplaceFilter = useMemo(
    () => ({
      search: search || undefined,
      category: selectedCategory,
      sortBy: 'popular',
    }),
    [search, selectedCategory],
  );

  const filteredPlugins = useMemo(
    () => filterPlugins(registry, filter),
    [registry, filter],
  );

  const selectedPlugin = selectedPluginId
    ? registry.find((p) => p.manifest.id === selectedPluginId) ?? null
    : null;

  return (
    <div className="marketplace-app">
      <MarketplaceHeader
        tab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="marketplace-content">
        {tab === 'browse' && (
          <>
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onChange={setSelectedCategory}
            />

            {status === 'loading' && (
              <div className="marketplace-loading">Loading plugins...</div>
            )}

            {status !== 'loading' && filteredPlugins.length === 0 && (
              <div className="marketplace-empty">
                <div className="marketplace-empty__icon">🔍</div>
                <div className="marketplace-empty__text">
                  {search ? 'No plugins match your search' : 'No plugins available'}
                </div>
              </div>
            )}

            {filteredPlugins.length > 0 && (
              <div className="plugin-grid">
                {filteredPlugins.map((plugin) => (
                  <PluginCard
                    key={plugin.manifest.id}
                    plugin={plugin}
                    onSelect={setSelectedPluginId}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'installed' && <InstalledList onSelect={setSelectedPluginId} />}

        {tab === 'updates' && <UpdatesPanel />}
      </div>

      {selectedPlugin && (
        <PluginDetail
          plugin={selectedPlugin}
          onClose={() => setSelectedPluginId(null)}
        />
      )}
    </div>
  );
}
