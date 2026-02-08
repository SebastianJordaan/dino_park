FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (for caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create a directory for the database volume
RUN mkdir -p /data

# Default command (will be overridden in docker-compose)
# CMD ["node", "gateway.js"]