// The Elastic APM Node.js agent must be required and started FIRST,
// before any other module (express, etc.).
const apm = require('elastic-apm-node').start({
  serviceName: process.env.ELASTIC_APM_SERVICE_NAME || 'express-app',
  serverUrl: process.env.ELASTIC_APM_SERVER_URL || 'https://my-observability-project-d54a32.apm.europe-west2.gcp.elastic.cloud:443',
  environment: process.env.ELASTIC_APM_ENVIRONMENT || 'development'
});

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Express.js (Elastic APM)');
});

app.get('/greet/:name', async (req, res) => {
  await sleep(200);
  res.send(`Hello, ${req.params.name}!`);
});

app.get('/slow', async (req, res) => {
  await sleep(1000);
  res.send('Slow response');
});

app.get('/custom', (req, res) => {
  const tx = apm.startTransaction('custom-work', 'custom');
  const span = tx.startSpan('do-some-work', 'custom');
  setTimeout(() => {
    span.end();
    tx.end();
    res.send('Custom span captured');
  }, 500);
});

app.post('/chain', async (req, res) => {
  const chain = req.body;
  const traceparent = req.headers['traceparent'];

  const span = apm.startSpan('express-chain-step', 'custom');
  try {
    // mark this member completed
    const member = chain.chain.members.find(m => m.name === 'expressjs');
    if (member) member.completed = true;

    // find next member (deterministic by order)
    const idx = chain.chain.members.findIndex(m => m.name === 'expressjs');
    const next = chain.chain.members[idx + 1];

    if (next) {
      // forward payload, propagating traceparent
      await fetch(next.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(traceparent ? { traceparent } : {})
        },
        body: JSON.stringify(chain)
      });
    }

    res.json(chain);
  } catch (err) {
    throw err;
  } finally {
    if (span) span.end();
  }
});

app.get('/error', (req, res) => {
  throw new Error('Boom from Express.js demo');
});

app.listen(port, () => {
  console.log(`Listening on :${port}`);
});
