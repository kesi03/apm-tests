FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
EXPOSE 3000
ENV ELASTIC_APM_SERVER_URL=http://apm-server:8200 \
    ELASTIC_APM_SERVICE_NAME=express-app \
    ELASTIC_APM_ENVIRONMENT=development
CMD ["node", "server.js"]
