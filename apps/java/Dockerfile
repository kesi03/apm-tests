FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
ARG APM_AGENT_VERSION=1.56.0
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests \
    && mvn -B dependency:copy -Dartifact=co.elastic.apm:elastic-apm-agent:${APM_AGENT_VERSION} -DoutputDirectory=target

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/elastic-apm-agent-*.jar ./elastic-apm-agent.jar
COPY --from=build /app/target/app.jar ./app.jar
EXPOSE 8080
ENV ELASTIC_APM_SERVER_URL=http://apm-server:8200 \
    ELASTIC_APM_SERVICE_NAME=java-app \
    ELASTIC_APM_ENVIRONMENT=development
ENTRYPOINT ["java", "-javaagent:elastic-apm-agent.jar", "-jar", "app.jar"]
