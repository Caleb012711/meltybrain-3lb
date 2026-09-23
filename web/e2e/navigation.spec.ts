import { test, expect } from '@playwright/test';

test.describe('Navigation, Links, and Routing', () => {
  test('navigates from home to Studio and BOM via navbar links', async ({ page }) => {
    await page.goto('/#/');

    const nav = page.locator('nav[aria-label="Site sections"]');

    // Navigate to BOM
    await nav.getByRole('link', { name: /bom/i }).click();
    await expect(page).toHaveURL(/.*#\/bom/);
    await expect(page.locator('h1')).toContainText(/BOM/i);

    // Navigate to Studio
    await nav.getByRole('link', { name: /studio/i }).click();
    await expect(page).toHaveURL(/.*#\/studio/);
    await expect(page.locator('h1')).toContainText(/3D Studio/i);

    // Navigate back to Home via brand link
    await page.locator('.brand').click();
    await expect(page).toHaveURL(/.*#\/?$/);
  });

  test('handles responsive viewport sizing', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/explorer');
    await expect(page.locator('.explorer-grid')).toBeVisible();

    // Test tablet/mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});
