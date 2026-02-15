import { useCallback, useRef } from 'react';
import { useWindow, useWindowsStore, useFocusedWindowId } from '@archbase/workspace-state';
import type { SnapZone } from '@archbase/workspace-types';
import { WindowHeader } from './WindowHeader';
import { RemoteApp } from './RemoteApp';
import { useDrag } from '../hooks/useDrag';
import { useResize, type ResizeDirection } from '../hooks/useResize';

interface WindowProps {
  windowId: string;
  onSnapPreview?: (zone: SnapZone | null) => void;
}

const RESIZE_DIRECTIONS: ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

const RESIZE_CURSORS: Record<ResizeDirection, string> = {
  n: 'n-resize',
  ne: 'ne-resize',
  e: 'e-resize',
  se: 'se-resize',
  s: 's-resize',
  sw: 'sw-resize',
  w: 'w-resize',
  nw: 'nw-resize',
};

const RESIZE_LABELS: Record<ResizeDirection, string> = {
  n: 'Resize north',
  ne: 'Resize north-east',
  e: 'Resize east',
  se: 'Resize south-east',
  s: 'Resize south',
  sw: 'Resize south-west',
  w: 'Resize west',
  nw: 'Resize north-west',
};

const RESIZE_STYLES: Record<ResizeDirection, React.CSSProperties> = {
  n: { top: 0, left: 'var(--resize-handle-size)', right: 'var(--resize-handle-size)', height: 'var(--resize-handle-size)' },
  ne: { top: 0, right: 0, width: 'var(--resize-handle-size)', height: 'var(--resize-handle-size)' },
  e: { top: 'var(--resize-handle-size)', right: 0, bottom: 'var(--resize-handle-size)', width: 'var(--resize-handle-size)' },
  se: { bottom: 0, right: 0, width: 'var(--resize-handle-size)', height: 'var(--resize-handle-size)' },
  s: { bottom: 0, left: 'var(--resize-handle-size)', right: 'var(--resize-handle-size)', height: 'var(--resize-handle-size)' },
  sw: { bottom: 0, left: 0, width: 'var(--resize-handle-size)', height: 'var(--resize-handle-size)' },
  w: { top: 'var(--resize-handle-size)', left: 0, bottom: 'var(--resize-handle-size)', width: 'var(--resize-handle-size)' },
  nw: { top: 0, left: 0, width: 'var(--resize-handle-size)', height: 'var(--resize-handle-size)' },
};

export function Window({ windowId, onSnapPreview }: WindowProps) {
  const window = useWindow(windowId);
  const focusedId = useFocusedWindowId();
  const focusWindow = useWindowsStore((s) => s.focusWindow);
  const windowRef = useRef<HTMLDivElement>(null);
  const isFocused = focusedId === windowId;

  const { onPointerDown: onDragPointerDown } = useDrag(windowId, { onSnapPreview });
  const { getResizeHandleProps } = useResize(windowId);

  const handleWindowPointerDown = useCallback(() => {
    if (!isFocused) {
      focusWindow(windowId);
    }
  }, [isFocused, focusWindow, windowId]);

  if (!window) return null;

  const isMaximized = window.state === 'maximized';

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-label={window.title}
      onPointerDown={handleWindowPointerDown}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${window.position.x}px, ${window.position.y}px, 0)`,
        width: window.size.width,
        height: window.size.height,
        zIndex: window.zIndex,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMaximized ? 0 : 'var(--window-border-radius)',
        border: `1px solid var(--window-border-color)`,
        boxShadow: isFocused ? 'var(--window-shadow-active)' : 'var(--window-shadow)',
        overflow: 'hidden',
        transition: isMaximized ? 'transform 0.15s ease, width 0.15s ease, height 0.15s ease' : undefined,
      }}
    >
      <WindowHeader
        windowId={windowId}
        isFocused={isFocused}
        onDragPointerDown={onDragPointerDown}
      />
      <div
        style={{
          flex: 1,
          background: 'var(--window-body-bg)',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <RemoteApp appId={window.appId} windowId={windowId} />
      </div>

      {/* Resize handles */}
      {window.flags.resizable && !isMaximized && RESIZE_DIRECTIONS.map((dir) => (
        <div
          key={dir}
          {...getResizeHandleProps(dir)}
          role="separator"
          aria-label={RESIZE_LABELS[dir]}
          {...(dir === 'e' || dir === 'w' ? { 'aria-orientation': 'vertical' as const } :
               dir === 'n' || dir === 's' ? { 'aria-orientation': 'horizontal' as const } :
               {})}
          style={{
            position: 'absolute',
            ...RESIZE_STYLES[dir],
            cursor: RESIZE_CURSORS[dir],
            zIndex: 1,
          }}
        />
      ))}
    </div>
  );
}
