#!/usr/bin/env pwsh
# Start / stop the shared resources (namespace, secrets, agents) deployed by
# the kustomization in this repository. Elastic APM uses Elastic Cloud.
#
# Usage:
#   .\start.ps1            # deploy and wait for readiness
#   .\start.ps1 -Action stop
#   .\start.ps1 -Action status
param(
    [ValidateSet('start', 'stop', 'status')]
    [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'

$Namespace = 'elastic-stack'
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Timeout = if ($env:TIMEOUT) { $env:TIMEOUT } else { '300' }

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    throw 'kubectl is not installed or not on PATH'
}

kubectl cluster-info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Cannot reach a Kubernetes cluster. Is kubectl configured?'
}

function Start-Stack {
    Write-Host 'Deploying shared resources (namespace, secrets, agents)...' -ForegroundColor Cyan
    kubectl apply -k $RootDir
    if ($LASTEXITCODE -ne 0) { throw 'kubectl apply failed' }

    Show-Endpoints
}

function Show-Endpoints {
    Write-Host ''
    Write-Host "==== Services (namespace: $Namespace) ====" -ForegroundColor Green
    kubectl get svc -n $Namespace
    Write-Host ''
    Write-Host "==== Elastic Cloud endpoints ====" -ForegroundColor Green
    Write-Host '  APM:           https://my-observability-project-d54a32.apm.europe-west2.gcp.elastic.cloud:443'
    Write-Host '  Elasticsearch: https://my-observability-project-d54a32.es.europe-west2.gcp.elastic.cloud:443'
    Write-Host ''
}

function Stop-Stack {
    Write-Host 'Stopping Elastic Stack...' -ForegroundColor Cyan
    kubectl delete -k $RootDir --ignore-not-found=true
    Write-Host 'Done.'
}

function Show-Status {
    kubectl get pods,svc -n $Namespace -l app.kubernetes.io/part-of=elastic-stack
}

switch ($Action) {
    'start'  { Start-Stack }
    'stop'   { Stop-Stack }
    'status' { Show-Status }
}
