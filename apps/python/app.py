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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
