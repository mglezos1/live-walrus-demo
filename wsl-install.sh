#!/bin/bash
# Quick install script - run this in WSL

set -e

echo "🚀 Installing dependencies for walrus-mvp-zk..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project directory?"
    exit 1
fi

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env: cp .env.example .env"
echo "2. Edit .env with your configuration"
echo "3. Start server: npm start"
echo "4. Access frontend at http://localhost:3000"
