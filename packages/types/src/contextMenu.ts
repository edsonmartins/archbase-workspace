// ============================================================
// Context Menu Types
// ============================================================

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  /** Display-only shortcut hint, e.g. "Cmd+W" */
  shortcut?: string;
  disabled?: boolean;
  /** When true, renders as a separator line instead of a clickable item */
  separator?: boolean;
  action?: () => void;
}
