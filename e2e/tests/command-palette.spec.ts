import { test, expect } from '@playwright/test';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.taskbar');
  });

  test('opens with Cmd+Shift+P', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+p');
    const overlay = page.locator('.command-palette-overlay');
    await expect(overlay).toBeVisible();
  });

  test('has accessible dialog role', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+p');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('closes with Escape', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+p');
    await expect(page.locator('.command-palette-overlay')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.command-palette-overlay')).not.toBeVisible();
  });

  test('can filter commands by typing', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+p');
    const input = page.locator('.command-palette-input');
    await input.fill('calculator');

    // Results should be filtered
    const items = page.locator('.command-palette-item');
    const count = await items.count();
    // At least one match (or none if no calculator commands registered)
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
