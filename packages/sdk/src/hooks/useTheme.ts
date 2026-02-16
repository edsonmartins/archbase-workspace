import { useEffect, useState } from 'react';
import { useSettingsStore } from '@archbase/workspace-state';

/**
 * Read the current workspace theme reactively.
 * Returns the raw preference (`'dark'` | `'light'` | `'auto'`) and
 * the resolved theme (`'dark'` | `'light'`).
 *
 * Listens for OS theme preference changes when mode is `'auto'`.
 *
 * Remote apps can use this to conditionally style content that lives
 * outside the CSS custom-property system (e.g. Canvas, SVG, charts).
 */
export function useTheme(): { theme: string; resolvedTheme: 'dark' | 'light' } {
  const theme = useSettingsStore(
    (s) => (s.getValue<string>('workspace.theme') ?? 'dark') as string,
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

  return { theme, resolvedTheme };
}
