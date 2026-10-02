import { test, expect } from '@playwright/test';

test.describe('3D Canvas Rendering & WebGL', () => {
  test('renders 3D canvas element on home page hero stage', async ({ page }) => {
    await page.goto('/#/');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 25000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(100);
  });

  test('renders 3D Canvas in Explorer with WebGL context', async ({ page }) => {
    await page.goto('/#/explorer');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await expect(canvas).toHaveAttribute('data-engine', /three\.js/i);

    // Ensure fallback error view is NOT displayed
    await expect(page.locator('.viewer-fallback')).not.toBeVisible();
  });

  test('renders 3D Canvas in Studio viewport', async ({ page }) => {
    await page.goto('/#/studio');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
  });
});
