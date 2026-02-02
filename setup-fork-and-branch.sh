#!/bin/bash
# Setup script for fork and demo branch

set -e

cd /home/mglez/walrus-mvp-zk

echo "🔀 Setting up demo branch..."
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Switch to main
echo "Switching to main branch..."
git checkout main

# Create demo branch
echo "Creating demo/complete-integration branch..."
git checkout -b demo/complete-integration

echo ""
echo "✅ Success! You're now on: demo/complete-integration"
echo ""
echo "Current status:"
git status
echo ""
echo "Remote configuration:"
git remote -v
echo ""
echo "📋 Next steps:"
echo "1. Fork on GitHub: https://github.com/mglezos1/walrus-mvp"
echo "2. (Optional) Add your fork as remote:"
echo "   git remote add fork git@github.com:YOUR_USERNAME/walrus-mvp.git"
echo "3. Start implementing!"
