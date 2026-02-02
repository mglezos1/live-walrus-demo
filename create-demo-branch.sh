#!/bin/bash
# Simple script to create demo branch

cd /home/mglez/walrus-mvp-zk

echo "Current branch: $(git branch --show-current)"
echo ""

# Switch to main
echo "Switching to main branch..."
git checkout main

# Create demo branch
echo "Creating demo/complete-integration branch..."
git checkout -b demo/complete-integration

echo ""
echo "✅ Done! You're now on: demo/complete-integration"
echo ""
git status
