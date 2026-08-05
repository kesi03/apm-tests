package com.example.apm;

import co.elastic.apm.api.ElasticApm;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

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

    @GetMapping("/error")
    public String error() {
        throw new IllegalStateException("Boom from Spring Boot demo");
    }
}
