FROM golang:1.25 AS build
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/apm-demo .

FROM alpine:3.20
RUN adduser -D -u 1000 app
USER app
WORKDIR /app
COPY --from=build /app/apm-demo .
EXPOSE 8080
ENV ELASTIC_APM_SERVER_URL=http://apm-server:8200 \
    ELASTIC_APM_SERVICE_NAME=golang-app \
    ELASTIC_APM_ENVIRONMENT=development
ENTRYPOINT ["/app/apm-demo"]
