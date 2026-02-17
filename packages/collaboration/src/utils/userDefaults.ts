import type { CollaborationUser } from '@archbase/workspace-types';

/**
 * 8-color palette for cursor/presence colors.
 * Colors chosen for high contrast on both light and dark backgrounds.
 */
export const CURSOR_PALETTE = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
] as const;

/**
 * Resolve a partial user into a complete CollaborationUser.
 * Generates random id, display name, and color if not provided.
 */
export function resolveUser(partial?: Partial<CollaborationUser>): CollaborationUser {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    displayName: partial?.displayName ?? `User ${Math.floor(Math.random() * 1000)}`,
    color: partial?.color ?? CURSOR_PALETTE[Math.floor(Math.random() * CURSOR_PALETTE.length)],
    avatar: partial?.avatar,
  };
}

/**
 * Pick a color from the palette by index (wraps around).
 */
export function pickColor(index: number): string {
  return CURSOR_PALETTE[index % CURSOR_PALETTE.length];
}
