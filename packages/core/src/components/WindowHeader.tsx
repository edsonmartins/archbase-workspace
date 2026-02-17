import { useCallback } from 'react';
import { useWindow, useWindowsStore, useContextMenuStore, useCollaborationStore, useSharedWindows } from '@archbase/workspace-state';
import type { ContextMenuItem } from '@archbase/workspace-types';
import { LAYOUT } from '../constants';
import { CollaborationBadge } from './CollaborationBadge';

interface WindowHeaderProps {
  windowId: string;
  isFocused: boolean;
  onDragPointerDown: (e: React.PointerEvent) => void;
}

export function WindowHeader({ windowId, isFocused, onDragPointerDown }: WindowHeaderProps) {
  const window = useWindow(windowId);
  const closeWindow = useWindowsStore((s) => s.closeWindow);
  const minimizeWindow = useWindowsStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowsStore((s) => s.toggleMaximize);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    closeWindow(windowId);
  }, [closeWindow, windowId]);

  const handleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    minimizeWindow(windowId);
  }, [minimizeWindow, windowId]);

  const handleMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMaximize(
      windowId,
      globalThis.innerWidth,
      globalThis.innerHeight,
      LAYOUT.TASKBAR_HEIGHT,
    );
  }, [toggleMaximize, windowId]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleMaximize(e);
  }, [handleMaximize]);

  const openContextMenu = useContextMenuStore((s) => s.open);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window) return;

    const items: ContextMenuItem[] = [];

    if (window.flags.minimizable) {
      items.push({
        id: 'minimize',
        label: window.state === 'minimized' ? 'Restore' : 'Minimize',
        action: () => window.state === 'minimized'
          ? useWindowsStore.getState().focusWindow(windowId)
          : minimizeWindow(windowId),
      });
    }

    if (window.flags.maximizable) {
      items.push({
        id: 'maximize',
        label: window.state === 'maximized' ? 'Restore' : 'Maximize',
        action: () => toggleMaximize(
          windowId,
          globalThis.innerWidth,
          globalThis.innerHeight,
          LAYOUT.TASKBAR_HEIGHT,
        ),
      });
    }

    // Collaboration: Share Window
    const collabState = useCollaborationStore.getState();
    if (collabState.connected) {
      const isShared = collabState.sharedWindows.has(windowId);
      items.push({ id: 'sep-share', label: '', separator: true });
      items.push({
        id: 'share-window',
        label: isShared ? 'Stop Sharing' : 'Share Window',
        action: () => {
          if (isShared) {
            collabState.removeSharedWindow(windowId);
          } else {
            collabState.addSharedWindow({
              windowId,
              sharedBy: collabState.currentUser?.id ?? '',
              mode: 'edit',
              participants: [collabState.currentUser?.id ?? ''],
            });
          }
        },
      });
    }

    if (window.flags.closable) {
      items.push({ id: 'sep-close', label: '', separator: true });
      items.push({
        id: 'close',
        label: 'Close',
        shortcut: 'Cmd+W',
        action: () => closeWindow(windowId),
      });
    }

    openContextMenu({ x: e.clientX, y: e.clientY }, items);
  }, [window, windowId, minimizeWindow, toggleMaximize, closeWindow, openContextMenu]);

  if (!window) return null;

  return (
    <div
      role="toolbar"
      aria-label={`${window.title} window controls`}
      onPointerDown={onDragPointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{
        height: 'var(--window-header-height)',
        background: isFocused ? 'var(--window-header-bg-active)' : 'var(--window-header-bg)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: 8,
        cursor: 'grab',
        flexShrink: 0,
        borderBottom: '1px solid var(--window-border-color)',
      }}
    >
      {/* Window control buttons */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {window.flags.closable && (
          <button
            className="window-ctrl-btn window-ctrl-close"
            onClick={handleClose}
            aria-label="Close window"
            title="Close"
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
        {window.flags.minimizable && (
          <button
            className="window-ctrl-btn window-ctrl-minimize"
            onClick={handleMinimize}
            aria-label="Minimize window"
            title="Minimize"
          >
            <span aria-hidden="true">−</span>
          </button>
        )}
        {window.flags.maximizable && (
          <button
            className="window-ctrl-btn window-ctrl-maximize"
            onClick={handleMaximize}
            aria-label={window.state === 'maximized' ? 'Restore window' : 'Maximize window'}
            title={window.state === 'maximized' ? 'Restore' : 'Maximize'}
          >
            <span aria-hidden="true">{window.state === 'maximized' ? '⧉' : '□'}</span>
          </button>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: isFocused ? 'var(--window-title-color-active)' : 'var(--window-title-color)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {window.metadata.icon && (
          <span aria-hidden="true">{window.metadata.icon}</span>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{window.title}</span>
        <CollaborationBadge windowId={windowId} />
      </div>
    </div>
  );
}
