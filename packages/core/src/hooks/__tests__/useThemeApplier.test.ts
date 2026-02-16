import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSettingsStore } from '@archbase/workspace-state';

// ── Helpers ───────────────────────────────────────────────

let changeHandler: ((e: { matches: boolean }) => void) | null = null;
let matchesValue = true;

function mockMatchMedia(matches: boolean) {
  matchesValue = matches;
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchesValue,
      media: query,
      addEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
        if (changeHandler === handler) changeHandler = null;
      }),
    })),
  });
}

function resetSettingsStore() {
  useSettingsStore.setState({ values: new Map() });
}

function registerThemeSetting(value: string) {
  useSettingsStore.getState().registerSettings('workspace', [
    { key: 'workspace.theme', type: 'string', default: 'dark', description: '' },
  ]);
  useSettingsStore.getState().setValue('workspace.theme', value);
}

/**
 * Replicates the resolve logic from useThemeApplier for unit-testing
 * without React renderHook (core doesn't depend on @testing-library/react).
 */
function resolveTheme(): { theme: string; resolvedTheme: 'dark' | 'light' } {
  const themePref = (useSettingsStore.getState().getValue<string>('workspace.theme') ?? 'dark') as string;
  const resolvedTheme: 'dark' | 'light' =
    themePref === 'auto'
      ? matchesValue
        ? 'dark'
        : 'light'
      : themePref === 'light'
        ? 'light'
        : 'dark';
  return { theme: themePref, resolvedTheme };
}

function applyTheme(resolvedTheme: string) {
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}

// ── Tests ─────────────────────────────────────────────────

describe('useThemeApplier (logic)', () => {
  beforeEach(() => {
    resetSettingsStore();
    mockMatchMedia(true); // OS prefers dark
    document.documentElement.removeAttribute('data-theme');
    changeHandler = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves to dark by default (no setting registered)', () => {
    const { theme, resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);

    expect(theme).toBe('dark');
    expect(resolvedTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('resolves to light when setting is "light"', () => {
    registerThemeSetting('light');
    const { resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);

    expect(resolvedTheme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('resolves to dark when setting is "dark"', () => {
    registerThemeSetting('dark');
    const { resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);

    expect(resolvedTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('auto mode: resolves to dark when OS prefers dark', () => {
    mockMatchMedia(true);
    registerThemeSetting('auto');
    const { theme, resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);

    expect(theme).toBe('auto');
    expect(resolvedTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('auto mode: resolves to light when OS prefers light', () => {
    mockMatchMedia(false);
    registerThemeSetting('auto');
    const { theme, resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);

    expect(theme).toBe('auto');
    expect(resolvedTheme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('updates DOM when setting changes from dark to light', () => {
    registerThemeSetting('dark');
    let { resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Change setting
    useSettingsStore.getState().setValue('workspace.theme', 'light');
    ({ resolvedTheme } = resolveTheme());
    applyTheme(resolvedTheme);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('auto mode: resolves when matchMedia changes from dark to light', () => {
    mockMatchMedia(true);
    registerThemeSetting('auto');
    let { resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Simulate OS switching to light
    mockMatchMedia(false);
    ({ resolvedTheme } = resolveTheme());
    applyTheme(resolvedTheme);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('treats unknown values as dark', () => {
    registerThemeSetting('invalid-value');
    const { resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);

    expect(resolvedTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('treats empty string as dark', () => {
    registerThemeSetting('');
    const { resolvedTheme } = resolveTheme();
    applyTheme(resolvedTheme);

    expect(resolvedTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
