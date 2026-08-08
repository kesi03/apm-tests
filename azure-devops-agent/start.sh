#!/bin/bash

set -e

if [ -z "${AZURE_DEVOPS_EXTENSION_PAT}" ]; then
    echo "AZURE_DEVOPS_EXTENSION_PAT is not set"
    exit 1
fi

if [ -z "${AZURE_DEVOPS_URL}" ]; then
    echo "AZURE_DEVOPS_URL is not set"
    exit 1
fi

if [ -z "${AZURE_DEVOPS_POOL}" ]; then
    AZURE_DEVOPS_POOL="default"
fi

./config.sh \
    --unattended \
    --url "${AZURE_DEVOPS_URL}" \
    --auth pat \
    --token "${AZURE_DEVOPS_EXTENSION_PAT}" \
    --pool "${AZURE_DEVOPS_POOL}" \
    --agent "$(hostname)-${AZP_AGENT_SUFFIX}" \
    --work _work \
    --replace \
    --acceptteeeula

./run.sh
