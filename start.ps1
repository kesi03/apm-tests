#!/usr/bin/env pwsh
# Start / stop the Elastic Stack (Elasticsearch + Kibana + APM Server)
# deployed by the kustomization in this repository.
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
    Write-Host 'Deploying Elastic Stack (Elasticsearch, Kibana, APM Server)...' -ForegroundColor Cyan
    kubectl apply -k $RootDir
    if ($LASTEXITCODE -ne 0) { throw 'kubectl apply failed' }

    Write-Host 'Waiting for Elasticsearch...' -ForegroundColor Cyan
    kubectl rollout status statefulset/elasticsearch -n $Namespace --timeout="${Timeout}s"
    if ($LASTEXITCODE -ne 0) { throw 'Elasticsearch rollout did not complete' }

    Write-Host 'Waiting for Kibana...' -ForegroundColor Cyan
    kubectl rollout status deployment/kibana -n $Namespace --timeout="${Timeout}s"
    if ($LASTEXITCODE -ne 0) { throw 'Kibana rollout did not complete' }

    Write-Host 'Waiting for APM Server...' -ForegroundColor Cyan
    kubectl rollout status deployment/apm-server -n $Namespace --timeout="${Timeout}s"
    if ($LASTEXITCODE -ne 0) { throw 'APM Server rollout did not complete' }

    Show-Endpoints
}

function Show-Endpoints {
    Write-Host ''
    Write-Host "==== Services (namespace: $Namespace) ====" -ForegroundColor Green
    kubectl get svc -n $Namespace
    Write-Host ''

    $targets = @(
        @{ Name = 'elasticsearch'; Port = 9200 },
        @{ Name = 'kibana';       Port = 5601 },
        @{ Name = 'apm-server';   Port = 8200 }
    )

    foreach ($t in $targets) {
        $lb = kubectl get svc $t.Name -n $Namespace -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        if (-not $lb) {
            $lb = kubectl get svc $t.Name -n $Namespace -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>$null
        }
        if ($lb) {
            Write-Host ("  http://{0}:{1}  ({2})" -f $lb, $t.Port, $t.Name)
        }
        else {
            Write-Host ("  {0}: no external IP yet. Try:" -f $t.Name)
            Write-Host ("    kubectl port-forward -n {0} svc/{1} {2}" -f $Namespace, $t.Name, $t.Port)
        }
    }
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
