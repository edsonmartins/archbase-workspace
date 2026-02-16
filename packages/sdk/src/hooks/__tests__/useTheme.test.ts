import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '@archbase/workspace-state';

// We test the underlying logic of useTheme without renderHook,
// since the SDK package does not depend on @testing-library/react.
// The hook's logic is: read setting → resolve based on matchMedia.

function resetSettingsStore() {
  useSettingsStore.setState({ values: new Map() });
}

function registerThemeSetting(value: string) {
  useSettingsStore.getState().registerSettings('workspace', [
    { key: 'workspace.theme', type: 'string', default: 'dark', description: '' },
  ]);
  useSettingsStore.getState().setValue('workspace.theme', value);
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

/** Replicates the resolve logic from useTheme for unit-testing without React. */
function resolveTheme(): { theme: string; resolvedTheme: 'dark' | 'light' } {
  const theme = (useSettingsStore.getState().getValue<string>('workspace.theme') ?? 'dark') as string;
  const resolvedTheme: 'dark' | 'light' =
    theme === 'auto'
      ? ((globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true) ? 'dark' : 'light')
      : theme === 'light'
        ? 'light'
        : 'dark';
  return { theme, resolvedTheme };
}

describe('useTheme (logic)', () => {
  beforeEach(() => {
    resetSettingsStore();
    mockMatchMedia(true);
  });

  it('returns dark by default when no setting is registered', () => {
    const { theme, resolvedTheme } = resolveTheme();
    expect(theme).toBe('dark');
    expect(resolvedTheme).toBe('dark');
  });

  it('returns light when setting is "light"', () => {
    registerThemeSetting('light');
    const { theme, resolvedTheme } = resolveTheme();
    expect(theme).toBe('light');
    expect(resolvedTheme).toBe('light');
  });

  it('auto resolves to dark when OS prefers dark', () => {
    mockMatchMedia(true);
    registerThemeSetting('auto');
    const { theme, resolvedTheme } = resolveTheme();
    expect(theme).toBe('auto');
    expect(resolvedTheme).toBe('dark');
  });

  it('auto resolves to light when OS prefers light', () => {
    mockMatchMedia(false);
    registerThemeSetting('auto');
    const { theme, resolvedTheme } = resolveTheme();
    expect(theme).toBe('auto');
    expect(resolvedTheme).toBe('light');
  });

  it('treats unknown values as dark', () => {
    registerThemeSetting('something-else');
    const { resolvedTheme } = resolveTheme();
    expect(resolvedTheme).toBe('dark');
  });

  it('treats empty string as dark', () => {
    registerThemeSetting('');
    const { resolvedTheme } = resolveTheme();
    expect(resolvedTheme).toBe('dark');
  });
});
