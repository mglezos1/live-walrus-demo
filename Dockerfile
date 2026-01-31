FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    build-base \
    git \
    python3 \
    make \
    g++ \
    bash

# Install Circom globally
RUN npm install -g circom@latest snarkjs@latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p data keys uploads downloads circuits/tmp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "app.js"]
