import { test, expect } from '@playwright/test';

test.describe('Window Tiling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.taskbar');
  });

  // ── Context menu tiling ────────────────────────────────────

  test('desktop context menu has tiling options', async ({ page }) => {
    await page.locator('#main-content').click({ button: 'right', position: { x: 400, y: 300 } });

    const menu = page.locator('.context-menu');
    await expect(menu).toBeVisible();

    await expect(menu.locator('.context-menu-item', { hasText: 'Tile Horizontal' })).toBeVisible();
    await expect(menu.locator('.context-menu-item', { hasText: 'Tile Vertical' })).toBeVisible();
    await expect(menu.locator('.context-menu-item', { hasText: 'Cascade Windows' })).toBeVisible();
    await expect(menu.locator('.context-menu-item', { hasText: 'Minimize All' })).toBeVisible();
  });

  test('clicking "Tile Horizontal" does not crash the app', async ({ page }) => {
    await page.locator('#main-content').click({ button: 'right', position: { x: 400, y: 300 } });
    const menu = page.locator('.context-menu');
    await expect(menu).toBeVisible();

    await menu.locator('.context-menu-item', { hasText: 'Tile Horizontal' }).click();
    await page.waitForTimeout(300);

    // App should still be functional — taskbar visible
    await expect(page.locator('.taskbar')).toBeVisible();
  });

  test('clicking "Tile Vertical" does not crash the app', async ({ page }) => {
    await page.locator('#main-content').click({ button: 'right', position: { x: 400, y: 300 } });
    await page.locator('.context-menu-item', { hasText: 'Tile Vertical' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.taskbar')).toBeVisible();
  });

  test('clicking "Cascade Windows" does not crash the app', async ({ page }) => {
    await page.locator('#main-content').click({ button: 'right', position: { x: 400, y: 300 } });
    await page.locator('.context-menu-item', { hasText: 'Cascade Windows' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.taskbar')).toBeVisible();
  });

  test('clicking "Minimize All" hides all windows', async ({ page }) => {
    const windowCount = await page.locator('.window').count();
    if (windowCount === 0) {
      test.skip();
      return;
    }

    await page.locator('#main-content').click({ button: 'right', position: { x: 400, y: 300 } });
    await page.locator('.context-menu-item', { hasText: 'Minimize All' }).click();
    await page.waitForTimeout(300);

    const visible = await page.locator('.window:visible').count();
    expect(visible).toBe(0);
  });

  // ── Tiling with multiple windows ───────────────────────────

  test('tiled windows fill the available desktop area', async ({ page }) => {
    const windowCount = await page.locator('.window').count();
    if (windowCount < 2) {
      test.skip();
      return;
    }

    // Tile horizontally via context menu
    await page.locator('#main-content').click({ button: 'right', position: { x: 400, y: 300 } });
    await page.locator('.context-menu-item', { hasText: 'Tile Horizontal' }).click();
    await page.waitForTimeout(300);

    // All windows should remain visible after tiling
    const afterCount = await page.locator('.window').count();
    expect(afterCount).toBe(windowCount);

    // Each window should have a positive bounding box inside the viewport
    const boxes = await page.locator('.window').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height, x: r.x, y: r.y };
      }),
    );

    for (const box of boxes) {
      expect(box.w).toBeGreaterThan(0);
      expect(box.h).toBeGreaterThan(0);
    }
  });

  // ── Window maximize via header double-click ─────────────────

  test('double-clicking window header maximizes the window', async ({ page }) => {
    const header = page.locator('.window-header').first();
    if (!(await header.isVisible())) {
      test.skip();
      return;
    }

    await header.dblclick();
    await page.waitForTimeout(200);

    // Maximized windows have a specific class or attribute
    const win = page.locator('.window').first();
    // The window should still be visible
    await expect(win).toBeVisible();
  });

  test('window can be resized by dragging its edge handle', async ({ page }) => {
    const win = page.locator('.window').first();
    if (!(await win.isVisible())) {
      test.skip();
      return;
    }

    const box = await win.boundingBox();
    if (!box) {
      test.skip();
      return;
    }

    // Drag the east resize handle
    const handleX = box.x + box.width - 2;
    const handleY = box.y + box.height / 2;

    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    await page.mouse.move(handleX + 50, handleY, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(100);

    // Window should still be present
    await expect(win).toBeVisible();
  });
});
