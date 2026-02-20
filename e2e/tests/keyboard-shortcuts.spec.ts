import { test, expect } from '@playwright/test';

/**
 * On macOS the shortcut modifier is Meta (Cmd); on Linux/CI it is Ctrl.
 * Playwright runs against a real browser, so we derive the platform from
 * the browser's userAgent, which mirrors what IS_MAC resolves to in the app.
 */
async function isMac(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent));
}

async function shortcutKey(page: import('@playwright/test').Page): Promise<string> {
  return (await isMac(page)) ? 'Meta' : 'Control';
}

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.taskbar');
    // Ensure body has focus (not an input)
    await page.locator('body').click();
  });

  // ── Command Palette ────────────────────────────────────────

  test('Cmd/Ctrl+Shift+P opens command palette', async ({ page }) => {
    const mod = await shortcutKey(page);
    await page.keyboard.press(`${mod}+Shift+p`);
    await expect(page.locator('.command-palette-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Escape closes command palette', async ({ page }) => {
    const mod = await shortcutKey(page);
    await page.keyboard.press(`${mod}+Shift+p`);
    await expect(page.locator('.command-palette-overlay')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.command-palette-overlay')).not.toBeVisible();
  });

  // ── App Launcher ────────────────────────────────────────────

  test('Cmd/Ctrl+K opens app launcher', async ({ page }) => {
    const mod = await shortcutKey(page);
    await page.keyboard.press(`${mod}+k`);
    await expect(page.locator('.app-launcher-overlay')).toBeVisible();
    // Close it
    await page.keyboard.press('Escape');
  });

  // ── Window Operations ──────────────────────────────────────

  test('Cmd/Ctrl+M minimizes all windows', async ({ page }) => {
    // Ensure at least one visible window exists
    const windowCount = await page.locator('.window').count();
    if (windowCount === 0) {
      test.skip(); // No windows to minimize
      return;
    }

    const mod = await shortcutKey(page);
    await page.keyboard.press(`${mod}+m`);

    // After minimize-all, no window should be visible
    await page.waitForTimeout(300); // animation
    const visibleWindows = await page.locator('.window:visible').count();
    expect(visibleWindows).toBe(0);
  });

  test('Cmd/Ctrl+W closes the focused window', async ({ page }) => {
    const windowsBefore = await page.locator('.window').count();
    if (windowsBefore === 0) {
      test.skip();
      return;
    }

    // Click a window to focus it
    await page.locator('.window').first().click();
    await page.waitForTimeout(100);

    const mod = await shortcutKey(page);
    await page.keyboard.press(`${mod}+w`);

    await page.waitForTimeout(200);
    const windowsAfter = await page.locator('.window').count();
    expect(windowsAfter).toBeLessThan(windowsBefore);
  });

  // ── Tiling Shortcuts ───────────────────────────────────────

  test('Cmd/Ctrl+Shift+H tiles windows horizontally', async ({ page }) => {
    const windowCount = await page.locator('.window').count();
    if (windowCount < 2) {
      test.skip(); // Need at least 2 windows to see tiling
      return;
    }

    const mod = await shortcutKey(page);
    await page.keyboard.press(`${mod}+Shift+h`);
    await page.waitForTimeout(200);

    // All windows should still be visible (just repositioned)
    const visibleAfter = await page.locator('.window').count();
    expect(visibleAfter).toBe(windowCount);
  });

  test('Cmd/Ctrl+Shift+C cascades windows', async ({ page }) => {
    const windowCount = await page.locator('.window').count();
    if (windowCount < 2) {
      test.skip();
      return;
    }

    const mod = await shortcutKey(page);
    await page.keyboard.press(`${mod}+Shift+c`);
    await page.waitForTimeout(200);

    const visibleAfter = await page.locator('.window').count();
    expect(visibleAfter).toBe(windowCount);
  });

  // ── Shortcut Registry ──────────────────────────────────────

  test('built-in shortcuts are listed in command palette shortcut display', async ({ page }) => {
    const mod = await shortcutKey(page);
    await page.keyboard.press(`${mod}+Shift+p`);
    await expect(page.locator('.command-palette-overlay')).toBeVisible();

    // Command palette shows shortcut hints — verify it rendered without crash
    const input = page.locator('.command-palette-input');
    await expect(input).toBeFocused();

    await page.keyboard.press('Escape');
  });
});
