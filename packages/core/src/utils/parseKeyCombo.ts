import type { KeyCombo } from '@archbase/workspace-types';

const MODIFIER_MAP: Record<string, keyof Omit<KeyCombo, 'key'>> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
};

/**
 * Parse a shortcut string like "Cmd+K" or "Ctrl+Shift+N" into a KeyCombo.
 * Case-insensitive. Supports: Cmd/Meta, Ctrl/Control, Alt/Option, Shift.
 * Throws if the combo string is empty or contains no non-modifier key.
 */
export function parseKeyCombo(combo: string): KeyCombo {
  const trimmed = combo.trim();
  if (!trimmed) {
    throw new Error('parseKeyCombo: combo string cannot be empty');
  }

  const parts = trimmed.split('+').map((p) => p.trim().toLowerCase()).filter(Boolean);
  const result: KeyCombo = { key: '' };

  for (const part of parts) {
    const modifier = MODIFIER_MAP[part];
    if (modifier) {
      result[modifier] = true;
    } else {
      if (result.key) {
        throw new Error(`parseKeyCombo: combo "${combo}" has multiple non-modifier keys`);
      }
      result.key = part;
    }
  }

  if (!result.key) {
    throw new Error(`parseKeyCombo: combo "${combo}" has no non-modifier key`);
  }

  return result;
}

/**
 * Check if a KeyboardEvent matches a KeyCombo exactly.
 * Ensures no extra modifiers are pressed beyond what the combo specifies.
 */
export function matchesKeyCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  const eventKey = event.key.toLowerCase();
  if (eventKey !== combo.key) return false;

  // Check each modifier matches exactly (no extra modifiers allowed)
  if (!!combo.ctrl !== event.ctrlKey) return false;
  if (!!combo.meta !== event.metaKey) return false;
  if (!!combo.alt !== event.altKey) return false;
  if (!!combo.shift !== event.shiftKey) return false;

  return true;
}

export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Format a KeyCombo for display. Uses platform-appropriate modifier names.
 * Mac: Cmd+K, Others: Ctrl+K
 */
export function formatKeyCombo(combo: KeyCombo): string {
  const parts: string[] = [];

  if (IS_MAC) {
    if (combo.ctrl) parts.push('Ctrl');
    if (combo.meta) parts.push('Cmd');
  } else {
    // On non-Mac, both ctrl and meta map to Ctrl — avoid duplicates
    if (combo.ctrl || combo.meta) parts.push('Ctrl');
  }
  if (combo.alt) parts.push(IS_MAC ? 'Option' : 'Alt');
  if (combo.shift) parts.push('Shift');

  // Capitalize the key for display
  if (combo.key) {
    const displayKey = combo.key.length === 1
      ? combo.key.toUpperCase()
      : combo.key.charAt(0).toUpperCase() + combo.key.slice(1);
    parts.push(displayKey);
  }

  return parts.join('+');
}
