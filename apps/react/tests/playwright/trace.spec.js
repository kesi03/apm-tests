const { test, expect } = require('@playwright/test');

// Base URL for the running app (Vite dev server or preview). Override with TEST_BASE_URL.
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

test.describe('RUM distributed tracing', () => {
  test('injects W3C trace headers on backend proxy request (Express)', async ({ page }) => {
    await page.goto(BASE_URL);

    // Intercept the outgoing request triggered by the UI click and capture it
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/proxy/expressjs/') && req.method() === 'GET'),
      // Click the button labeled "Call Express.js"
      page.click('button:has-text("Call Express.js")')
    ]);

    const headers = request.headers();
    // Playwright lower-cases header names
    const traceparent = headers['traceparent'];
    const tracestate = headers['tracestate'];

    // Assert traceparent exists and roughly matches the W3C format
    expect(traceparent).toBeTruthy();
    // Basic regex for traceparent: version- traceid(32 hex) - parentid(16 hex) - flags(2 hex)
    expect(traceparent).toMatch(/^([0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2})$/i);

    // tracestate is optional; if present it should be a non-empty string
    if (tracestate) expect(tracestate.length).toBeGreaterThan(0);

    // Optionally assert the backend returned 200 (wait for response)
    const response = await page.waitForResponse((res) => res.url().includes('/proxy/expressjs/') && res.request().method() === 'GET');
    expect(response.ok()).toBeTruthy();
  });
});
