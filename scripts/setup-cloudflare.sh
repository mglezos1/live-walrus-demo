#!/bin/bash
# Cloudflare Tunnel setup script

set -e

echo "☁️  Setting up Cloudflare Tunnel..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "📥 Installing cloudflared..."
    # Install cloudflared (Linux)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
        chmod +x /usr/local/bin/cloudflared
    # Install cloudflared (macOS)
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install cloudflared
    else
        echo "❌ Unsupported OS. Please install cloudflared manually."
        exit 1
    fi
fi

# Create cloudflare directory
mkdir -p cloudflare

# Check if tunnel already exists
if [ -f "cloudflare/credentials.json" ]; then
    echo "✅ Tunnel credentials already exist"
    echo "To create a new tunnel, run: cloudflared tunnel create walrus-mvp"
else
    echo "📝 Creating new tunnel..."
    echo "Please run the following command to create a tunnel:"
    echo "  cloudflared tunnel create walrus-mvp"
    echo ""
    echo "Then download the credentials:"
    echo "  cloudflared tunnel token walrus-mvp > cloudflare/credentials.json"
fi

# Update config.yml with tunnel ID if provided
if [ ! -z "$1" ]; then
    echo "Updating config.yml with tunnel ID: $1"
    sed -i "s/<tunnel-id>/$1/g" cloudflare/config.yml
fi

echo "✅ Cloudflare Tunnel setup complete!"
echo ""
echo "To start the tunnel, run:"
echo "  cloudflared tunnel run"
