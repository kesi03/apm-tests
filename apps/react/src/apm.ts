/// <reference types="vite/client" />

import { init as initApm } from '@elastic/apm-rum'

export function initRum(): void {
  initApm({
    serviceName: import.meta.env.VITE_ELASTIC_APM_SERVICE_NAME || 'react-app',
    serviceVersion: import.meta.env.VITE_ELASTIC_APM_SERVICE_VERSION || '1.0.0',
    serverUrl: window.location.origin,
    environment:
      import.meta.env.VITE_ELASTIC_APM_ENVIRONMENT || 'development',
  })
}
