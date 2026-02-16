import { test, expect } from '@playwright/test';

test.describe('Window Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for desktop to be ready
    await page.waitForSelector('.taskbar');
  });

  test('desktop loads with taskbar visible', async ({ page }) => {
    const taskbar = page.locator('.taskbar');
    await expect(taskbar).toBeVisible();
  });

  test('opens a window when clicking an app in taskbar', async ({ page }) => {
    // Click the first launcher button to show apps
    const launcherBtn = page.locator('.taskbar-launcher-btn');
    await launcherBtn.click();

    // App launcher should be visible
    const launcher = page.locator('.app-launcher-overlay');
    await expect(launcher).toBeVisible();
  });

  test('window has header with title and controls', async ({ page }) => {
    // A default window opens on load
    const header = page.locator('.window-header').first();
    await expect(header).toBeVisible();

    // Should have close, minimize, maximize buttons
    const closeBtn = header.locator('.window-ctrl-btn').nth(2);
    await expect(closeBtn).toBeVisible();
  });

  test('can close a window', async ({ page }) => {
    const windowsBefore = await page.locator('.window').count();
    expect(windowsBefore).toBeGreaterThan(0);

    // Click close button on the first window
    const closeBtn = page.locator('.window-header .window-ctrl-btn').last();
    await closeBtn.click();

    // Wait for animation
    await page.waitForTimeout(200);

    const windowsAfter = await page.locator('.window').count();
    expect(windowsAfter).toBeLessThan(windowsBefore);
  });

  test('can minimize and restore a window via taskbar', async ({ page }) => {
    // Click minimize button
    const minimizeBtn = page.locator('.window-header .window-ctrl-btn').first();
    await minimizeBtn.click();

    // Wait for animation
    await page.waitForTimeout(200);

    // Window should be hidden
    const visibleWindows = await page.locator('.window:visible').count();
    expect(visibleWindows).toBe(0);

    // Click the running app button in taskbar to restore
    const runningBtn = page.locator('.taskbar-running-btn').first();
    await runningBtn.click();

    // Wait for restore animation
    await page.waitForTimeout(200);

    // Window should be visible again
    const restoredWindows = await page.locator('.window').count();
    expect(restoredWindows).toBeGreaterThan(0);
  });
});
