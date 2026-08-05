#!/usr/bin/env bash
#
# Start / stop the Elastic Stack (Elasticsearch + Kibana + APM Server)
# deployed by the kustomization in this repository.
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
  echo "Deploying Elastic Stack (Elasticsearch, Kibana, APM Server)..."
  kubectl apply -k "$ROOT_DIR"

  echo "Waiting for Elasticsearch..."
  kubectl rollout status statefulset/elasticsearch -n "$NAMESPACE" --timeout="${TIMEOUT}s"

  echo "Waiting for Kibana..."
  kubectl rollout status deployment/kibana -n "$NAMESPACE" --timeout="${TIMEOUT}s"

  echo "Waiting for APM Server..."
  kubectl rollout status deployment/apm-server -n "$NAMESPACE" --timeout="${TIMEOUT}s"

  print_endpoints
}

print_endpoints() {
  echo
  echo "==== Services (namespace: ${NAMESPACE}) ===="
  kubectl get svc -n "$NAMESPACE"
  echo

  for entry in "elasticsearch:9200" "kibana:5601" "apm-server:8200"; do
    svc="${entry%%:*}"
    port="${entry##*:}"
    lb="$(kubectl get svc "$svc" -n "$NAMESPACE" \
      -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
    if [ -z "$lb" ]; then
      lb="$(kubectl get svc "$svc" -n "$NAMESPACE" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)"
    fi
    if [ -n "$lb" ]; then
      echo "  http://${lb}:${port}  (${svc})"
    else
      echo "  ${svc}: no external IP yet. Try:"
      echo "    kubectl port-forward -n ${NAMESPACE} svc/${svc} ${port}"
    fi
  done
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
