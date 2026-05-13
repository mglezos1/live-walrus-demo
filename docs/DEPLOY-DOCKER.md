# Docker testnet backend (Walrus + Sui)

This stack runs the same Node API as locally, plus **sui** and **walrus** CLIs installed via [suiup](https://github.com/MystenLabs/suiup) inside the image.

## Prerequisites

- Docker + Docker Compose on a Linux host (VPS recommended).
- A Sui **testnet** wallet directory (`client.yaml` + keystore) copied from your machine.
- Testnet **SUI** (gas) and **WAL** on the wallet active address.

## One-time setup

1. Clone the repo on the server and `cd` into it.
2. Create `secrets/sui_config/` and copy your local `~/.sui/sui_config/*` into it (see [secrets/README.md](../secrets/README.md)).
3. `cp .env.example .env.production` and fill contract IDs, `SUI_PRIVATE_KEY` if needed, optional `INVITE_TOKEN`, optional `CORS_ORIGINS`.
4. Leave `DEMO_SKIP_WALRUS` unset (or `false`) for real Walrus.

## Run

```bash
docker compose --env-file .env.production up --build
```

API listens on port **3000** (override host mapping with `HOST_PORT` in shell env).

## Invited testers

- If `INVITE_TOKEN` is set, every request to `/datasets`, `/capabilities`, `/proofs`, `/verifier`, or `/test-upload` must send header `x-invite-token: <same value>`.
- On Vite frontends, set build env **`VITE_INVITE_TOKEN`** to the same string so `apiFetch` adds the header.

## Frontends on other hosts

Set **`VITE_API_URL`** to `https://<your-api-host>:3000` (or HTTPS URL behind a reverse proxy) and rebuild each site.

## Notes

- Image includes Walrus `client_config` from docs.wal.app; override with a bind mount if you need a custom file.
- Request timeouts / RAM: proof + Walrus can be heavy; size the VPS accordingly.
