import { useEffect, useState } from 'react';
import { useSettingsStore } from '@archbase/workspace-state';

type ResolvedTheme = 'dark' | 'light';

/**
 * Reads the `workspace.theme` setting and applies the resolved theme
 * to `document.documentElement` via a `data-theme` attribute.
 *
 * Supports three values:
 * - `'dark'`  – always dark
 * - `'light'` – always light
 * - `'auto'`  – follows the OS preference via `prefers-color-scheme`
 */
export function useThemeApplier(): { theme: string; resolvedTheme: ResolvedTheme } {
  const themePref = useSettingsStore(
    (s) => (s.getValue<string>('workspace.theme') ?? 'dark') as string,
  );

  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true,
  );

  // Listen for OS theme changes
  useEffect(() => {
    const mq = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: ResolvedTheme =
    themePref === 'auto'
      ? systemPrefersDark
        ? 'dark'
        : 'light'
      : themePref === 'light'
        ? 'light'
        : 'dark';

  // Apply to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  return { theme: themePref, resolvedTheme };
}
