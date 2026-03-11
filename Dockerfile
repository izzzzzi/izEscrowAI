FROM node:20-slim

WORKDIR /app

# Install bot dependencies
COPY bot/package*.json ./bot/
RUN cd bot && npm ci

# Copy bot source and contracts
COPY bot/ ./bot/
COPY contracts/compiled/ ./contracts/compiled/

# Build
RUN cd bot && npm run build

EXPOSE 3000

WORKDIR /app/bot
CMD ["node", "dist/index.js"]
