# Elastic Stack on Kubernetes

A minimal Kubernetes deployment of the Elastic Stack for APM:

- **Elasticsearch 8.19** — StatefulSet (1 replica), PVC-backed storage
- **Kibana 8.19** — Deployment
- **APM Server 8.19** — Deployment, ingesting into Elasticsearch's built-in
  APM integration

All resources live in the `elastic-stack` namespace and are applied via
[kustomize](https://kustomize.io/).

## Components

| Component                | Service          | Port | Type         |
|--------------------------|------------------|------|--------------|
| Elasticsearch            | `elasticsearch`  | 9200 | LoadBalancer |
| Kibana                   | `kibana`         | 5601 | LoadBalancer |
| APM Server               | `apm-server`     | 8200 | LoadBalancer |
| OpenTelemetry Collector  | `otel-collector` | 4317/4318 | ClusterIP |

## Prerequisites

- A Kubernetes cluster and `kubectl` configured
- Cluster nodes with `vm.max_map_count >= 262144` (required by Elasticsearch):

  ```sh
  sudo sysctl -w vm.max_map_count=262144
  ```

  For a persistent setting, add `vm.max_map_count=262144` to `/etc/sysctl.conf`.

## Deploy

```sh
kubectl apply -k .
```

Check rollout status:

```sh
kubectl rollout status statefulset/elasticsearch -n elastic-stack
kubectl rollout status deployment/kibana -n elastic-stack
kubectl rollout status deployment/apm-server -n elastic-stack
```

Get the external addresses:

```sh
kubectl get svc -n elastic-stack
```

## Scripts and Task runner

Start, stop, or check the stack with the provided scripts or the
[Taskfile](https://taskfile.dev):

| Command                          | Action                                          |
|----------------------------------|-------------------------------------------------|
| `./start.sh` or `.\start.ps1`    | Deploy and wait for readiness, print endpoints  |
| `./start.sh stop` or `.\start.ps1 -Action stop` | Remove the stack                 |
| `./start.sh status` or `.\start.ps1 -Action status` | Show pods and services |
| `task start` / `task stop` / `task status` / `task logs` | Task runner equivalents |
| `task start:apps` | Build and deploy all demo apps |
| `task start:apps:<name>` | Build and deploy one demo app, e.g. `task start:apps:java` |
| `task test` | Run the Jest + Playwright test suite as a Kubernetes Job |
| `task start:heartbeat` | Deploy the Heartbeat uptime-monitor CronJob (every 45 min) |
| `task run:heartbeat` | Trigger one heartbeat check pass immediately |
| `task stop:heartbeat` | Remove the Heartbeat CronJob |
| `task start:otel` | Deploy the OpenTelemetry Collector + Instrumentation CR |
| `task stop:otel` | Remove the OpenTelemetry resources |
| `task start:filebeat` | Deploy the Filebeat DaemonSet (container logs → Elasticsearch) |
| `task stop:filebeat` | Remove the Filebeat DaemonSet |

Set `TIMEOUT` to adjust the rollout wait (default `300` seconds).

## Access

- **Kibana:** `http://<kibana-external-ip>:5601`
- **Elasticsearch:** `http://<elasticsearch-external-ip>:9200`
- **APM Server:** `http://<apm-server-external-ip>:8200`

Point APM agents at the APM Server, e.g. for an Elastic APM agent:

```
server_url: http://<apm-server-external-ip>:8200
service_name: <your-service-name>
environment: development
```

## Built-in APM integration

Since 8.15, Elasticsearch ships the `apm-data` plugin (enabled here via
`xpack.apm_data.enabled: true` in
`elasticsearch/00-configmap.yaml`), which installs the APM index templates
and ingest pipelines inside Elasticsearch. The small `apm-server` Deployment
is still required as the endpoint that APM agents report to; it writes
directly into the APM data streams managed by Elasticsearch.

The APM Server also serves the browser-based RUM agent (`apm-server.rum.enabled`
in `apm-server/01-configmap.yaml`), so the React app's requests can be traced
from the browser through the backend apps.

## Tests

A TypeScript test suite lives in `tests/` (Jest for API/integration checks,
Playwright for browser checks). It is designed to run inside the cluster as
a Kubernetes Job against the in-cluster services:

```sh
task test
```

This builds the `tests/` image, applies `tests/k8s.yaml` as the `apm-tests`
Job in the `elastic-stack` namespace, waits for completion, and prints the
logs. The suite asserts:

- Elasticsearch, Kibana and APM Server are up and healthy
- Every demo app serves its pages, `/slow` responses, and `/error` HTTP 500s
- APM data (trace/error indices) is actually ingested into Elasticsearch
- The Kibana UI loads and reports `available` status
- The React (RUM) app proxies requests to the backend apps and produces
  distributed traces shared between `react-app` and the backend services

After a run, check results with:

```sh
kubectl get job/apm-tests -n elastic-stack
kubectl logs job/apm-tests -n elastic-stack
```

All endpoints are configurable via environment variables (defaults are the
in-cluster service DNS names, see `tests/src/config.ts`), so the suite can
also run against exposed addresses:

```sh
ELASTICSEARCH_URL=http://localhost:9200 KIBANA_URL=http://localhost:5601 \
JAVA_APP_URL=http://localhost:8080 ... npm test
```

Run locally (from `tests/`) with `npm install` (plus
`npx playwright install chromium` for browser binaries), then
`npm run typecheck`, `npm run test:unit`, or `npm run test:e2e`.

## Heartbeat (uptime monitors)

[Heartbeat](https://www.elastic.co/guide/en/beats/heartbeat/8.19/index.html)
is a lightweight daemon that periodically checks service availability. A
Heartbeat **CronJob** lives in `heartbeat/` and runs every 45 minutes,
checking every server-side demo app (the React app is excluded). Each run is
a single pass over all monitors (`heartbeat.run_once: true`) that then exits.

| Monitor      | URL(s)                   | Expected status |
|--------------|--------------------------|-----------------|
| `<app>-http` | `/<app>-app:<port>/`, `/<app>-app:<port>/slow` | 200 |
| `<app>-error` | `/<app>-app:<port>/error` | 500 |

Each monitor sets `service.name` to the app's APM service name, so the
Uptime monitor links to the app's APM service in Kibana. Uptime results are
shipped to Elasticsearch (`heartbeat-*` indices) and appear in
**Observability → Uptime**.

```sh
task start:heartbeat   # replace the old Deployment with the CronJob
task run:heartbeat     # trigger one check pass now (manual Job)
task stop:heartbeat    # remove the CronJob
```

Edit `heartbeat/heartbeat.yml` (also embedded in the ConfigMap in
`heartbeat/k8s.yaml`) to change the endpoints; adjust the cadence in the
CronJob `schedule` (default `*/45 * * * *`).

## OpenTelemetry (auto-instrumentation)

The demo apps report traces twice: through their original Elastic APM agents
and through **OpenTelemetry** via the [OpenTelemetry Operator](https://opentelemetry.io/docs/kubernetes/operator/)
plus an upstream `otel/opentelemetry-collector-contrib`. The collector forwards
the OTLP traces to the APM Server, which accepts OTLP natively on port 8200
(anonymous, since this dev stack runs without security).

### Install the Operator (Helm)

The Operator injects agents automatically, and it requires
[cert-manager](https://cert-manager.io) for its webhooks:

```sh
# 1. cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true

# 2. OpenTelemetry Operator
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace opentelemetry-operator-system --create-namespace
```

### Deploy collector + Instrumentation CR

```sh
kubectl apply -f opentelemetry/collector.yaml        # collector + Service
kubectl apply -f opentelemetry/instrumentation.yaml  # Instrumentation CR
```

- `opentelemetry/collector.yaml` runs `otel/opentelemetry-collector-contrib`
  with an OTLP receiver (gRPC `4317`, HTTP `4318`), a batch processor, and an
  `otlp_grpc/apm` exporter pointing at `apm-server:8200` (`tls.insecure: true`).
- `opentelemetry/instrumentation.yaml` defines the `otel-instrumentation`
  resource that the injection annotations reference. Agents export over
  `http/protobuf` to `http://otel-collector:4318` and sample every trace.

### Annotate workloads

Add an `instrumentation.opentelemetry.io/inject-*` annotation to a Deployment
pod template to have the Operator inject the matching agent:

| App            | Annotation                                        |
|----------------|---------------------------------------------------|
| java-app       | `instrumentation.opentelemetry.io/inject-java`    |
| spring-boot-app| `instrumentation.opentelemetry.io/inject-java`    |
| openliberty-app| `instrumentation.opentelemetry.io/inject-java`    |
| expressjs-app  | `instrumentation.opentelemetry.io/inject-nodejs`  |
| python-app     | `instrumentation.opentelemetry.io/inject-python`  |
| csharp-app     | `instrumentation.opentelemetry.io/inject-dotnet`  |

Each annotation value is `<namespace>/<instrumentation-name>`, i.e.
`elastic-stack/otel-instrumentation`. The Operator injects an init container
with the agent plus `OTEL_EXPORTER_OTLP_ENDPOINT` and friends; traces then flow
`app -> otel-collector -> apm-server -> Elasticsearch` and appear in
**APM → Services** with `agent.name` `opentelemetry/...` alongside the Elastic
agents' traces.

The **react-app** (browser RUM) and **golang-app** (no auto-instrumentation
image exists for Go) are intentionally left unannotated.

## Filebeat (container logs)

[Filebeat](https://www.elastic.co/guide/en/beats/filebeat/8.19/index.html) runs
as a **DaemonSet** in `kube-system` (`filebeat/`) and ships every container's
stdout/stderr to Elasticsearch (`filebeat-*` indices), visible in
**Observability → Logs**.

It uses hints-based autodiscover: pod annotations with the `co.elastic.logs`
prefix control parsing per pod. The default is a raw `container` input, so
enabling logging explicitly is optional. For structured parsing of a workload
like nginx, annotate its pod template:

```yaml
annotations:
  co.elastic.logs/enabled: "true"
  co.elastic.logs/module: "nginx"
  co.elastic.logs/fileset.stdout: "access"
  co.elastic.logs/fileset.stderr: "error"
```

See `filebeat/example-nginx.yaml` for a complete example. Since Filebeat runs in
`kube-system`, its Elasticsearch output uses the fully-qualified service DNS
name `elasticsearch.elastic-stack.svc.cluster.local:9200` (no credentials, as
security is disabled in this dev stack).

```sh
task start:filebeat   # deploy the Filebeat DaemonSet + RBAC + ConfigMap
task stop:filebeat    # remove it
```

## Cleanup

```sh
kubectl delete -k .
```

## Notes

- This is a **development configuration**: `xpack.security` is disabled in
  Elasticsearch so services are reachable over plain HTTP without
  credentials. Enable security and TLS before any production use.
- Elasticsearch uses a 10Gi PVC via `volumeClaimTemplates`. Provide a
  `StorageClass` that supports `ReadWriteOnce` (or customize it).
- The Elasticsearch StatefulSet runs as UID `1000` (`fsGroup`) and uses
  `securityContext` accordingly.
- To scale Elasticsearch, add nodes to `discovery.seed_hosts`,
  `cluster.initial_master_nodes`, and `replicas` in the StatefulSet.
