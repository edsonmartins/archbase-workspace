import { useState } from 'react';
import type { MarketplacePlugin } from '@archbase/workspace-types';
import { useMarketplaceStore } from '@archbase/workspace-state';
import { RatingStars } from './RatingStars';

interface PluginDetailProps {
  plugin: MarketplacePlugin;
  onClose: () => void;
}

export function PluginDetail({ plugin, onClose }: PluginDetailProps) {
  const isInstalled = useMarketplaceStore((s) => s.isInstalled);
  const installPlugin = useMarketplaceStore((s) => s.installPlugin);
  const uninstallPlugin = useMarketplaceStore((s) => s.uninstallPlugin);
  const ratePlugin = useMarketplaceStore((s) => s.ratePlugin);
  const ratings = useMarketplaceStore((s) => s.ratings);

  const installed = isInstalled(plugin.manifest.id);
  const localRating = ratings.get(plugin.manifest.id);
  const [userRating, setUserRating] = useState(localRating?.rating ?? 0);

  const handleRate = (value: number) => {
    setUserRating(value);
    ratePlugin(plugin.manifest.id, value);
  };

  const handleInstall = () => {
    installPlugin(plugin);
  };

  const handleUninstall = () => {
    uninstallPlugin(plugin.manifest.id);
  };

  return (
    <div className="plugin-detail-overlay" onClick={onClose}>
      <div className="plugin-detail" onClick={(e) => e.stopPropagation()}>
        <div className="plugin-detail__header">
          <div className="plugin-detail__icon">
            {plugin.manifest.icon || plugin.manifest.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="plugin-detail__title">
              {plugin.manifest.displayName || plugin.manifest.name}
            </h2>
            <div className="plugin-detail__meta">
              <span>
                {typeof plugin.manifest.author === 'object'
                  ? plugin.manifest.author?.name
                  : 'Unknown'}
              </span>
              {' · '}
              <span>v{plugin.manifest.version}</span>
              {' · '}
              <span>{plugin.downloads.toLocaleString()} downloads</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <RatingStars value={plugin.rating} count={plugin.ratingCount} readonly />
            </div>
          </div>
        </div>

        <p className="plugin-detail__description">
          {plugin.manifest.description || 'No description available'}
        </p>

        {plugin.manifest.keywords && plugin.manifest.keywords.length > 0 && (
          <div className="plugin-detail__section">
            <div className="plugin-detail__section-title">Keywords</div>
            <div className="plugin-detail__permissions">
              {plugin.manifest.keywords.map((kw) => (
                <span key={kw} className="plugin-detail__permission-tag">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {plugin.manifest.permissions && plugin.manifest.permissions.length > 0 && (
          <div className="plugin-detail__section">
            <div className="plugin-detail__section-title">Permissions Required</div>
            <div className="plugin-detail__permissions">
              {plugin.manifest.permissions.map((perm) => (
                <span key={perm} className="plugin-detail__permission-tag">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="plugin-detail__section">
          <div className="plugin-detail__section-title">Your Rating</div>
          <RatingStars value={userRating} onChange={handleRate} />
        </div>

        <div className="plugin-detail__actions">
          {installed ? (
            <button
              type="button"
              className="plugin-detail__btn plugin-detail__btn--danger"
              onClick={handleUninstall}
            >
              Uninstall
            </button>
          ) : (
            <button
              type="button"
              className="plugin-detail__btn plugin-detail__btn--primary"
              onClick={handleInstall}
            >
              Install
            </button>
          )}
          <button
            type="button"
            className="plugin-detail__btn plugin-detail__btn--secondary plugin-detail__close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
