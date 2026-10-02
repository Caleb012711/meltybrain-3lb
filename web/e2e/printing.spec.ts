import { test, expect } from '@playwright/test';

test('material selection updates advice and the matching official source', async ({ page }, testInfo) => {
  await page.goto('/#/printing');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Make it fit');
  await page.screenshot({ path: testInfo.outputPath('print-desk-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: /PETG HF/ }).click();
  await expect(page.getByRole('button', { name: /PETG HF/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#material-details')).toContainText('Ordinary electronics cases');
  await expect(page.locator('#material-details a')).toHaveAttribute('href', /bambulab\.com.*petg-hf/);
  await page.getByRole('button', { name: /TPU 95A HF/ }).click();
  await expect(page.locator('#material-details')).toContainText('external-spool');
  await expect(page.getByRole('button', { name: /PETG HF/ })).toHaveAttribute('aria-pressed', 'false');
});

test('filament estimate uses actual spool weight and rejects invalid input', async ({ page }) => {
  await page.goto('/#/printing');
  const result = page.getByRole('status', { name: 'Estimated filament cost' });
  await expect(result).toContainText('$0.75');
  await page.getByLabel('Filament needed (g)').fill('42');
  await page.getByLabel('Spool price (USD)').fill('30');
  await page.getByLabel('Net filament per spool (g)').fill('750');
  await expect(result).toContainText('$1.68');
  await page.getByLabel('Net filament per spool (g)').fill('0');
  await expect(result).toContainText('greater than zero');
  await expect(result).not.toContainText('Infinity');
  await page.getByLabel('Net filament per spool (g)').fill('1000');
  await page.getByLabel('Filament needed (g)').fill('');
  await expect(result).toContainText('Enter nonnegative');
  await page.getByLabel('Filament needed (g)').fill('-1');
  await expect(result).toContainText('Enter nonnegative');
  await page.getByLabel('Filament needed (g)').fill('0');
  await expect(result).toContainText('$0.00');
});

test('mobile page and expanded audit fit the viewport with reduced motion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/printing');
  await page.getByText('What the CAD audit actually checked').click();
  await expect(page.getByText('Source SHA-256:')).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
  await expect(page.getByRole('button', { name: /PLA Basic/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('print-desk-mobile.png'), fullPage: true });
});

test('print status stays separate from assembly assets and proposed components', async ({ page }) => {
  await page.goto('/#/printing');
  await expect(page.getByLabel('Print release status')).toContainText('00');
  await expect(page.getByLabel('Print release status')).toContainText('viewer STLs contain assemblies');

  // Verify production STL matrix table and component conflicts table
  await expect(page.getByRole('table', { name: /Production STL files verified/i })).toBeVisible();
  const compTable = page.getByRole('table', { name: /Component names checked/i });
  await expect(compTable).toBeVisible();
  await expect(compTable).toContainText('XIAO ESP32-S3');
  await expect(compTable).toContainText('Teensy 4.0');

  const prototype = page.getByRole('link', { name: 'Download bench-case prototype' });
  await expect(prototype).toHaveAttribute('download', '');
  const response = await page.request.get('/accessories/xiao-bench-case.zip');
  expect(response.ok()).toBe(true);
  const archive = await response.body();
  expect(archive.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))).toBe(true);
  await expect(page.locator('.print-prototype')).toContainText('physical fit unverified');
});
