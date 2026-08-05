// The Elastic APM Node.js agent must be required and started FIRST,
// before any other module (express, etc.).
const apm = require('elastic-apm-node').start({
  serviceName: process.env.ELASTIC_APM_SERVICE_NAME || 'express-app',
  serverUrl: process.env.ELASTIC_APM_SERVER_URL || 'http://apm-server:8200',
  environment: process.env.ELASTIC_APM_ENVIRONMENT || 'development'
});

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

app.get('/error', (req, res) => {
  throw new Error('Boom from Express.js demo');
});

app.listen(port, () => {
  console.log(`Listening on :${port}`);
});
