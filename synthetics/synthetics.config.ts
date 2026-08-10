import type { SyntheticsConfig } from '@elastic/synthetics';

// Project settings for the Elastic Cloud (serverless) Observability project.
// Monitors are defined as lightweight HTTP monitors in lightweight/*.yaml and
// pushed with: npx @elastic/synthetics push --auth $SYNTHETICS_API_KEY
export default (): SyntheticsConfig => ({
  // Default location for monitors that don't specify one. All lightweight
  // monitors run on the "apm-demo-private" Private Location so they can reach
  // in-cluster service DNS names.
  monitor: {
    schedule: 60,
    privateLocations: ['apm-demo-private'],
  },
  project: {
    id: 'apm-demo',
    url: 'https://my-observability-project-d54a32.kb.europe-west2.gcp.elastic.cloud:443',
    space: 'default',
  },
});
