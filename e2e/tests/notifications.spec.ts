import { test, expect } from '@playwright/test';

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.taskbar');
  });

  test('toast container exists in DOM', async ({ page }) => {
    // The toast container is always rendered (empty initially)
    const container = page.locator('.toast-container');
    await expect(container).toBeAttached();
  });
});
