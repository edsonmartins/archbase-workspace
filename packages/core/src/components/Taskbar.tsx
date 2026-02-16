import { useCallback } from 'react';
import { useAllWindows, useWindowsStore, useFocusedWindowId, useContextMenuStore } from '@archbase/workspace-state';
import type { AppManifest, ContextMenuItem } from '@archbase/workspace-types';
import { StatusBarWidgets } from './StatusBarWidgets';

interface TaskbarProps {
  apps: AppManifest[];
  onOpenApp: (app: AppManifest) => void;
  onOpenLauncher: () => void;
}

export function Taskbar({ apps, onOpenApp, onOpenLauncher }: TaskbarProps) {
  const windows = useAllWindows();
  const focusedId = useFocusedWindowId();
  const focusWindow = useWindowsStore((s) => s.focusWindow);
  const minimizeWindow = useWindowsStore((s) => s.minimizeWindow);

  const closeWindow = useWindowsStore((s) => s.closeWindow);
  const openContextMenu = useContextMenuStore((s) => s.open);

  const handleTaskbarItemClick = useCallback(
    (id: string, state: string) => {
      if (state === 'minimized') {
        focusWindow(id);
      } else if (focusedId === id) {
        minimizeWindow(id);
      } else {
        focusWindow(id);
      }
    },
    [focusWindow, minimizeWindow, focusedId],
  );

  const handleTaskbarItemContextMenu = useCallback(
    (e: React.MouseEvent, windowId: string, windowState: string) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          id: 'focus',
          label: 'Focus',
          action: () => focusWindow(windowId),
        },
        {
          id: 'minimize',
          label: windowState === 'minimized' ? 'Restore' : 'Minimize',
          action: () => windowState === 'minimized'
            ? focusWindow(windowId)
            : minimizeWindow(windowId),
        },
        { id: 'sep', label: '', separator: true },
        {
          id: 'close',
          label: 'Close',
          action: () => closeWindow(windowId),
        },
      ];

      openContextMenu({ x: e.clientX, y: e.clientY }, items);
    },
    [focusWindow, minimizeWindow, closeWindow, openContextMenu],
  );

  return (
    <nav
      role="toolbar"
      aria-label="Taskbar"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--taskbar-height)',
        background: 'var(--taskbar-bg)',
        borderTop: '1px solid var(--taskbar-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: 4,
        zIndex: 9999,
      }}
    >
      {/* App launcher button */}
      <button
        className="taskbar-launcher-btn"
        onClick={onOpenLauncher}
        aria-label="Open App Launcher (Cmd+K)"
        title="Open App Launcher (Cmd+K)"
      >
        +
      </button>

      <div
        role="separator"
        style={{
          width: 1,
          height: 24,
          background: 'var(--taskbar-border)',
          margin: '0 4px',
        }}
      />

      {/* Running apps */}
      {windows.map((w) => (
        <button
          key={w.id}
          className="taskbar-running-btn"
          onClick={() => handleTaskbarItemClick(w.id, w.state)}
          onContextMenu={(e) => handleTaskbarItemContextMenu(e, w.id, w.state)}
          aria-label={`${w.title}${focusedId === w.id ? ' (active)' : ''}${w.state === 'minimized' ? ' (minimized)' : ''}`}
          aria-pressed={focusedId === w.id}
          title={w.title}
          style={{
            background:
              focusedId === w.id
                ? 'var(--taskbar-item-bg-active)'
                : 'var(--taskbar-item-bg)',
            opacity: w.state === 'minimized' ? 0.6 : 1,
          }}
        >
          {w.metadata.icon && <span>{w.metadata.icon}</span>}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {w.title}
          </span>
          {focusedId === w.id && (
            <div
              style={{
                position: 'absolute',
                bottom: 2,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 16,
                height: 3,
                borderRadius: 2,
                background: 'var(--taskbar-active-indicator)',
              }}
            />
          )}
        </button>
      ))}

      <StatusBarWidgets />
    </nav>
  );
}
