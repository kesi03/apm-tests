const env = (name: string, fallback: string): string => process.env[name] || fallback;

export const config = {
  stack: {
    elasticsearch: env(
      'ELASTICSEARCH_URL',
      'https://my-observability-project-d54a32.es.europe-west2.gcp.elastic.cloud:443'
    ),
    // Full-privilege API key for the Elastic Cloud deployment. Leave empty to
    // skip ES-backed assertions (they are skipped when access is denied).
    elasticsearchApiKey: env('ELASTICSEARCH_API_KEY', ''),
    kibana: env('KIBANA_URL', 'https://my-observability-project-d54a32.kb.europe-west2.gcp.elastic.cloud:443'),
    apmServer: env(
      'APM_SERVER_URL',
      'https://my-observability-project-d54a32.apm.europe-west2.gcp.elastic.cloud:443'
    ),
    apmApiKey: env('APM_API_KEY', 'QkR1dzRwOEI0a2lFamVIMU9LeGI6b1RsV3BuT1NNcEYwWGpYY0dvWGgzUQ==')
  },
  apps: {
    java: env('JAVA_APP_URL', 'http://java-app:8080'),
    springBoot: env('SPRING_BOOT_APP_URL', 'http://spring-boot-app:8080'),
    openLiberty: env('OPENLIBERTY_APP_URL', 'http://openliberty-app:9080'),
    expressjs: env('EXPRESSJS_APP_URL', 'http://expressjs-app:3000'),
    react: env('REACT_APP_URL', 'http://react-app'),
    python: env('PYTHON_APP_URL', 'http://python-app:5000'),
    csharp: env('CSHARP_APP_URL', 'http://csharp-app:5000'),
    golang: env('GOLANG_APP_URL', 'http://golang-app:8080')
  }
};
