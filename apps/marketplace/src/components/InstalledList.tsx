import { useInstalledPlugins, useMarketplaceStore } from '@archbase/workspace-state';

interface InstalledListProps {
  onSelect: (pluginId: string) => void;
}

export function InstalledList({ onSelect }: InstalledListProps) {
  const installed = useInstalledPlugins();
  const uninstallPlugin = useMarketplaceStore((s) => s.uninstallPlugin);

  if (installed.length === 0) {
    return (
      <div className="marketplace-empty">
        <div className="marketplace-empty__icon">📦</div>
        <div className="marketplace-empty__text">No plugins installed yet</div>
      </div>
    );
  }

  return (
    <div className="installed-list">
      {installed.map((plugin) => (
        <div
          key={plugin.manifest.id}
          className="installed-item"
          onClick={() => onSelect(plugin.manifest.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect(plugin.manifest.id)}
        >
          <div className="installed-item__icon">
            {plugin.manifest.icon || plugin.manifest.name.charAt(0).toUpperCase()}
          </div>
          <div className="installed-item__info">
            <span className="installed-item__name">
              {plugin.manifest.displayName || plugin.manifest.name}
            </span>
            <span className="installed-item__version">
              v{plugin.manifest.version}
              {' · '}
              Installed {new Date(plugin.installedAt).toLocaleDateString()}
            </span>
          </div>
          <button
            type="button"
            className="installed-item__uninstall"
            onClick={(e) => {
              e.stopPropagation();
              uninstallPlugin(plugin.manifest.id);
            }}
          >
            Uninstall
          </button>
        </div>
      ))}
    </div>
  );
}
