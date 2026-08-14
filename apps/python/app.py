import os
import time

from flask import Flask
from elasticapm.contrib.flask import ElasticAPM

app = Flask(__name__)

app.config["ELASTIC_APM"] = {
    "SERVICE_NAME": os.environ.get("ELASTIC_APM_SERVICE_NAME", "python-app"),
    "SERVER_URL": os.environ.get(
        "ELASTIC_APM_SERVER_URL",
        "https://my-observability-project-d54a32.apm.europe-west2.gcp.elastic.cloud:443",
    ),
    "ENVIRONMENT": os.environ.get("ELASTIC_APM_ENVIRONMENT", "development"),
}

apm = ElasticAPM(app)


@app.route("/")
def index():
    return "Hello from Python/Flask (Elastic APM)"


@app.route("/greet/<name>")
def greet(name):
    time.sleep(0.2)
    return f"Hello, {name}!"


@app.route("/slow")
def slow():
    time.sleep(1.0)
    return "Slow response"


@app.route("/error")
def error():
    raise RuntimeError("Boom from Python demo")


from flask import request
import json
import urllib.request

@app.route('/chain', methods=['POST'])
def chain():
    # The Flask integration continues the trace if the incoming request
    # contains a W3C traceparent header. Use the Python APM capture_span to
    # create a span inside the existing transaction.
    payload = request.get_json()
    traceparent = request.headers.get('traceparent')

    import elasticapm
    span_cm = elasticapm.capture_span('python-chain-step')
    span_cm.__enter__()
    try:
        # mark this member completed
        members = payload.get('chain', {}).get('members', [])
        for m in members:
            if m.get('name') == 'python':
                m['completed'] = True
                break

        # find next member and forward
        idx = next((i for i, m in enumerate(members) if m.get('name') == 'python'), None)
        if idx is not None and idx + 1 < len(members):
            next_m = members[idx + 1]
            req = urllib.request.Request(next_m['url'],
                                         data=json.dumps(payload).encode('utf-8'),
                                         headers={'Content-Type': 'application/json'})
            if traceparent:
                req.add_header('traceparent', traceparent)
            with urllib.request.urlopen(req, timeout=10) as resp:
                pass

        return payload
    finally:
        span_cm.__exit__(None, None, None)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
