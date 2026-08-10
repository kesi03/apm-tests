#!/usr/bin/env bash
#
# Start / stop the shared resources (namespace, secrets, agents) deployed by
# the kustomization in this repository. Elastic APM uses Elastic Cloud.
#
# Usage:
#   ./start.sh          # deploy and wait for readiness
#   ./start.sh stop     # remove the stack
#   ./start.sh status   # show pods and services
#
set -euo pipefail

NAMESPACE="elastic-stack"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMEOUT="${TIMEOUT:-300}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl is not installed or not on PATH" >&2
  exit 1
fi

if ! kubectl cluster-info >/dev/null 2>&1; then
  echo "ERROR: cannot reach a Kubernetes cluster. Is kubectl configured?" >&2
  exit 1
fi

usage() {
  echo "Usage: $0 [start|stop|status]" >&2
  exit 1
}

start_stack() {
  echo "Deploying shared resources (namespace, secrets, agents)..."
  kubectl apply -k "$ROOT_DIR"

  print_endpoints
}

print_endpoints() {
  echo
  echo "==== Services (namespace: ${NAMESPACE}) ===="
  kubectl get svc -n "$NAMESPACE"
  echo
  echo "==== Elastic Cloud endpoints ===="
  echo "  APM:           https://my-observability-project-d54a32.apm.europe-west2.gcp.elastic.cloud:443"
  echo "  Elasticsearch: https://my-observability-project-d54a32.es.europe-west2.gcp.elastic.cloud:443"
  echo
}

stop_stack() {
  echo "Stopping Elastic Stack..."
  kubectl delete -k "$ROOT_DIR" --ignore-not-found=true
  echo "Done."
}

show_status() {
  kubectl get pods,svc -n "$NAMESPACE" -l app.kubernetes.io/part-of=elastic-stack
}

case "${1:-start}" in
  start)  start_stack ;;
  stop)   stop_stack ;;
  status) show_status ;;
  *)      usage ;;
esac
