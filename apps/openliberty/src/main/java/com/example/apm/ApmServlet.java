package com.example.apm;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.OutputStream;

@WebServlet(urlPatterns = {"/", "/greet", "/slow", "/error", "/chain"})
public class ApmServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain; charset=UTF-8");
        switch (req.getServletPath()) {
            case "/greet" -> {
                sleepQuietly(200);
                String name = req.getParameter("name");
                resp.getWriter().write("Hello, " + (name == null ? "world" : name) + "!");
            }
            case "/slow" -> {
                sleepQuietly(1000);
                resp.getWriter().write("Slow response");
            }
            case "/error" -> throw new RuntimeException("Boom from Open Liberty demo");
            default -> resp.getWriter().write("Hello from Open Liberty (Elastic APM)");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json; charset=UTF-8");
        // read body
        String body = new String(req.getInputStream().readAllBytes());
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        java.util.Map<String, Object> payload;
        try {
            payload = mapper.readValue(body, java.util.Map.class);
        } catch (Exception e) {
            resp.setStatus(400);
            resp.getWriter().write("{\"error\": \"invalid json\"}");
            return;
        }

        java.util.Map<String, Object> chain = (java.util.Map<String, Object>) payload.get("chain");
        java.util.List<java.util.Map<String, Object>> members = (java.util.List<java.util.Map<String, Object>>) chain.get("members");
        int idx = -1;
        for (int i = 0; i < members.size(); i++) {
            java.util.Map<String, Object> m = members.get(i);
            if ("openliberty".equals(m.get("name"))) {
                m.put("completed", true);
                idx = i;
                break;
            }
        }

        if (idx >= 0 && idx + 1 < members.size()) {
            java.util.Map<String, Object> next = members.get(idx + 1);
            String nextUrl = (String) next.get("url");
            try {
                java.net.URL url = new java.net.URL(nextUrl);
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json");
                String traceparent = req.getHeader("traceparent");
                if (traceparent != null) conn.setRequestProperty("traceparent", traceparent);

                String outBody = mapper.writeValueAsString(payload);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(outBody.getBytes());
                }
                conn.getResponseCode();
            } catch (Exception e) {
                // ignore for demo
            }
        }

        resp.getWriter().write(mapper.writeValueAsString(payload));
    }

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
