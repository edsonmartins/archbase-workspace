import { useMarketplaceStore } from '@archbase/workspace-state';

export type MarketplaceTab = 'browse' | 'installed' | 'updates';

interface MarketplaceHeaderProps {
  tab: MarketplaceTab;
  onTabChange: (tab: MarketplaceTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function MarketplaceHeader({
  tab,
  onTabChange,
  search,
  onSearchChange,
}: MarketplaceHeaderProps) {
  const updates = useMarketplaceStore((s) => s.updates);

  return (
    <div className="marketplace-header">
      <input
        className="marketplace-search"
        type="text"
        placeholder="Search plugins..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Search plugins"
      />
      <div className="marketplace-tabs">
        <button
          type="button"
          className={`marketplace-tab ${tab === 'browse' ? 'marketplace-tab--active' : ''}`}
          onClick={() => onTabChange('browse')}
        >
          Browse
        </button>
        <button
          type="button"
          className={`marketplace-tab ${tab === 'installed' ? 'marketplace-tab--active' : ''}`}
          onClick={() => onTabChange('installed')}
        >
          Installed
        </button>
        <button
          type="button"
          className={`marketplace-tab ${tab === 'updates' ? 'marketplace-tab--active' : ''}`}
          onClick={() => onTabChange('updates')}
        >
          Updates
          {updates.length > 0 && (
            <span className="marketplace-tab__badge">{updates.length}</span>
          )}
        </button>
      </div>
    </div>
  );
}
