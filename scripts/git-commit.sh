#!/bin/bash
# Git commit and push script

set -e

echo "📦 Preparing to commit to GitHub..."
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
    git remote add origin https://github.com/mglezos1/walrus-mvp.git || echo "Remote already exists"
fi

# Check current status
echo "📊 Current git status:"
git status --short

echo ""
read -p "Continue with commit? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Commit cancelled"
    exit 1
fi

# Add all files (respecting .gitignore)
echo "➕ Adding files..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
    exit 0
fi

# Create commit message
COMMIT_MSG="feat: complete implementation of ZK medical dataset access system

- Implemented all Move contracts (DatasetRegistry, ProofVerifier, CapabilityRegistry, Verifier)
- Enhanced backend services with encryption, hashing, and blockchain integration
- Created ZK circuits for aggregate, range, condition, and capability-bound queries
- Built frontend interfaces for owner, researcher, and verifier portals
- Added Docker containerization and Cloudflare Tunnel setup
- Set up GitHub Actions CI/CD workflows
- Fixed Poseidon import issue in crypto utilities
- Added comprehensive documentation and deployment guides"

echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

echo ""
echo "📤 Pushing to GitHub..."
git push -u origin main || git push -u origin master

echo ""
echo "✅ Successfully committed and pushed to GitHub!"
echo "Repository: https://github.com/mglezos1/walrus-mvp"
