import { test, expect } from '@playwright/test';
import { config } from '../config';

test('Kibana loads its UI', async ({ page }) => {
  test.setTimeout(120_000);
  const response = await page.goto(`${config.stack.kibana}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000
  });
  expect(response?.status()).toBe(200);

  // Kibana is a heavy SPA; wait until the app actually renders content.
  await expect(async () => {
    const text = await page.textContent('body');
    expect((text ?? '').trim().length).toBeGreaterThan(0);
  }).toPass({ timeout: 60_000 });
});

test('Kibana reports a healthy overall status', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`${config.stack.kibana}/api/status`, { timeout: 60_000 });
  await expect(async () => {
    const text = await page.textContent('pre');
    const status = text ? JSON.parse(text) : null;
    expect(status?.status?.overall?.level).toBe('available');
  }).toPass({ timeout: 60_000 });
});
