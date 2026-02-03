#!/usr/bin/env python3
import bech32
import binascii
import sys

bech32_key = sys.argv[1] if len(sys.argv) > 1 else 'suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t'

try:
    # Decode bech32
    decoded = bech32.decode(bech32_key)
    
    # Convert from 5-bit to 8-bit words, skip version byte
    converted = bech32.convertbits(decoded[1], 5, 8, False)
    
    # Skip first byte (version) and convert to hex
    hex_key = binascii.hexlify(bytes(converted[1:])).decode()
    
    print(hex_key)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
