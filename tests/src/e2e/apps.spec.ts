import { test, expect } from '@playwright/test';
import { config } from '../config';

interface BrowserApp {
  name: string;
  url: string;
  text: string;
}

const BROWSER_APPS: BrowserApp[] = [
  { name: 'java', url: config.apps.java, text: 'Hello from plain Java (Elastic APM)' },
  { name: 'spring-boot', url: config.apps.springBoot, text: 'Hello from Spring Boot (Elastic APM)' },
  { name: 'openliberty', url: config.apps.openLiberty, text: 'Hello from Open Liberty (Elastic APM)' },
  { name: 'expressjs', url: config.apps.expressjs, text: 'Hello from Express.js (Elastic APM)' },
  { name: 'python', url: config.apps.python, text: 'Hello from Python/Flask (Elastic APM)' },
  { name: 'csharp', url: config.apps.csharp, text: 'Hello from C# / ASP.NET Core (Elastic APM)' },
  { name: 'golang', url: config.apps.golang, text: 'Hello from Go (Elastic APM)' }
];

for (const app of BROWSER_APPS) {
  test(`${app.name} page loads with expected content`, async ({ page }) => {
    const response = await page.goto(`${app.url}/`, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toContainText(app.text);
  });
}

test('react app renders and sends a custom transaction', async ({ page }) => {
  await page.goto(`${config.apps.react}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toContainText('React + Elastic APM RUM');
  await page.getByRole('button', { name: 'Send custom transaction' }).click();
  await expect(page.getByText('Custom transaction sent to APM Server')).toBeVisible();
});
