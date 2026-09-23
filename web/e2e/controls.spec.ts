import { test, expect } from '@playwright/test';

test.describe('Interactive 3D Controls, Shell, Wheel Pod & Hardware', () => {
  test('configures explode view and circular outer shell presets', async ({ page }) => {
    await page.goto('/#/explorer');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25000 });

    const bar = page.locator('.viewer-bar');

    // Explode slider
    const slider = page.getByLabel('Exploded view');
    await expect(slider).toBeVisible();
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = '0.75';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(slider).toHaveValue('0.75');

    // Circular outer shell
    const shellBtn = bar.getByRole('button', { name: /Shell (◯|◻)/i });
    await expect(shellBtn).toBeVisible();
    await expect(shellBtn).toHaveAttribute('aria-pressed', 'true');

    const materialSelect = bar.getByLabel('Shell material');
    await expect(materialSelect).toBeVisible();
    await materialSelect.selectOption('aluminum');
    await expect(materialSelect).toHaveValue('aluminum');

    const profileSelect = bar.getByLabel('Shell profile');
    await expect(profileSelect).toBeVisible();
    await profileSelect.selectOption('hybrid');
    await expect(profileSelect).toHaveValue('hybrid');

    await shellBtn.click({ force: true });
    await expect(shellBtn).toHaveAttribute('aria-pressed', 'false');
    await shellBtn.click({ force: true });
    await expect(shellBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('configures top armor plate, lightening pockets, beacon window, and hardware', async ({ page }) => {
    await page.goto('/#/explorer');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25000 });

    const bar = page.locator('.viewer-bar');
    const topArmorBtn = bar.getByRole('button', { name: /Top Armor/i });
    await expect(topArmorBtn).toBeVisible();
    await expect(topArmorBtn).toHaveAttribute('aria-pressed', 'true');

    // Finish select
    const finishSelect = bar.getByLabel('Top shell finish');
    await expect(finishSelect).toBeVisible();
    await finishSelect.selectOption('carbon');
    await expect(finishSelect).toHaveValue('carbon');

    // Lightening pockets select
    const pocketSelect = bar.getByLabel('Lightening pockets');
    await expect(pocketSelect).toBeVisible();
    await pocketSelect.selectOption('isogrid');
    await expect(pocketSelect).toHaveValue('isogrid');

    // Optical beacon window select
    const beaconSelect = bar.getByLabel('Optical beacon window');
    await expect(beaconSelect).toBeVisible();
    await beaconSelect.selectOption('diffuse-dome');
    await expect(beaconSelect).toHaveValue('diffuse-dome');

    // Toggle top armor
    await topArmorBtn.click({ force: true });
    await expect(topArmorBtn).toHaveAttribute('aria-pressed', 'false');
    await topArmorBtn.click({ force: true });
    await expect(topArmorBtn).toHaveAttribute('aria-pressed', 'true');

    // Precision hardware toggle
    const hwBtn = bar.getByRole('button', { name: /Hardware/i });
    await expect(hwBtn).toBeVisible();
    await expect(hwBtn).toHaveAttribute('aria-pressed', 'true');
    await hwBtn.click({ force: true });
    await expect(hwBtn).toHaveAttribute('aria-pressed', 'false');
    await hwBtn.click({ force: true });
    await expect(hwBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('exercises Wheel Pod assembly, bearing cutaway, and viewer modes', async ({ page }) => {
    await page.goto('/#/explorer');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 25000 });

    const bar = page.locator('.viewer-bar');
    const podTab = bar.getByRole('radio', { name: /Wheel pod/i });
    await podTab.click({ force: true });
    await expect(podTab).toHaveAttribute('aria-checked', 'true');

    // Pod Assembly button
    const podBtn = bar.getByRole('button', { name: /Pod/i });
    await expect(podBtn).toBeVisible();
    await expect(podBtn).toHaveAttribute('aria-pressed', 'true');

    // Tread select
    const treadSelect = bar.getByLabel('Wheel pod tread');
    await expect(treadSelect).toBeVisible();
    await treadSelect.selectOption('ti-cleats');
    await expect(treadSelect).toHaveValue('ti-cleats');

    // Bearings cutaway toggle
    const bearingsBtn = bar.getByRole('button', { name: /Bearings/i });
    await expect(bearingsBtn).toBeVisible();
    await expect(bearingsBtn).toHaveAttribute('aria-pressed', 'false');
    await bearingsBtn.click({ force: true });
    await expect(bearingsBtn).toHaveAttribute('aria-pressed', 'true');

    // X-ray, wireframe, and spin
    const xrayBtn = bar.getByRole('button', { name: 'X-ray' });
    const wireframeBtn = bar.getByRole('button', { name: 'Wireframe' });
    const spinBtn = bar.getByRole('button', { name: /Spin/i });

    await xrayBtn.click({ force: true });
    await expect(xrayBtn).toHaveAttribute('aria-pressed', 'true');

    await wireframeBtn.click({ force: true });
    await expect(wireframeBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(xrayBtn).toHaveAttribute('aria-pressed', 'false');

    await spinBtn.click({ force: true });
    await expect(spinBtn).toBeVisible();
  });
});
