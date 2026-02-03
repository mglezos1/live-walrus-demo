#!/usr/bin/env python3
"""Convert Sui bech32 private key to hex format"""
import sys
import binascii

# Try to import bech32
try:
    import bech32
except ImportError:
    print("Error: bech32 module not found. Installing...", file=sys.stderr)
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "bech32"])
    import bech32

bech32_key = sys.argv[1] if len(sys.argv) > 1 else 'suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t'

try:
    # Decode bech32
    hrp, data = bech32.decode(bech32_key)
    
    # Convert from 5-bit to 8-bit words
    converted = bech32.convertbits(data, 5, 8, False)
    
    # Skip first byte (version) and convert to hex
    # The first byte is typically the version, we want the actual key bytes
    key_bytes = bytes(converted[1:])
    
    # Convert to hex
    hex_key = binascii.hexlify(key_bytes).decode()
    
    if len(hex_key) == 64:
        print(hex_key)
    else:
        print(f"Warning: Expected 64-character hex key, got {len(hex_key)} characters", file=sys.stderr)
        print(hex_key)
        sys.exit(1)
        
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
