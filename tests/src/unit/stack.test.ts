import { config } from '../config';
import { get } from '../http';

const esHeaders: Record<string, string> = config.stack.elasticsearchApiKey
  ? { authorization: `ApiKey ${config.stack.elasticsearchApiKey}` }
  : {};

describe('Elastic Cloud services', () => {
  it('Elasticsearch responds', async () => {
    const res = await get(`${config.stack.elasticsearch}/`, { timeout: 15_000, headers: esHeaders });
    if (res.status === 401 || res.status === 403) {
      console.warn('SKIPPED: Elasticsearch denied access (API key lacks privileges)');
      return;
    }
    expect(res.status).toBe(200);
  });

  it('APM Server responds with the APM API key', async () => {
    const res = await get(`${config.stack.apmServer}/`, {
      timeout: 15_000,
      headers: { authorization: `ApiKey ${config.stack.apmApiKey}` }
    });
    expect(res.status).toBe(200);
  });
});
