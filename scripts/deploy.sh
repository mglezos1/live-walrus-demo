#!/bin/bash
# Deployment script for walrus-mvp backend

set -e

echo "🚀 Starting deployment..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t walrus-mvp:latest .

# Stop existing container if running
echo "🛑 Stopping existing container..."
docker-compose down || true

# Start new container
echo "▶️  Starting new container..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 10

# Check health
echo "🏥 Checking health..."
for i in {1..30}; do
  if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Health check passed!"
    exit 0
  fi
  echo "Waiting for service to be healthy... ($i/30)"
  sleep 2
done

echo "❌ Health check failed!"
exit 1
