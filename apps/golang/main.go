package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	apmhttp "go.elastic.co/apm/module/apmhttp/v2"
	"go.elastic.co/apm"
)

func main() {
	// The Go agent reads ELASTIC_APM_* environment variables automatically
	// (server URL, service name, environment, ...).
	http.Handle("/", apmhttp.Wrap(http.HandlerFunc(indexHandler)))
	http.Handle("/greet", apmhttp.Wrap(http.HandlerFunc(greetHandler)))
	http.Handle("/slow", apmhttp.Wrap(http.HandlerFunc(slowHandler)))
	http.Handle("/error", apmhttp.Wrap(http.HandlerFunc(errorHandler)))
	http.Handle("/chain", apmhttp.Wrap(http.HandlerFunc(chainHandler)))

	log.Println("listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Hello from Go (Elastic APM)")
}

func greetHandler(w http.ResponseWriter, r *http.Request) {
	time.Sleep(200 * time.Millisecond)
	fmt.Fprintf(w, "Hello, %s!\n", r.URL.Query().Get("name"))
}

func slowHandler(w http.ResponseWriter, r *http.Request) {
	time.Sleep(time.Second)
	fmt.Fprintln(w, "Slow response")
}

func errorHandler(w http.ResponseWriter, r *http.Request) {
	panic("boom from Go demo")
}

func chainHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("invalid json"))
		return
	}

	// create a span within the current transaction
	span := apm.StartSpan(r.Context(), "golang-chain-step", "custom")
	if span != nil {
		defer span.End()
	}

	// mark this member completed
	members, _ := payload["chain"].(map[string]interface{})["members"].([]interface{})
	var idx int = -1
	for i, m := range members {
		mm := m.(map[string]interface{})
		if mm["name"] == "golang" {
			mm["completed"] = true
			idx = i
			break
		}
	}

	// forward to next
	if idx >= 0 && idx+1 < len(members) {
		next := members[idx+1].(map[string]interface{})
		nextUrl, _ := next["url"].(string)

		// propagate traceparent header if present
		traceparent := r.Header.Get("traceparent")
		reqBody, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", nextUrl, bytes.NewReader(reqBody))
		req.Header.Set("Content-Type", "application/json")
		if traceparent != "" {
			req.Header.Set("traceparent", traceparent)
		}
		client := &http.Client{Timeout: 10 * time.Second}
		client.Do(req)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payload)
}
