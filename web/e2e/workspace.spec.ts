import { test, expect } from '@playwright/test';

test('theme persists, source preview renders, and mobile navigation fits', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/#/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.model-showcase canvas')).toBeVisible();
  await expect(page.locator('.model-showcase')).toHaveAttribute('aria-busy', 'false');
  await page.screenshot({ path: testInfo.outputPath('overview-light.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.model-showcase')).toHaveAttribute('aria-busy', 'false');
  await page.screenshot({ path: testInfo.outputPath('overview-dark.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name: /Firmware/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Keep the evidence close.');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('systems-mobile-dark.png'), fullPage: true });
});

test('equipment logs reject invalid input, summarize locally and export supported fields', async ({ page }) => {
  await page.goto('/#/firmware');
  const input = page.getByLabel('Import equipment log');
  await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('[{"temperatureC":"hot"}]') });
  await expect(page.getByRole('alert')).toContainText('temperatureC must be a finite number');
  await input.setInputFiles({ name: 'recording.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ batteryVoltage: 12.4, temperatureC: 24, secret: 'discard' }, { batteryVoltage: 12.1, note: 'USB check complete' }])) });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Review brief')).toContainText('12.10–12.40 V (2 readings)');
  await expect(page.getByLabel('Review brief')).toContainText('24.00–24.00 °C (1 readings)');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download review' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());
  expect(data.records).toHaveLength(2);
  expect(data.records[0]).not.toHaveProperty('secret');
  await page.getByRole('button', { name: 'Clear log' }).click();
  await expect(page.getByLabel('Review brief')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load example data' }).click();
  await expect(page.getByLabel('Review brief')).toContainText('Example data — synthetic');
});
