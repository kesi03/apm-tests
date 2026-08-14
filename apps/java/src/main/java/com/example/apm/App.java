package com.example.apm;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class App {

    @FunctionalInterface
    private interface Handler {
        void handle(HttpExchange exchange) throws IOException;
    }

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

        server.createContext("/", new IndexHandler());
        server.createContext("/greet", new GreetHandler());
        server.createContext("/slow", new SlowHandler());
        server.createContext("/error", new ErrorHandler());
        server.createContext("/chain", new ChainHandler());

        server.setExecutor(Executors.newFixedThreadPool(4));
        server.start();
        System.out.println("Listening on :8080");
    }

    private static final class IndexHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            App.handle(exchange, App::index);
        }
    }

    private static final class GreetHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            App.handle(exchange, App::greet);
        }
    }

    private static final class SlowHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            App.handle(exchange, App::slow);
        }
    }

    private static final class ErrorHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            App.handle(exchange, App::error);
        }
    }

    private static void handle(HttpExchange exchange, Handler handler) throws IOException {
        // The Elastic APM Java agent auto-instruments the JDK HttpServer: it
        // creates one transaction per request, continues the traceparent header
        // for distributed tracing, and captures uncaught exceptions as errors.
        try {
            handler.handle(exchange);
        } catch (Throwable t) {
            respondError(exchange, 500, "Boom from plain Java demo");
            throw t;
        } finally {
            exchange.close();
        }
    }

    private static void index(HttpExchange exchange) throws IOException {
        respond(exchange, "Hello from plain Java (Elastic APM)");
    }

    private static void greet(HttpExchange exchange) throws IOException {
        sleepQuietly(200);
        String name = exchange.getRequestURI().getRawQuery();
        respond(exchange, "Hello, " + (name == null ? "world" : name) + "!");
    }

    private static void slow(HttpExchange exchange) throws IOException {
        sleepQuietly(1000);
        respond(exchange, "Slow response");
    }

    private static void error(HttpExchange exchange) {
        throw new IllegalStateException("Boom from plain Java demo");
    }

    private static void respond(HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes();
        exchange.getResponseHeaders().add("Content-Type", "text/plain");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static void respondError(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes();
        exchange.getResponseHeaders().add("Content-Type", "text/plain");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static final class ChainHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                respondError(exchange, 405, "Method Not Allowed");
                return;
            }

            // read body
            byte[] body = exchange.getRequestBody().readAllBytes();
            String txt = new String(body);

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<String, Object> payload;
            try {
                payload = mapper.readValue(txt, java.util.Map.class);
            } catch (Exception e) {
                respondError(exchange, 400, "invalid json");
                return;
            }

            // mark this member completed
            java.util.Map<String, Object> chain = (java.util.Map<String, Object>) payload.get("chain");
            java.util.List<java.util.Map<String, Object>> members = (java.util.List<java.util.Map<String, Object>>) chain.get("members");
            int idx = -1;
            for (int i = 0; i < members.size(); i++) {
                java.util.Map<String, Object> m = members.get(i);
                if ("java".equals(m.get("name"))) {
                    m.put("completed", true);
                    idx = i;
                    break;
                }
            }

            // forward to next
            if (idx >= 0 && idx + 1 < members.size()) {
                java.util.Map<String, Object> next = members.get(idx + 1);
                String nextUrl = (String) next.get("url");
                try {
                    java.net.URL url = new java.net.URL(nextUrl);
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", "application/json");
                    String traceparent = exchange.getRequestHeaders().getFirst("traceparent");
                    if (traceparent != null) conn.setRequestProperty("traceparent", traceparent);

                    String outBody = mapper.writeValueAsString(payload);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(outBody.getBytes());
                    }
                    conn.getResponseCode();
                } catch (Exception e) {
                    // ignore in demo
                }
            }

            // respond with modified payload
            byte[] out = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(payload);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, out.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(out);
            }
        }
    }
}
