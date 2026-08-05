import { config } from '../config';
import { get } from '../http';

interface ServerApp {
  name: string;
  url: string;
  text: string;
}

const SERVER_APPS: ServerApp[] = [
  { name: 'java', url: config.apps.java, text: 'plain Java' },
  { name: 'spring-boot', url: config.apps.springBoot, text: 'Spring Boot' },
  { name: 'openliberty', url: config.apps.openLiberty, text: 'Open Liberty' },
  { name: 'expressjs', url: config.apps.expressjs, text: 'Express.js' },
  { name: 'python', url: config.apps.python, text: 'Python/Flask' },
  { name: 'csharp', url: config.apps.csharp, text: 'C# / ASP.NET Core' },
  { name: 'golang', url: config.apps.golang, text: 'Go' }
];

describe.each(SERVER_APPS)('$name app', ({ name, url, text }) => {
  it('responds on /', async () => {
    const res = await get(`${url}/`, { timeout: 10_000 });
    expect(res.status).toBe(200);
    expect(res.text).toContain(text);
  });

  it('handles /slow', async () => {
    const res = await get(`${url}/slow`, { timeout: 10_000 });
    expect(res.status).toBe(200);
  });

  it('reports errors via /error (HTTP 500)', async () => {
    const res = await get(`${url}/error`, { timeout: 10_000 });
    expect(res.status).toBe(500);
  });
});

describe('react app (RUM)', () => {
  it('serves the SPA shell', async () => {
    const res = await get(`${config.apps.react}/`, { timeout: 10_000 });
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root"></div>');
  });
});
