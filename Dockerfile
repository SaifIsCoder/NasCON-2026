FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

EXPOSE 8080

CMD ["node", "src/server.js"]
