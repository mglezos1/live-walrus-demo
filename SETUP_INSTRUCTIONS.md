# Setup Instructions for Windows/WSL

## Issue: UNC Path Not Supported

Windows PowerShell doesn't support UNC paths (`\\wsl$\...`) directly. You need to run commands from within WSL.

## Solution: Run Commands in WSL

### Option 1: Use WSL Terminal Directly

1. Open WSL terminal (Ubuntu) directly
2. Navigate to the project:
   ```bash
   cd /home/mglez/walrus-mvp-zk
   ```
3. Run npm install:
   ```bash
   npm install
   ```

### Option 2: Use PowerShell with WSL Command

From PowerShell, run:
```powershell
wsl
cd /home/mglez/walrus-mvp-zk
npm install
```

### Option 3: Run Single Command from PowerShell

```powershell
wsl -e bash -c "cd /home/mglez/walrus-mvp-zk && npm install"
```

## Complete Setup Steps (Run in WSL)

```bash
# 1. Navigate to project
cd /home/mglez/walrus-mvp-zk

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Edit .env file (use nano or your preferred editor)
nano .env

# 5. Verify setup
chmod +x scripts/verify-setup.sh
./scripts/verify-setup.sh

# 6. Start the server
npm start
```

## Alternative: Map WSL Path in Windows

If you want to work from Windows directly:

1. Map WSL network drive:
   ```powershell
   net use Z: \\wsl$\Ubuntu\home\mglez\walrus-mvp-zk
   ```

2. Then navigate to Z: drive:
   ```powershell
   cd Z:
   npm install
   ```

## Recommended Workflow

For best compatibility, use WSL terminal for:
- npm commands
- Node.js execution
- Docker commands (if Docker Desktop WSL2 backend)
- Sui CLI commands
- Walrus CLI commands
- Circom/snarkjs commands

Use Windows/PowerShell for:
- Git operations (if Git for Windows)
- File editing (VS Code, etc.)
- Docker Desktop GUI

## Quick Start (WSL Terminal)

```bash
# Navigate to project
cd /home/mglez/walrus-mvp-zk

# Install dependencies
npm install

# Start server
npm start
```

The server will be accessible at http://localhost:3000 from both Windows and WSL.
