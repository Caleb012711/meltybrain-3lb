import { test, expect } from '@playwright/test';

test.describe('Page Loading & Route Accessibility', () => {
  test('loads home page with title, hero, and core sections', async ({ page }) => {
    await page.goto('/#/');
    await expect(page).toHaveTitle(/Eyeliner/i);
    await expect(page.locator('h1')).toContainText(/Eyeliner/i);
    await expect(page.getByRole('link', { name: /studio/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /explorer/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /bom/i }).first()).toBeVisible();
  });

  test('loads 3D Explorer page with part inspection tools', async ({ page }) => {
    await page.goto('/#/explorer');
    await expect(page.locator('h1')).toContainText(/3D explorer/i);
    await expect(page.locator('.viewer-bar')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Full assembly/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Wheel pod/i })).toBeVisible();
  });

  test('loads CAD Studio page', async ({ page }) => {
    await page.goto('/#/studio');
    await expect(page.locator('h1')).toContainText(/3D Studio/i);
  });

  test('loads BOM (Bill of Materials) page with complete component breakdown', async ({ page }) => {
    await page.goto('/#/bom');
    await expect(page.locator('h1')).toContainText(/BOM/i);
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/AR500/i);
  });

  test('loads Engineering calculators page', async ({ page }) => {
    await page.goto('/#/engineering');
    await expect(page.locator('h1')).toContainText(/Engineering calculators/i);
    await expect(page.locator('body')).toContainText(/Body spin/i);
  });

  test('loads Build Guide, Checklist, Rules, and FAQ pages', async ({ page }) => {
    for (const path of ['/#/build', '/#/onshape', '/#/pcbway', '/#/printing', '/#/parts']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});
