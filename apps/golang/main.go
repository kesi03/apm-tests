package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	apmhttp "go.elastic.co/apm/module/apmhttp/v2"
)

func main() {
	// The Go agent reads ELASTIC_APM_* environment variables automatically
	// (server URL, service name, environment, ...).
	http.Handle("/", apmhttp.Wrap(http.HandlerFunc(indexHandler)))
	http.Handle("/greet", apmhttp.Wrap(http.HandlerFunc(greetHandler)))
	http.Handle("/slow", apmhttp.Wrap(http.HandlerFunc(slowHandler)))
	http.Handle("/error", apmhttp.Wrap(http.HandlerFunc(errorHandler)))

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
