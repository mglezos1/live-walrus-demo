#!/bin/bash
# Setup script to configure .env file with Sui and Walrus settings

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "🔧 Setting up .env file for Walrus and Sui integration..."

# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "❌ .env.example not found"
        exit 1
    fi
fi

# Get active Sui address
ACTIVE_ADDRESS=$(sui client active-address 2>/dev/null | grep -v warning | tail -1)
if [ -z "$ACTIVE_ADDRESS" ]; then
    echo "⚠️  No active Sui address found. Please run: sui client active-address"
    exit 1
fi

echo "📍 Active Sui address: $ACTIVE_ADDRESS"

# Export private key
echo "🔑 Exporting private key..."
EXPORTED_KEY=$(sui keytool export --key-identity "$ACTIVE_ADDRESS" 2>&1 | grep "exportedPrivateKey" | awk '{print $2}')

if [ -z "$EXPORTED_KEY" ]; then
    echo "⚠️  Could not export private key. You'll need to set SUI_PRIVATE_KEY manually."
    echo "   Export format: suiprivkey1..."
    echo "   You need to convert it to 64-character hex format"
else
    echo "✅ Exported key: $EXPORTED_KEY"
    echo "⚠️  Note: You need to convert this bech32 key to hex format for SUI_PRIVATE_KEY"
    echo "   Use the convert_key.py script or Node.js script when Node is available"
fi

# Check Walrus CLI
if command -v walrus &> /dev/null; then
    WALRUS_PATH=$(which walrus)
    echo "✅ Walrus CLI found at: $WALRUS_PATH"
else
    echo "⚠️  Walrus CLI not found in PATH"
    WALRUS_PATH="/usr/local/bin/walrus"
fi

# Update .env file
echo "📝 Updating .env file..."

# Update SUI_NETWORK if not set
if ! grep -q "^SUI_NETWORK=" .env; then
    echo "SUI_NETWORK=devnet" >> .env
fi

# Update WALRUS_CLI_PATH
sed -i "s|^WALRUS_CLI_PATH=.*|WALRUS_CLI_PATH=$WALRUS_PATH|" .env

# Update active address comment
sed -i "s|^# Current active address:.*|# Current active address: $ACTIVE_ADDRESS|" .env || \
    sed -i "/^# Sui Configuration/a\\# Current active address: $ACTIVE_ADDRESS" .env

# Update bech32 key comment if exported
if [ -n "$EXPORTED_KEY" ]; then
    sed -i "s|^# Bech32 key:.*|# Bech32 key: $EXPORTED_KEY|" .env || \
        sed -i "/^# Current active address:/a\\# Bech32 key: $EXPORTED_KEY" .env
fi

echo ""
echo "✅ .env file updated!"
echo ""
echo "📋 Next steps:"
echo "   1. Convert the bech32 private key to hex format (64 characters)"
echo "   2. Update SUI_PRIVATE_KEY in .env with the hex key"
echo "   3. Deploy Move contracts and update Package IDs and Object IDs"
echo ""
echo "   To deploy contracts:"
echo "   cd move/dataset_registry && sui move build && sui client publish"
echo "   cd ../proof_verifier && sui move build && sui client publish"
echo "   cd ../verifier && sui move build && sui client publish"
echo ""
