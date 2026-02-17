import { useMarketplaceStore } from '@archbase/workspace-state';

export function UpdatesPanel() {
  const updates = useMarketplaceStore((s) => s.updates);
  const installed = useMarketplaceStore((s) => s.installed);
  const updatePlugin = useMarketplaceStore((s) => s.updatePlugin);

  const handleUpdateAll = () => {
    for (const update of updates) {
      updatePlugin(update.pluginId);
    }
  };

  if (updates.length === 0) {
    return (
      <div className="marketplace-empty">
        <div className="marketplace-empty__icon">✓</div>
        <div className="marketplace-empty__text">All plugins are up to date</div>
      </div>
    );
  }

  return (
    <div className="updates-panel">
      <div className="updates-panel__header">
        <span className="updates-panel__title">
          {updates.length} update{updates.length !== 1 ? 's' : ''} available
        </span>
        <button
          type="button"
          className="updates-panel__update-all"
          onClick={handleUpdateAll}
        >
          Update All
        </button>
      </div>

      {updates.map((update) => {
        const plugin = installed.get(update.pluginId);
        return (
          <div key={update.pluginId} className="update-item">
            <div className="update-item__info">
              <span className="update-item__name">
                {plugin?.manifest.displayName || update.pluginId}
              </span>
              <span className="update-item__versions">
                {update.currentVersion} → {update.latestVersion}
              </span>
            </div>
            <button
              type="button"
              className="update-item__btn"
              onClick={() => updatePlugin(update.pluginId)}
            >
              Update
            </button>
          </div>
        );
      })}
    </div>
  );
}
