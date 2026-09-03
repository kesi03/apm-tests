/// <reference types="vite/client" />

import { startBrowserSdk } from '@elastic/opentelemetry-browser'

// Browser monitoring uses EDOT Browser (OpenTelemetry RUM). It exports OTLP
// over HTTP to the same-origin /v1/ path, which nginx proxies to the local
// OpenTelemetry Collector. This avoids CORS preflights.
export function initRum(): void {
  // EDOT Browser 0.3.0 wraps setImmediate even though it is not a standard
  // browser API. Provide the same scheduling behavior as setTimeout(0).
  const browserWindow = window as Window & { setImmediate?: typeof window.setTimeout }
  if (typeof browserWindow.setImmediate !== 'function') {
    browserWindow.setImmediate = (handler, ...args) =>
      window.setTimeout(handler, 0, ...args)
  }

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
