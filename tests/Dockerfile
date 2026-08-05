FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json jest.config.js playwright.config.ts ./
COPY src ./src

CMD ["npm", "test"]
