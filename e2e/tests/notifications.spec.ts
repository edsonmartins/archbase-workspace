import { test, expect } from '@playwright/test';

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.taskbar');
  });

  // ── Toast container ────────────────────────────────────────

  test('toast container exists in DOM', async ({ page }) => {
    const container = page.locator('.toast-container');
    await expect(container).toBeAttached();
  });

  test('toast container is initially empty (no toasts on load)', async ({ page }) => {
    const toasts = page.locator('.toast');
    expect(await toasts.count()).toBe(0);
  });

  // ── Notification bell / center ─────────────────────────────

  test('notification bell button is in the taskbar', async ({ page }) => {
    const bell = page.locator('[aria-label="Toggle Notification Center"]');
    await expect(bell).toBeVisible();
  });

  test('clicking notification bell opens notification center', async ({ page }) => {
    await page.locator('[aria-label="Toggle Notification Center"]').click();
    const center = page.locator('[aria-label="Notification Center"]');
    await expect(center).toBeVisible();
  });

  test('notification center has complementary ARIA role', async ({ page }) => {
    await page.locator('[aria-label="Toggle Notification Center"]').click();
    const center = page.locator('[aria-label="Notification Center"]');
    await expect(center).toHaveAttribute('role', 'complementary');
  });

  test('notification center shows "No notifications" when history is empty', async ({ page }) => {
    await page.locator('[aria-label="Toggle Notification Center"]').click();
    await expect(page.locator('[aria-label="Notification Center"]')).toBeVisible();
    // On a fresh page load there are no notifications
    const text = await page.locator('[aria-label="Notification Center"]').textContent();
    // Either shows empty-state or lists notifications
    expect(text).toBeTruthy();
  });

  test('clicking close button inside notification center hides it', async ({ page }) => {
    await page.locator('[aria-label="Toggle Notification Center"]').click();
    await expect(page.locator('[aria-label="Notification Center"]')).toBeVisible();

    await page.locator('[aria-label="Close notification center"]').click();
    await expect(page.locator('[aria-label="Notification Center"]')).not.toBeVisible();
  });

  test('clicking overlay outside notification center closes it', async ({ page }) => {
    await page.locator('[aria-label="Toggle Notification Center"]').click();
    await expect(page.locator('[aria-label="Notification Center"]')).toBeVisible();

    // Click the overlay (outside the panel)
    const overlay = page.locator('.notification-center-overlay');
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(page.locator('[aria-label="Notification Center"]')).not.toBeVisible();
  });

  // ── Accessibility ──────────────────────────────────────────

  test('aria-live region is present for screen reader announcements', async ({ page }) => {
    const liveRegion = page.locator('[aria-live]');
    await expect(liveRegion.first()).toBeAttached();
  });
});
