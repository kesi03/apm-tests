import React from 'react'
import { createRoot } from 'react-dom/client'
import { init as initApm } from '@elastic/apm-rum'
import App from './App.jsx'
import './index.css'
import { getApmServerUrl } from './apm'

// Initialize the RUM agent before rendering the app.
initApm({
  serviceName: import.meta.env.VITE_ELASTIC_APM_SERVICE_NAME || 'react-app',
  serverUrl: getApmServerUrl(),
  environment: import.meta.env.VITE_ELASTIC_APM_ENVIRONMENT || 'development',
  pageLoadTransactionName: 'home',
  // allow the RUM agent to add trace headers to calls to backend services
  distributedTracingOrigins: [window.location.origin, 'http://expressjs-app.elastic-stack.svc.cluster.local:3000', 'http://java-app.elastic-stack.svc.cluster.local:8080']
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
