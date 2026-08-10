import { test, expect } from '@playwright/test';
import { config } from '../config';

test('Elastic Cloud APM endpoint responds', async ({ page }) => {
  test.setTimeout(120_000);
  const response = await page.request.get(`${config.stack.apmServer}/`, {
    headers: { Authorization: `ApiKey ${config.stack.apmApiKey}` }
  });
  expect(response.status()).toBe(200);
});

test('Elastic Cloud Elasticsearch endpoint is reachable', async ({ page }) => {
  test.setTimeout(120_000);
  const response = await page.request.get(`${config.stack.elasticsearch}/`, {
    headers: { Authorization: `ApiKey ${config.stack.elasticsearchApiKey}` }
  });
  // 200 = full access, 401/403 = reachable but the key lacks privileges.
  expect([200, 401, 403]).toContain(response.status());
});
