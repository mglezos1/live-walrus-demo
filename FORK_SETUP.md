# Fork Setup Guide

This guide will help you fork the repository and set up your demo branch.

## Quick Setup (Recommended)

### Step 1: Fork on GitHub

1. Go to: https://github.com/mglezos1/walrus-mvp
2. Click the **"Fork"** button (top right corner)
3. Choose your GitHub account as the destination
4. Wait for the fork to complete

### Step 2: Clone Your Fork

Open your WSL terminal and run:

```bash
cd ~
git clone git@github.com:YOUR_USERNAME/walrus-mvp.git walrus-mvp-demo
cd walrus-mvp-demo
```

**Replace `YOUR_USERNAME` with your actual GitHub username.**

If you don't have SSH set up, use HTTPS instead:
```bash
git clone https://github.com/YOUR_USERNAME/walrus-mvp.git walrus-mvp-demo
```

### Step 3: Create Demo Branch

```bash
cd walrus-mvp-demo
git checkout -b demo/complete-integration
```

### Step 4: Verify Setup

```bash
git branch
# Should show: * demo/complete-integration

git remote -v
# Should show your fork as 'origin'
```

## Alternative: Work in Current Repository

If you prefer to work in your current repository (`walrus-mvp-zk`), you can:

```bash
cd /home/mglez/walrus-mvp-zk

# Make sure you're on main branch
git checkout main

# Create demo branch
git checkout -b demo/complete-integration

# Push to GitHub (creates branch on remote)
git push origin demo/complete-integration
```

## Using the Setup Script

I've created a helper script for you. Run:

```bash
cd /home/mglez/walrus-mvp-zk
chmod +x scripts/setup-fork.sh
./scripts/setup-fork.sh
```

This script will:
- Check your git status
- Guide you through the fork process
- Optionally create the demo branch locally

## Next Steps After Forking

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   ```

3. Start implementing the Sui/Walrus integration plan!

## Need Help?

- **GitHub Fork Help**: https://docs.github.com/en/get-started/quickstart/fork-a-repo
- **SSH Setup**: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
