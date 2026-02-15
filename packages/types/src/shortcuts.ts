// ============================================================
// Keyboard Shortcut Types
// ============================================================

export interface KeyCombo {
  /** The key, lowercase: 'k', 'escape', 'arrowup', 'f1' */
  key: string;
  ctrl?: boolean;
  /** Cmd on Mac */
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export type ShortcutScope = 'global' | 'window' | 'app';

export interface Shortcut {
  /** Unique identifier, e.g. 'workspace.openLauncher' */
  id: string;
  combo: KeyCombo;
  /** Human-readable label, e.g. 'Open App Launcher' */
  label: string;
  scope: ShortcutScope;
  enabled: boolean;
}
