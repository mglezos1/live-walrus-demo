# PowerShell Setup Guide

## Problem
PowerShell cannot directly access WSL paths (`\\wsl$\...`) or use Unix-style paths (`/home/...`).

## Solutions

### ✅ Solution 1: Use WSL Command (Easiest)

From PowerShell, run commands through WSL:

```powershell
# Install dependencies
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm install"

# Start server
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm start"

# Run any npm script
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm run <script-name>"
```

### ✅ Solution 2: Enter WSL Shell

From PowerShell, enter WSL:

```powershell
wsl
```

Then in the WSL shell:
```bash
cd /home/mglez/walrus-mvp-zk
npm install
npm start
```

### ✅ Solution 3: Map WSL Drive (One-time setup)

Map WSL path to a Windows drive letter:

```powershell
# Map WSL Ubuntu home to Z: drive
net use Z: \\wsl$\Ubuntu\home\mglez\walrus-mvp-zk

# Now navigate normally
cd Z:
npm install
npm start
```

**Note**: This mapping may need to be recreated after system restart.

### ✅ Solution 4: Use Windows Path (If project is accessible)

If your project is accessible via Windows path:

```powershell
# Find the Windows path equivalent
wsl -e bash -c "wslpath -w /home/mglez/walrus-mvp-zk"

# Use that path in PowerShell
cd <output-from-above>
npm install
```

## Recommended: Create PowerShell Aliases

Add these to your PowerShell profile (`$PROFILE`):

```powershell
# WSL project navigation
function wsl-project {
    wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && bash"
}

# WSL npm commands
function wsl-npm {
    param($command)
    wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm $command"
}

# Usage:
# wsl-npm install
# wsl-npm start
# wsl-npm run build:circuits
```

## Quick Commands Reference

```powershell
# Install dependencies
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm install"

# Start server
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm start"

# Run verification
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && bash scripts/verify-setup.sh"

# Build circuits
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm run build:circuits"

# Deploy contracts
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm run deploy:contracts"
```

## Best Practice

**Use WSL terminal directly** for development:
1. Open Ubuntu/WSL terminal
2. Navigate: `cd /home/mglez/walrus-mvp-zk`
3. Run all commands normally

The server will be accessible at `http://localhost:3000` from both Windows and WSL.
