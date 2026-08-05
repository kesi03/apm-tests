const env = (name: string, fallback: string): string => process.env[name] || fallback;

export const config = {
  stack: {
    elasticsearch: env('ELASTICSEARCH_URL', 'http://elasticsearch:9200'),
    kibana: env('KIBANA_URL', 'http://kibana:5601'),
    apmServer: env('APM_SERVER_URL', 'http://apm-server:8200')
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
