# Azure DevOps agent build and deploy

This project builds the custom Azure DevOps agent image in GitHub Actions and publishes it to Docker Hub, then deploys it to the Kubernetes cluster.

## Required GitHub secrets

Set these in the repository settings:

- `DOCKERHUB_USERNAME` — your Docker Hub username, e.g. `mockholm`
- `DOCKERHUB_TOKEN` — your Docker Hub access token or password

Example:

```bash
DOCKERHUB_USERNAME=mockholm
DOCKERHUB_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
```

## Build workflow

The workflow is in `.github/workflows/azure-devops-agent.yml`.

It runs on:
- manual dispatch (`workflow_dispatch`)
- pushes to `main` that touch `devops/azure-devops-agent/**`

It builds:
- `mockholm/azure-devops-agent:latest`
- `mockholm/azure-devops-agent:<git-sha>`

## Runtime secret for Azure DevOps PAT

The agent requires the Azure DevOps PAT at runtime. The Kubernetes Secret is defined in `devops/azure-devops-agent/secret.yaml`.

Update the placeholder before applying:

```yaml
stringData:
  AZURE_DEVOPS_EXTENSION_PAT: "REPLACE_WITH_AZURE_DEVOPS_PAT"
```

Example real value:

```yaml
stringData:
  AZURE_DEVOPS_EXTENSION_PAT: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

or inject the value from your secret manager / CI system.

## Deployment image

The deployment uses:

```yaml
image: mockholm/azure-devops-agent:latest
```

This image is pulled from Docker Hub at runtime by the Kubernetes cluster.
