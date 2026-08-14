package com.example.apm;

import co.elastic.apm.api.ElasticApm;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;

@RestController
public class ApmController {

    @GetMapping("/")
    public String index() {
        return "Hello from Spring Boot (Elastic APM)";
    }

    @GetMapping("/greet/{name}")
    public String greet(@PathVariable String name) throws InterruptedException {
        Thread.sleep(200);
        return "Hello, " + name + "!";
    }

    @GetMapping("/slow")
    public String slow() throws InterruptedException {
        Thread.sleep(1000);
        return "Slow response";
    }

    @GetMapping("/custom")
    public String custom() throws InterruptedException {
        var span = ElasticApm.currentTransaction().startSpan("app", "custom", "do-some-work");
        span.setName("do-some-work");
        try {
            Thread.sleep(500);
        } finally {
            span.end();
        }
        return "Custom span captured";
    }

    @PostMapping(path = "/chain", consumes = "application/json", produces = "application/json")
    public Map<String, Object> chain(@RequestBody Map<String, Object> payload,
                                     @RequestHeader(value = "traceparent", required = false) String traceparent) {
        var span = ElasticApm.currentTransaction().startSpan("app", "custom", "springboot-chain-step");
        span.setName("springboot-chain-step");
        try {
            Map<String, Object> chain = (Map<String, Object>) payload.get("chain");
            List<Map<String, Object>> members = (List<Map<String, Object>>) chain.get("members");

            int idx = -1;
            for (int i = 0; i < members.size(); i++) {
                Map<String, Object> m = members.get(i);
                if ("springboot".equals(m.get("name"))) {
                    m.put("completed", true);
                    idx = i;
                    break;
                }
            }

            if (idx >= 0 && idx + 1 < members.size()) {
                Map<String, Object> next = members.get(idx + 1);
                String nextUrl = (String) next.get("url");
                try {
                    URL url = new URL(nextUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (traceparent != null) conn.setRequestProperty("traceparent", traceparent);
                    String body = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(body.getBytes());
                    }
                    conn.getResponseCode();
                } catch (Exception e) {
                    // swallow forwarding errors for demo
                }
            }

            return payload;
        } finally {
            span.end();
        }
    }

    @GetMapping("/error")
    public String error() {
        throw new IllegalStateException("Boom from Spring Boot demo");
    }
}
