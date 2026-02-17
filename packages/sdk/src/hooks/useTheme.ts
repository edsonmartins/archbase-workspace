import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '@archbase/workspace-state';

type ThemeMode = 'dark' | 'light' | 'auto';

export interface UseThemeResult {
  /** Current theme mode setting. */
  theme: ThemeMode;
  /** Change the workspace theme. */
  setTheme: (theme: ThemeMode) => void;
  /** Whether the current effective theme is dark. */
  isDark: boolean;
  /** Resolved effective theme (kept for backward compatibility). */
  resolvedTheme: 'dark' | 'light';
}

/**
 * Read the current workspace theme reactively.
 * Returns the raw preference, a setter, an `isDark` boolean,
 * and the resolved theme (`'dark'` | `'light'`).
 *
 * Listens for OS theme preference changes when mode is `'auto'`.
 *
 * Remote apps can use this to conditionally style content that lives
 * outside the CSS custom-property system (e.g. Canvas, SVG, charts).
 */
export function useTheme(): UseThemeResult {
  const theme = useSettingsStore(
    (s) => (s.getValue<string>('workspace.theme') ?? 'dark') as ThemeMode,
  );

  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true,
  );

  // Listen for OS theme preference changes
  useEffect(() => {
    const mq = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'dark' | 'light' =
    theme === 'auto'
      ? systemPrefersDark
        ? 'dark'
        : 'light'
      : theme === 'light'
        ? 'light'
        : 'dark';

  const setTheme = useCallback((value: ThemeMode) => {
    useSettingsStore.getState().setValue('workspace.theme', value);
  }, []);

  const isDark = resolvedTheme === 'dark';

  return { theme, setTheme, isDark, resolvedTheme };
}
