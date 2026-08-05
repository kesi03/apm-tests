import { config } from '../config';
import { get } from '../http';

interface EsInfo {
  cluster_name?: string;
}

describe('Elastic Stack services', () => {
  it('Elasticsearch responds and reports the expected cluster', async () => {
    const res = await get(`${config.stack.elasticsearch}/`, { timeout: 15_000 });
    expect(res.status).toBe(200);
    expect((res.body as EsInfo).cluster_name).toBe('apm-cluster');
  });

  it('Kibana status endpoint responds', async () => {
    const res = await get(`${config.stack.kibana}/api/status`, { timeout: 30_000 });
    expect(res.status).toBe(200);
  });

  it('APM Server responds', async () => {
    const res = await get(`${config.stack.apmServer}/`, { timeout: 15_000 });
    expect(res.status).toBe(200);
  });
});
