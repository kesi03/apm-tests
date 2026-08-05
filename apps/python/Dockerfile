FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
EXPOSE 5000
ENV ELASTIC_APM_SERVER_URL=http://apm-server:8200 \
    ELASTIC_APM_SERVICE_NAME=python-app \
    ELASTIC_APM_ENVIRONMENT=development
CMD ["python", "app.py"]
