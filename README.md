# Elastic APM Demo on Kubernetes

Demo apps instrumented with Elastic APM agents, shipping telemetry to a
**managed Elastic Cloud** deployment (`my-observability-project-d54a32`) instead
of a self-hosted Elastic Stack:

- **Elastic Cloud APM Server** — receives APM/OTLP telemetry from the demo apps
- **Elastic Cloud Elasticsearch** — stores traces, metrics, and heartbeat data
- **Elastic Cloud Kibana** — UI for Observability (APM, Uptime, Logs)

All Kubernetes resources live in the `elastic-stack` namespace and are applied
via [kustomize](https://kustomize.io/).

## Elastic Cloud endpoints

| Component | Endpoint |
|-----------|----------|
| APM Server | `https://my-observability-project-d54a32.apm.europe-west2.gcp.elastic.cloud:443` |
| Elasticsearch | `https://my-observability-project-d54a32.es.europe-west2.gcp.elastic.cloud:443` |
| Kibana | `https://my-observability-project-d54a32.kb.europe-west2.gcp.elastic.cloud:443` |

Authentication uses **API keys** (base64 `id:key`):

- `apps/secret.yaml` creates Secret `elastic-apm` with the **APM API key**
  (key `token`). Demo apps reference it via `secretKeyRef` as
  `ELASTIC_APM_API_KEY`.
- `tests/k8s.yaml` and `heartbeat/` embed **Elasticsearch API key(s)** for
  querying/writing data. Note that libbeat (heartbeat) expects the raw
  `id:key` form and base64-encodes it itself; the already-encoded form
  produces `401 invalid ApiKey value`.

## Components

| Component | Description |
|-----------|-------------|
| 8 demo apps (`apps/`) | Java, Spring Boot, OpenLiberty, Express.js, Python/Flask, C#/.NET, Go, React (RUM) |
| `otel-collector` | OpenTelemetry Collector forwarding OTLP traces to the cloud APM |
| `heartbeat` | Uptime CronJob (every 45 min) writing `heartbeat-*` to the cloud ES |
| `azure-devops-agent` | Azure DevOps self-hosted agent + health sidecar |
| `filebeat` | Log shipping DaemonSet (left unchanged; see note below) |

## Prerequisites

- A Kubernetes cluster and `kubectl` configured
- Docker (for building app images), e.g. Rancher Desktop

## Deploy

Apply the base resources (namespace, APM secret, azure-devops-agent):

```sh
kubectl apply -k .
```

Build and deploy the demo apps:

```sh
task start:apps            # all apps
task start:apps:<name>     # one app, e.g. task start:apps:java
```

Check status:

```sh
kubectl get pods -n elastic-stack
```

## Scripts and Task runner

Start, stop, or check with the provided scripts or the
[Taskfile](https://taskfile.dev):

| Command                          | Action                                          |
|----------------------------------|-------------------------------------------------|
| `./start.sh` or `.\start.ps1`    | Apply base resources and print endpoints        |
| `./start.sh stop` or `.\start.ps1 -Action stop` | Remove the stack                 |
| `./start.sh status` or `.\start.ps1 -Action status` | Show pods and services |
| `task start` / `task stop` / `task status` / `task logs` | Task runner equivalents |
| `task start:apps` | Build and deploy all demo apps |
| `task start:apps:<name>` | Build and deploy one demo app |
| `task test` | Run the Jest + Playwright test suite as a Kubernetes Job |
| `task start:heartbeat` | Deploy the Heartbeat uptime-monitor CronJob (every 45 min) |
| `task run:heartbeat` | Trigger one heartbeat check pass immediately |
| `task stop:heartbeat` | Remove the Heartbeat CronJob |
| `task start:otel` | Deploy the OpenTelemetry Collector |
| `task stop:otel` | Remove the OpenTelemetry resources |
| `task start:filebeat` | Deploy the Filebeat DaemonSet |
| `task stop:filebeat` | Remove the Filebeat DaemonSet |

Set `TIMEOUT` to adjust rollout waits (default `300` seconds).

## Demo apps

Each server-side app's `k8s.yaml` configures the Elastic APM agent with:

```yaml
env:
  - name: ELASTIC_APM_SERVER_URL
    value: "https://my-observability-project-d54a32.apm.europe-west2.gcp.elastic.cloud:443"
  - name: ELASTIC_APM_API_KEY
    valueFrom:
      secretKeyRef:
        name: elastic-apm
        key: token
```

The React app uses **EDOT Browser** (OpenTelemetry RUM) because the classic
`@elastic/apm-rum` agent is not available on Elastic Cloud Serverless. It
exports OTLP over HTTP to the same-origin `/v1/` path, which nginx
(`apps/react/nginx.conf`) proxies to the project's **Managed OTLP Endpoint**
(`https://my-observability-project-d54a32.ingest.europe-west2.gcp.elastic.cloud:443`),
injecting the OTLP API key on the server side. Browser telemetry then appears
in **APM → Services** (service `react-app`) and **Discover**.

## Tests

A TypeScript test suite lives in `tests/` (Jest for API/integration checks,
Playwright for browser checks). It runs inside the cluster as a Kubernetes Job:

```sh
task test
```

This builds the `tests/` image, applies `tests/k8s.yaml` as the `apm-tests`
Job in the `elastic-stack` namespace, waits for completion, and prints the
logs. The suite asserts:

- Elastic Cloud APM and Elasticsearch endpoints respond to the configured API keys
- Every demo app serves its pages, `/slow` responses, and `/error` HTTP 500s
- APM data is ingested (indexed) in Elasticsearch when the ES API key has
  privileges; otherwise those assertions are **skipped**
- The React (RUM) app proxies requests to the backend apps and produces
  distributed traces shared between `react-app` and the backend services

Endpoints and API keys are configurable via environment variables (defaults in
`tests/src/config.ts` and `tests/k8s.yaml`). After a run:

```sh
kubectl get job/apm-tests -n elastic-stack
kubectl logs job/apm-tests -n elastic-stack
```

Run locally (from `tests/`) with `npm install` (plus
`npx playwright install chromium` for browser binaries), then
`npm run typecheck`, `npm run test:unit`, or `npm run test:e2e`.

## Heartbeat (uptime monitors)

[Heartbeat](https://www.elastic.co/guide/en/beats/heartbeat/8.19/index.html)
runs as a **CronJob** every 45 minutes, checking every server-side demo app
(the React app is excluded) plus the azure-devops-agent health sidecar. Each
run is a single pass over all monitors (`heartbeat.run_once: true`) that then
exits.

| Monitor      | URL(s)                   | Expected status |
|--------------|--------------------------|-----------------|
| `<app>-http` | `/<app>-app:<port>/`, `/<app>-app:<port>/slow` | 200 |
| `<app>-error` | `/<app>-app:<port>/error` | 500 |

Uptime results are shipped to the **cloud Elasticsearch** (`heartbeat-*`
indices) and appear in **Observability → Uptime** in cloud Kibana. The output
is authenticated with an ES API key; libbeat needs the raw `id:key` form (it
base64-encodes it internally — passing pre-encoded base64 yields `401 invalid
ApiKey value`).

> **Note:** The serverless project does not grant the ES privileges Heartbeat
> needs (`monitor` + `heartbeat-*` write), so Heartbeat is being **replaced by
> a Synthetics project** (below). The CronJob is kept until the migration is
> complete.

```sh
task start:heartbeat   # deploy the CronJob
task run:heartbeat     # trigger one check pass now (manual Job)
task stop:heartbeat    # remove the CronJob
```

Edit `heartbeat/heartbeat.yml` (also embedded in the ConfigMap in
`heartbeat/k8s.yaml`) to change the endpoints; adjust the cadence in the
CronJob `schedule` (default `*/45 * * * *`).

## Synthetics project monitors (replaces Heartbeat)

The uptime monitors are migrated to a [Synthetics project](https://www.elastic.co/docs/solutions/observability/synthetics/create-monitors-with-projects)
so they can run against the serverless project. The monitors are lightweight
HTTP checks defined in `synthetics/lightweight/apm-demo.yaml` and run on a
**Private Location** (`apm-demo-private`), i.e. an Elastic Agent deployed in
this cluster, so they can reach the in-cluster app services.

### 1. Create the private location and deploy the agent

1. Create the private location in Kibana: **Observability → Synthetics →
   Settings → Private Locations → Create location** named `apm-demo-private`
   (this creates an agent policy with the Synthetics integration).
2. From **Fleet** grab the enrollment token for that policy and the Fleet
   server URL, then create the enrollment secret and deploy the agent:

   ```sh
   kubectl create secret generic fleet-enrollment -n elastic-stack \
     --from-literal=FLEET_URL=<fleet-server-url> \
     --from-literal=FLEET_ENROLLMENT_TOKEN=<enrollment-token>
   task start:synthetics-agent
   ```

   The agent DaemonSet lives in `synthetics/agent/` and runs the
   `elastic-agent` image with `NET_RAW`/`SETUID` capabilities. Adjust the image
   version to one supported by the project's Fleet if enrollment fails.

### 2. Push the monitors

```sh
export SYNTHETICS_API_KEY=<project api key from Synthetics > Settings > Project API keys>
task push:synthetics
```

This pushes the 22 lightweight monitors (`synthetics/lightweight/apm-demo.yaml`)
to the `apm-demo` project on the private location. Monitors then run from the
agent and results appear in **Observability → Synthetics**. Heartbeat's CronJob
can be removed once they are running:

```sh
task stop:heartbeat
```

Synthetics schedules must be one of `1,2,3,5,10,15,20,30,60,120,240` minutes.

## OpenTelemetry (auto-instrumentation)

The demo apps report traces twice: through their original Elastic APM agents
and through **OpenTelemetry** via the [OpenTelemetry Operator](https://opentelemetry.io/docs/kubernetes/operator/)
plus an upstream `otel/opentelemetry-collector-contrib`. The collector
forwards OTLP data to the **local APM Server**.

```sh
kubectl apply -f opentelemetry/collector.yaml        # collector + Service
kubectl apply -f opentelemetry/instrumentation.yaml  # Instrumentation CR (optional)
```

- `opentelemetry/collector.yaml` runs an OTLP receiver (gRPC `4317`, HTTP
  `4318`), a batch processor, and an `otlphttp/apm` exporter pointing at the
  local `apm-server:8200`.
- Instrumented apps' OTel agents export to `http://otel-collector:4318`;
  traces then flow `app -> otel-collector -> local APM Server -> local ES` and appear
  in **APM → Services** with `agent.name` `opentelemetry/...`.

The **react-app** (browser RUM) and **golang-app** (no auto-instrumentation
image exists for Go) are intentionally left unannotated.

## Filebeat (container logs)

[Filebeat](https://www.elastic.co/guide/en/beats/filebeat/8.19/index.html) runs
as a **DaemonSet** in `kube-system` (`filebeat/`). It is **left unchanged**
from the self-hosted setup and still points at the removed in-cluster
Elasticsearch (`elasticsearch.elastic-stack.svc.cluster.local:9200`), so it
currently ships no data. Reconfigure its output to the cloud ES (with an API
key) if container-log shipping is wanted.

## Cleanup

```sh
kubectl delete -k .
```

## Notes

- The APM "secret token" provided by the Elastic Cloud deployment is actually
  an **API key**; apps must use `ELASTIC_APM_API_KEY` (an `Authorization:
  ApiKey` header), not `ELASTIC_APM_SECRET_TOKEN`.
- Cluster-resource demands are modest; on small dev clusters (e.g. Rancher
  Desktop with 2 vCPU/2 GB) deploy the JVM apps one at a time to avoid CPU
  starvation and liveness crash-loops.
