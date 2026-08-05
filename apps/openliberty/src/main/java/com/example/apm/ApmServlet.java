package com.example.apm;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet(urlPatterns = {"/", "/greet", "/slow", "/error"})
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

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
