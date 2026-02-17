import type { MarketplacePlugin } from '@archbase/workspace-types';
import { useMarketplaceStore } from '@archbase/workspace-state';
import { RatingStars } from './RatingStars';

interface PluginCardProps {
  plugin: MarketplacePlugin;
  onSelect: (pluginId: string) => void;
}

export function PluginCard({ plugin, onSelect }: PluginCardProps) {
  const isInstalled = useMarketplaceStore((s) => s.isInstalled);
  const updates = useMarketplaceStore((s) => s.updates);
  const installPlugin = useMarketplaceStore((s) => s.installPlugin);

  const installed = isInstalled(plugin.manifest.id);
  const hasUpdate = updates.some((u) => u.pluginId === plugin.manifest.id);

  const handleInstall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!installed) {
      installPlugin(plugin);
    }
  };

  const formatDownloads = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <div
      className="plugin-card"
      onClick={() => onSelect(plugin.manifest.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(plugin.manifest.id)}
    >
      <div className="plugin-card__header">
        <div className="plugin-card__icon">
          {plugin.manifest.icon || plugin.manifest.name.charAt(0).toUpperCase()}
        </div>
        <div className="plugin-card__info">
          <h3 className="plugin-card__name">
            {plugin.manifest.displayName || plugin.manifest.name}
          </h3>
          <span className="plugin-card__author">
            {typeof plugin.manifest.author === 'object'
              ? plugin.manifest.author?.name
              : 'Unknown'}
          </span>
        </div>
      </div>

      <p className="plugin-card__description">
        {plugin.manifest.description || 'No description available'}
      </p>

      <div className="plugin-card__footer">
        <div className="plugin-card__rating">
          <RatingStars value={plugin.rating} readonly />
          <span className="plugin-card__downloads">
            {formatDownloads(plugin.downloads)}
          </span>
        </div>

        <button
          type="button"
          className={`plugin-card__install-btn ${
            hasUpdate
              ? 'plugin-card__install-btn--update'
              : installed
                ? 'plugin-card__install-btn--installed'
                : 'plugin-card__install-btn--install'
          }`}
          onClick={handleInstall}
          disabled={installed && !hasUpdate}
        >
          {hasUpdate ? 'Update' : installed ? 'Installed' : 'Install'}
        </button>
      </div>
    </div>
  );
}
