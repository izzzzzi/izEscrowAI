FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
COPY ../contracts/compiled/ ./contracts/compiled/
EXPOSE 3000
CMD ["node", "dist/index.js"]
