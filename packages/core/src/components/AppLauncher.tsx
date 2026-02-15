import { useState, useDeferredValue, useCallback, useEffect, useRef, useMemo } from 'react';
import type { AppManifest } from '@archbase/workspace-types';
import { IS_MAC } from '../utils/parseKeyCombo';

interface AppLauncherProps {
  visible: boolean;
  apps: AppManifest[];
  onClose: () => void;
  onOpenApp: (app: AppManifest) => void;
}

function filterApps(apps: AppManifest[], query: string): AppManifest[] {
  if (!query.trim()) return apps;
  const q = query.toLowerCase();
  return apps.filter((app) => {
    const searchable = [
      app.displayName,
      app.name,
      app.description,
      ...(app.keywords ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchable.includes(q);
  });
}

export function AppLauncher({ visible, apps, onClose, onOpenApp }: AppLauncherProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => filterApps(apps, deferredQuery), [apps, deferredQuery]);

  // Reset state when opening
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [visible]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Allow Cmd+K / Ctrl+K to toggle launcher closed even from input
      if (e.key === 'k' && (IS_MAC ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        onClose();
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (results.length > 0) {
            setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (results.length > 0) {
            setSelectedIndex((i) => Math.max(i - 1, 0));
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (results.length > 0 && results[selectedIndex]) {
            onOpenApp(results[selectedIndex]);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onOpenApp, onClose],
  );

  if (!visible) return null;

  return (
    <div
      className="launcher-overlay"
      onPointerDown={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="launcher-card">
        <input
          ref={inputRef}
          className="launcher-input"
          type="text"
          placeholder="Search apps..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search applications"
          aria-controls="launcher-results-list"
          aria-activedescendant={results.length > 0 ? `launcher-result-${results[selectedIndex]?.id}` : undefined}
          autoComplete="off"
          role="combobox"
          aria-expanded={true}
          aria-autocomplete="list"
        />

        <div className="launcher-results" role="listbox" id="launcher-results-list" aria-label="Application results">
          {results.map((app, index) => (
            <button
              key={app.id}
              id={`launcher-result-${app.id}`}
              role="option"
              aria-selected={index === selectedIndex}
              className="launcher-result-item"
              data-selected={index === selectedIndex}
              onPointerEnter={() => setSelectedIndex(index)}
              onClick={() => {
                onOpenApp(app);
                onClose();
              }}
            >
              {app.icon && <span className="launcher-result-icon">{app.icon}</span>}
              <div className="launcher-result-text">
                <span className="launcher-result-name">{app.displayName || app.name}</span>
                {app.description && (
                  <span className="launcher-result-desc">{app.description}</span>
                )}
              </div>
            </button>
          ))}
          {results.length === 0 && (
            <div className="launcher-no-results">No apps found</div>
          )}
        </div>
      </div>
    </div>
  );
}
