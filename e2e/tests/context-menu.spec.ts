import { test, expect } from '@playwright/test';

test.describe('Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.taskbar');
  });

  test('right-click on desktop shows context menu', async ({ page }) => {
    // Right-click on the desktop area (above taskbar)
    await page.locator('#main-content').click({ button: 'right', position: { x: 400, y: 300 } });

    const menu = page.locator('.context-menu');
    await expect(menu).toBeVisible();

    // Should have menu items
    const items = menu.locator('.context-menu-item');
    expect(await items.count()).toBeGreaterThan(0);
  });

  test('context menu closes on click outside', async ({ page }) => {
    await page.locator('#main-content').click({ button: 'right', position: { x: 400, y: 300 } });
    await expect(page.locator('.context-menu')).toBeVisible();

    // Click outside
    await page.locator('#main-content').click({ position: { x: 100, y: 100 } });

    await expect(page.locator('.context-menu')).not.toBeVisible();
  });

  test('context menu on window header shows window actions', async ({ page }) => {
    // Right-click on window header
    const header = page.locator('.window-header').first();
    await header.click({ button: 'right' });

    const menu = page.locator('.context-menu');
    await expect(menu).toBeVisible();

    // Should have Close item
    const closeItem = menu.locator('.context-menu-item', { hasText: 'Close' });
    await expect(closeItem).toBeVisible();
  });
});
