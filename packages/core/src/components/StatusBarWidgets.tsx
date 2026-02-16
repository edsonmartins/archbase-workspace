import { Suspense } from 'react';
import { useStatusBarWidgets } from '@archbase/workspace-state';

/**
 * Renders registered status bar widgets in the right area of the Taskbar.
 * Widgets are sorted by their `order` property.
 */
export function StatusBarWidgets() {
  const widgets = useStatusBarWidgets();

  if (widgets.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginLeft: 'auto',
        paddingRight: 8,
      }}
    >
      {widgets.map((w) => (
        <Suspense key={w.id} fallback={<span style={{ fontSize: 12, color: '#6b7280' }}>...</span>}>
          <div
            className="status-bar-widget"
            title={w.title}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: 'var(--taskbar-text)',
            }}
          >
            <span>{w.title}</span>
          </div>
        </Suspense>
      ))}
    </div>
  );
}
