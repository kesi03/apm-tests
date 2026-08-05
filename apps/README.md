# Demo Apps — Elastic APM Agents

Sample applications instrumented with the
[Elastic APM agents](https://www.elastic.co/docs/solutions/observability/apm/apm-agents).
Each app reports traces, metrics and errors to the APM Server deployed in the
`elastic-stack` namespace at `http://apm-server:8200`.

| App            | Language / Framework      | Agent                                        | Port |
|----------------|---------------------------|----------------------------------------------|------|
| `java`         | Java 17 (JDK `HttpServer`)| Java agent (`-javaagent`)                    | 8080 |
| `spring-boot`  | Spring Boot 3.3           | Java agent + public tracing API              | 8080 |
| `openliberty`  | Open Liberty (Jakarta EE) | Java agent via `JAVA_TOOL_OPTIONS`           | 9080 |
| `expressjs`    | Node.js / Express         | `elastic-apm-node`                           | 3000 |
| `react`        | React (RUM, browser)      | `@elastic/apm-rum`                        | 80   |
| `python`       | Python / Flask            | `elastic-apm` (Flask integration)            | 5000 |
| `csharp`       | C# / ASP.NET Core 8       | `Elastic.Apm.NetCoreAll`                     | 5000 |
| `golang`       | Go / `net/http`           | `go.elastic.co/apm` + `module/apmhttp`       | 8080 |

## Common endpoints

Each server-side app exposes the same demo routes:

- `GET /` — hello response
- `GET /greet/:name` (or `?name=`) — short simulated work (~200ms)
- `GET /slow` — simulated slow request (~1000ms)
- `GET /error` — raises/throws an error captured by the agent
- `GET /custom` — custom span/transaction (not implemented in every app)

The React app is served by nginx and additionally proxies to every backend
app, so the RUM agent can call them from the browser same-origin:

- `GET /proxy/<app>/` → `http://<app>-app:<port>/`

The page has a **Call backend apps** section with one button per app; each
click starts a RUM transaction, fetches the backend through the proxy, and
shows the response. Because nginx forwards the RUM `traceparent` header, the
backend agent continues the same trace — open the resulting transaction in
Kibana APM to see the full RUM → backend waterfall.

Generate some traffic, then look at **APM** in Kibana
(`http://<kibana-external-ip>:5601/app/apm`) to see the transactions, spans,
and errors.

## Building

Each folder is self-contained. Build its image from inside the folder:

```sh
cd apps/<name>
docker build -t elastic-apm-demo/<name>:latest .
```

The React app's APM server URL is baked in at build time (the RUM agent runs
in the browser, which cannot resolve in-cluster DNS). The default
`http://apm-server:8200` works when the page is served from inside the
cluster (e.g. the test suite). When you view the page from your own browser,
point it at a browser-reachable APM Server address:

```sh
docker build \
  --build-arg VITE_ELASTIC_APM_SERVER_URL=http://localhost:8200 \
  -t elastic-apm-demo/react-app:latest .
```

(For a local browser run, `kubectl port-forward -n elastic-stack service/apm-server 8200:8200`
makes the APM Server reachable at `http://localhost:8200`.)

## Deploying to Kubernetes

The manifests live in `apps/<name>/k8s.yaml` and deploy into the
`elastic-stack` namespace, pointing at `apm-server:8200`.

Make the image available to your cluster, then apply:

```sh
# kind
kind load docker-image elastic-apm-demo/<name>:latest

# minikube
minikube image load elastic-apm-demo/<name>:latest

# remote cluster: push to a registry and set `image:` in k8s.yaml
```

```sh
kubectl apply -f apps/<name>/k8s.yaml
```

Apps are exposed as ClusterIP services. Reach one with:

```sh
kubectl port-forward -n elastic-stack service/<name>-app <local>:<port>
# e.g. kubectl port-forward -n elastic-stack service/spring-boot-app 8080:8080
```

## Configuration

All agents are configured with environment variables
(`ELASTIC_APM_SERVER_URL`, `ELASTIC_APM_SERVICE_NAME`, `ELASTIC_APM_ENVIRONMENT`)
set in the Dockerfiles and Kubernetes manifests. Override them as needed for
your cluster.
