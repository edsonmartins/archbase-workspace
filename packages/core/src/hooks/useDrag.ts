import { useCallback, useRef, useEffect } from 'react';
import { useWindowsStore, useWindow } from '@archbase/workspace-state';
import type { SnapZone } from '@archbase/workspace-types';
import { LAYOUT } from '../constants';
import { computeSnapZones, getSnapZoneAtPosition } from '../utils/computeSnapZones';

export interface UseDragOptions {
  onSnapPreview?: (zone: SnapZone | null) => void;
}

export function useDrag(windowId: string, options?: UseDragOptions) {
  const window = useWindow(windowId);
  const updatePosition = useWindowsStore((s) => s.updatePosition);
  const setBounds = useWindowsStore((s) => s.setBounds);
  const focusWindow = useWindowsStore((s) => s.focusWindow);

  const dragState = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    rafId: number | null;
    activeSnapZone: SnapZone | null;
  } | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Clean up listeners on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only left button
      if (e.button !== 0) return;
      // Don't drag if clicking buttons
      if ((e.target as HTMLElement).closest('button')) return;
      // Don't drag if maximized
      if (window?.state === 'maximized') return;

      e.preventDefault();

      focusWindow(windowId);

      const currentWindow = useWindowsStore.getState().windows.get(windowId);
      if (!currentWindow) return;

      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: currentWindow.position.x,
        startPosY: currentWindow.position.y,
        rafId: null,
        activeSnapZone: null,
      };

      // Force grabbing cursor on body during drag (ADR-004)
      document.body.style.cursor = 'grabbing';

      // Precompute snap zones for this drag session
      const snapZones = computeSnapZones(
        globalThis.innerWidth,
        globalThis.innerHeight,
        LAYOUT.TASKBAR_HEIGHT,
      );

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!dragState.current) return;

        if (dragState.current.rafId !== null) {
          cancelAnimationFrame(dragState.current.rafId);
        }

        dragState.current.rafId = requestAnimationFrame(() => {
          if (!dragState.current) return;

          const dx = moveEvent.clientX - dragState.current.startX;
          const dy = moveEvent.clientY - dragState.current.startY;

          let newX = dragState.current.startPosX + dx;
          let newY = dragState.current.startPosY + dy;

          // Constrain to viewport (keep at least minVisible px visible)
          const currentWindow = useWindowsStore.getState().windows.get(windowId);
          if (currentWindow) {
            newX = Math.max(
              -(currentWindow.size.width - LAYOUT.MIN_VISIBLE_AREA),
              Math.min(newX, globalThis.innerWidth - LAYOUT.MIN_VISIBLE_AREA),
            );
            newY = Math.max(
              0,
              Math.min(newY, globalThis.innerHeight - LAYOUT.TASKBAR_HEIGHT - LAYOUT.WINDOW_HEADER_HEIGHT),
            );
          }

          updatePosition(windowId, { x: newX, y: newY });

          // Snap zone detection
          const zone = getSnapZoneAtPosition(moveEvent.clientX, moveEvent.clientY, snapZones);
          dragState.current.activeSnapZone = zone;
          optionsRef.current?.onSnapPreview?.(zone);
        });
      };

      const onPointerUp = () => {
        if (dragState.current?.rafId != null) {
          cancelAnimationFrame(dragState.current.rafId);
        }

        // Commit snap if active
        const snapZone = dragState.current?.activeSnapZone;
        if (snapZone) {
          setBounds(windowId, snapZone.bounds);
        }

        // Clear snap preview
        optionsRef.current?.onSnapPreview?.(null);

        dragState.current = null;
        document.body.style.cursor = '';
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        cleanupRef.current = null;
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);

      // Store cleanup so useEffect can call it on unmount
      cleanupRef.current = () => {
        if (dragState.current?.rafId != null) {
          cancelAnimationFrame(dragState.current.rafId);
        }
        optionsRef.current?.onSnapPreview?.(null);
        dragState.current = null;
        document.body.style.cursor = '';
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };
    },
    [windowId, window?.state, updatePosition, setBounds, focusWindow],
  );

  return { onPointerDown };
}
