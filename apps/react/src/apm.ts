/// <reference types="vite/client" />

import { startBrowserSdk } from '@elastic/opentelemetry-browser'

// The classic @elastic/apm-rum agent is NOT available on Elastic Cloud
// Serverless (the RUM intake endpoint does not exist), so browser monitoring
// uses EDOT Browser (OpenTelemetry RUM). It exports OTLP over HTTP to the
// same-origin /v1/ path, which nginx proxies to the project's Managed OTLP
// Endpoint, adding the API key on the server side. This avoids CORS preflights
// and keeps the API key out of the browser bundle.
export function initRum(): void {
  startBrowserSdk({
    serviceName: import.meta.env.VITE_ELASTIC_APM_SERVICE_NAME || 'react-app',
    serviceVersion: import.meta.env.VITE_ELASTIC_APM_SERVICE_VERSION || '1.0.0',
    otlpEndpoint: window.location.origin,
    resourceAttributes: {
      'deployment.environment.name':
        import.meta.env.VITE_ELASTIC_APM_ENVIRONMENT || 'development',
    },
    logLevel: 'warn',
  })
}
