#!/bin/bash

set -e

if ! command -v dockerd >/dev/null 2>&1; then
    echo "Docker daemon is not installed"
    exit 1
fi

dockerd --host=unix:///var/run/docker.sock >/var/log/dockerd.log 2>&1 &

until docker info >/dev/null 2>&1; do
    sleep 2
done

exec su -s /bin/bash azp -c /azp/start-agent.sh
