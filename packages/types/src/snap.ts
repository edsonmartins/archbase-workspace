// ============================================================
// Window Snap Types
// ============================================================

export type SnapPosition =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'maximize';

export interface SnapZone {
  position: SnapPosition;
  /** The window bounds when snapped to this zone */
  bounds: { x: number; y: number; width: number; height: number };
  /** The cursor hit-detection area that triggers this zone */
  hitArea: { x: number; y: number; width: number; height: number };
}
