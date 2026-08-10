import { test, expect } from '@playwright/test';
import { config } from '../config';
import { post } from '../http';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const esHeaders: Record<string, string> = config.stack.elasticsearchApiKey
  ? { authorization: `ApiKey ${config.stack.elasticsearchApiKey}` }
  : {};

async function hasSharedTrace(serviceA: string, serviceB: string): Promise<boolean | 'denied'> {
  const res = await post(
    `${config.stack.elasticsearch}/traces-apm*/_search`,
    JSON.stringify({
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { 'service.name': [serviceA, serviceB] } },
            { range: { '@timestamp': { gte: 'now-1h' } } }
          ]
        }
      },
      aggs: {
        traces: {
          terms: {
            field: 'trace.id',
            size: 10000,
            shard_size: 20000,
            min_doc_count: 2
          },
          aggs: {
            services: { terms: { field: 'service.name', size: 10 } }
          }
        }
      }
    }),
    { timeout: 15_000, headers: esHeaders }
  );

  if (res.status === 401 || res.status === 403) {
    return 'denied';
  }

  const agg = res.body as {
    aggregations?: {
      traces?: {
        buckets?: Array<{
          key: string;
          services?: { buckets?: Array<{ key: string }> };
        }>;
      };
    };
  };
  const buckets = agg?.aggregations?.traces?.buckets ?? [];
  return buckets.some((bucket) => {
    const names = (bucket.services?.buckets ?? []).map((b) => b.key);
    return names.includes(serviceA) && names.includes(serviceB);
  });
}

test('react proxies to backend apps and produces distributed traces', async ({ page }) => {
  await page.goto(`${config.apps.react}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toContainText('React + Elastic APM RUM');

  await page.getByRole('button', { name: 'Call Java' }).click();
  await expect(page.locator('[data-testid="proxy-java"]')).toContainText(
    'Hello from plain Java (Elastic APM)',
    { timeout: 30_000 }
  );

  await page.getByRole('button', { name: 'Call Python' }).click();
  await expect(page.locator('[data-testid="proxy-python"]')).toContainText(
    'Hello from Python/Flask (Elastic APM)',
    { timeout: 30_000 }
  );

  let result: boolean | 'denied' = false;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    result = await hasSharedTrace('react-app', 'java-app');
    if (result === true || result === 'denied') {
      break;
    }
    await sleep(5_000);
  }

  if (result === 'denied') {
    console.warn('SKIPPED: Elasticsearch denied access (API key lacks privileges)');
    return;
  }
  expect(result, 'no trace shared between react-app and java-app was ingested').toBe(true);
});
