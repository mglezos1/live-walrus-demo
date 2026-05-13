#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env.production ]]; then
  echo "Copy .env.example to .env.production and edit it first."
  exit 1
fi
if [[ ! -f secrets/sui_config/client.yaml ]]; then
  echo "Put your Sui client.yaml (and keystore) under secrets/sui_config/"
  exit 1
fi
exec docker compose --env-file .env.production up -d --build "$@"
