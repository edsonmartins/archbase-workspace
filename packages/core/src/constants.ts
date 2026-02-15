/**
 * Shared layout constants used across core components.
 * IMPORTANT: TASKBAR_HEIGHT and WINDOW_HEADER_HEIGHT must stay in sync
 * with --taskbar-height and --window-header-height in global.css.
 */
export const LAYOUT = {
  /** Height of the taskbar in pixels — must match --taskbar-height in global.css */
  TASKBAR_HEIGHT: 48,
  /** Height of a window header/title bar in pixels — must match --window-header-height in global.css */
  WINDOW_HEADER_HEIGHT: 36,
  /** Minimum visible area of a window when dragging near edges (px) */
  MIN_VISIBLE_AREA: 100,
} as const;
