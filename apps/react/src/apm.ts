/// <reference types="vite/client" />

const DEFAULT_APM_SERVER_URL = 'http://localhost:8200'

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

export function getApmServerUrl(): string {
  if (isLocalHost(window.location.hostname)) {
    return DEFAULT_APM_SERVER_URL
  }
  return import.meta.env.VITE_ELASTIC_APM_SERVER_URL || DEFAULT_APM_SERVER_URL
}
