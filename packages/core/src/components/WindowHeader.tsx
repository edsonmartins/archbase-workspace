import { useCallback } from 'react';
import { useWindow, useWindowsStore } from '@archbase/workspace-state';
import { LAYOUT } from '../constants';

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

  if (!window) return null;

  return (
    <div
      role="toolbar"
      aria-label={`${window.title} window controls`}
      onPointerDown={onDragPointerDown}
      onDoubleClick={handleDoubleClick}
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
            ✕
          </button>
        )}
        {window.flags.minimizable && (
          <button
            className="window-ctrl-btn window-ctrl-minimize"
            onClick={handleMinimize}
            aria-label="Minimize window"
            title="Minimize"
          >
            −
          </button>
        )}
        {window.flags.maximizable && (
          <button
            className="window-ctrl-btn window-ctrl-maximize"
            onClick={handleMaximize}
            aria-label={window.state === 'maximized' ? 'Restore window' : 'Maximize window'}
            title={window.state === 'maximized' ? 'Restore' : 'Maximize'}
          >
            {window.state === 'maximized' ? '⧉' : '□'}
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
        }}
      >
        {window.metadata.icon && (
          <span style={{ marginRight: 6 }}>{window.metadata.icon}</span>
        )}
        {window.title}
      </div>
    </div>
  );
}
