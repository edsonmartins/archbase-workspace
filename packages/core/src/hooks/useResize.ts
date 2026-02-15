import { useCallback, useRef, useEffect } from 'react';
import { useWindowsStore } from '@archbase/workspace-state';

export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export function useResize(windowId: string) {
  const setBounds = useWindowsStore((s) => s.setBounds);
  const focusWindow = useWindowsStore((s) => s.focusWindow);

  const resizeState = useRef<{
    direction: ResizeDirection;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    startWidth: number;
    startHeight: number;
    rafId: number | null;
  } | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  // Clean up listeners on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const onResizePointerDown = useCallback(
    (direction: ResizeDirection, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      focusWindow(windowId);

      const currentWindow = useWindowsStore.getState().windows.get(windowId);
      if (!currentWindow) return;

      resizeState.current = {
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: currentWindow.position.x,
        startPosY: currentWindow.position.y,
        startWidth: currentWindow.size.width,
        startHeight: currentWindow.size.height,
        rafId: null,
      };

      // Force directional cursor on body during resize (ADR-004)
      const cursorMap: Record<ResizeDirection, string> = {
        n: 'n-resize', ne: 'ne-resize', e: 'e-resize', se: 'se-resize',
        s: 's-resize', sw: 'sw-resize', w: 'w-resize', nw: 'nw-resize',
      };
      document.body.style.cursor = cursorMap[direction];

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!resizeState.current) return;

        if (resizeState.current.rafId !== null) {
          cancelAnimationFrame(resizeState.current.rafId);
        }

        resizeState.current.rafId = requestAnimationFrame(() => {
          if (!resizeState.current) return;

          const dx = moveEvent.clientX - resizeState.current.startX;
          const dy = moveEvent.clientY - resizeState.current.startY;
          const dir = resizeState.current.direction;

          let newX = resizeState.current.startPosX;
          let newY = resizeState.current.startPosY;
          let newWidth = resizeState.current.startWidth;
          let newHeight = resizeState.current.startHeight;

          // East edge
          if (dir.includes('e')) {
            newWidth = resizeState.current.startWidth + dx;
          }
          // West edge
          if (dir.includes('w')) {
            newWidth = resizeState.current.startWidth - dx;
            newX = resizeState.current.startPosX + dx;
          }
          // South edge
          if (dir.includes('s')) {
            newHeight = resizeState.current.startHeight + dy;
          }
          // North edge
          if (dir.includes('n')) {
            newHeight = resizeState.current.startHeight - dy;
            newY = resizeState.current.startPosY + dy;
          }

          // Adjust position if clamped on west/north sides
          // setBounds will handle constraint clamping internally
          const currentWindow = useWindowsStore.getState().windows.get(windowId);
          if (!currentWindow) return;

          const minW = currentWindow.constraints.minWidth;
          const minH = currentWindow.constraints.minHeight;
          const maxW = currentWindow.constraints.maxWidth;
          const maxH = currentWindow.constraints.maxHeight;

          const clampedWidth = Math.max(minW, Math.min(newWidth, maxW));
          const clampedHeight = Math.max(minH, Math.min(newHeight, maxH));

          if (dir.includes('w')) {
            const actualDw = resizeState.current.startWidth - clampedWidth;
            newX = resizeState.current.startPosX + actualDw;
          }
          if (dir.includes('n')) {
            const actualDh = resizeState.current.startHeight - clampedHeight;
            newY = resizeState.current.startPosY + actualDh;
          }

          setBounds(windowId, { x: newX, y: newY, width: clampedWidth, height: clampedHeight });
        });
      };

      const onPointerUp = () => {
        if (resizeState.current?.rafId != null) {
          cancelAnimationFrame(resizeState.current.rafId);
        }
        resizeState.current = null;
        document.body.style.cursor = '';
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        cleanupRef.current = null;
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);

      // Store cleanup so useEffect can call it on unmount
      cleanupRef.current = () => {
        if (resizeState.current?.rafId != null) {
          cancelAnimationFrame(resizeState.current.rafId);
        }
        resizeState.current = null;
        document.body.style.cursor = '';
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };
    },
    [windowId, setBounds, focusWindow],
  );

  const getResizeHandleProps = useCallback(
    (direction: ResizeDirection) => ({
      onPointerDown: (e: React.PointerEvent) => onResizePointerDown(direction, e),
    }),
    [onResizePointerDown],
  );

  return { getResizeHandleProps };
}
