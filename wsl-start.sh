#!/bin/bash
# Quick start script - run this in WSL

set -e

echo "🚀 Starting walrus-mvp backend..."
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies not found. Installing..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration before continuing"
fi

# Start server
echo "▶️  Starting server on http://localhost:3000"
echo ""
npm start
