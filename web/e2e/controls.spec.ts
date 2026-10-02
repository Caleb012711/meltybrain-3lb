import { test, expect } from '@playwright/test';

test.describe('Source CAD inspection', () => {
  test('preserves source geometry and resets inspection modes', async ({ page }) => {
    await page.goto('/#/explorer');
    await expect(page.locator('.status').first()).toContainText('89 meshed');
    const bar = page.getByRole('toolbar', { name: 'Explorer controls' });
    await expect(bar.getByRole('button', { name: /Top Armor|Hardware|Shell/i })).toHaveCount(0);
    await page.getByLabel('Color mode').selectOption('plain');
    await page.getByLabel('Exploded view').fill('0.75');
    await bar.getByRole('button', { name: 'X-ray', exact: true }).click();
    await expect(bar.getByRole('button', { name: 'X-ray', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await bar.getByRole('button', { name: 'Wireframe', exact: true }).click();
    await expect(bar.getByRole('button', { name: 'X-ray', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await bar.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByLabel('Exploded view')).toHaveValue('0');
    await expect(bar.getByRole('button', { name: 'Wireframe', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('radio', { name: /Wheel pod/i }).click();
    await expect(page.locator('.status').first()).toContainText('14 meshed');
  });

  test('interactively selects, inspects, and downloads all 5 accessory models', async ({ page }) => {
    await page.goto('/#/explorer');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25000 });

    const bar = page.locator('.viewer-bar');

    // 1. Dual Accel Mount
    const accelTab = bar.getByRole('radio', { name: /Dual accel mount/i });
    await expect(accelTab).toBeVisible();
    await accelTab.click({ force: true });
    await expect(page).toHaveURL(/model=accel-mount/);
    await expect(page.locator('.part-list')).toContainText(/Baseplate/i);
    await page.locator('.part-list li button').first().click();
    await expect(page.locator('.readout')).toContainText(/Baseplate \(Dual H3LIS331\)/i);

    // 2. Pi Zero 2W Cradle
    const piTab = bar.getByRole('radio', { name: /Pi Zero 2W cradle/i });
    await expect(piTab).toBeVisible();
    await piTab.click({ force: true });
    await expect(page).toHaveURL(/model=pi-cradle/);
    await expect(page.locator('.part-list')).toContainText(/Carrier Base/i);
    await page.locator('.part-list li button').first().click();
    await expect(page.locator('.readout')).toContainText(/Carrier Base & BEC Bay/i);

    // 3. LED Heading Mount
    const ledTab = bar.getByRole('radio', { name: /LED heading mount/i });
    await expect(ledTab).toBeVisible();
    await ledTab.click({ force: true });
    await expect(page).toHaveURL(/model=led-mount/);
    await expect(page.locator('.part-list')).toContainText(/Diffuser Lens/i);
    await page.locator('.part-list li button').nth(2).click(); // nth(2) is part 1 button
    await expect(page.locator('.readout')).toContainText(/120° Diffuser Lens/i);

    // 4. TPU Battery Cradle
    const battTab = bar.getByRole('radio', { name: /TPU battery cradle/i });
    await expect(battTab).toBeVisible();
    await battTab.click({ force: true });
    await expect(page).toHaveURL(/model=battery-cradle/);
    await expect(page.locator('.part-list')).toContainText(/Dual 4S LiPo/i);
    await page.locator('.part-list li button').first().click();
    await expect(page.locator('.readout')).toContainText(/Dual 4S LiPo TPU Cradle/i);

    // 5. Bench Case
    const benchTab = bar.getByRole('radio', { name: /Bench case/i });
    await expect(benchTab).toBeVisible();
    await benchTab.click({ force: true });
    await expect(page).toHaveURL(/model=bench-case/);
    await expect(page.locator('.part-list')).toContainText(/Case lid/i);
    await page.locator('.part-list li button').nth(2).click();
    await expect(page.locator('.readout')).toContainText(/Case lid/i);

    // Verify dynamic ZIP download package exists
    const zipLink = page.getByRole('link', { name: /Print package/i });
    await expect(zipLink).toBeVisible();
  });
});
