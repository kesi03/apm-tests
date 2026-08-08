FROM ubuntu:22.04

ARG AGENT_VERSION=5.277.0
ARG TARGETARCH

ENV DEBIAN_FRONTEND=noninteractive
ENV AZURE_DEVOPS_URL=https://dev.azure.com/mockholm
ENV AZURE_DEVOPS_POOL=mockholmian

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        jq \
        tar \
        wget \
        zip \
        unzip \
        build-essential \
        libcurl4 \
        libicu70 \
        libkrb5-3 \
        liblttng-ust1 \
        libssl3 \
        zlib1g \
        && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1001 -s /bin/bash azp && \
    mkdir -p /azp && \
    chown azp:azp /azp

WORKDIR /azp

COPY start.sh /azp/start.sh
RUN chmod +x /azp/start.sh

RUN wget -q -O /tmp/agent.tar.gz \
        "https://download.agent.dev.azure.com/agent/${AGENT_VERSION}/vsts-agent-linux-x64-${AGENT_VERSION}.tar.gz" && \
    tar -zxvf /tmp/agent.tar.gz -C /azp && \
    rm /tmp/agent.tar.gz && \
    chown -R azp:azp /azp

USER azp

ENTRYPOINT ["./start.sh"]
