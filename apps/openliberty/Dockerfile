FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

FROM openliberty/open-liberty:full-java17-openj9-ubi
ARG APM_AGENT_VERSION=1.56.0
USER root
RUN curl -sSL -o /config/elastic-apm-agent.jar \
    "https://repo1.maven.org/maven2/co/elastic/apm/elastic-apm-agent/${APM_AGENT_VERSION}/elastic-apm-agent-${APM_AGENT_VERSION}.jar" \
    && chown 1001:0 /config/elastic-apm-agent.jar
USER 1001
COPY --from=build /app/target/openliberty-apm.war /config/apps/
COPY src/main/liberty/config/server.xml /config/
ENV JAVA_TOOL_OPTIONS="-javaagent:/config/elastic-apm-agent.jar" \
    ELASTIC_APM_SERVER_URL=http://apm-server:8200 \
    ELASTIC_APM_SERVICE_NAME=openliberty-app \
    ELASTIC_APM_ENVIRONMENT=development
EXPOSE 9080
