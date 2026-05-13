# Simplest real Walrus + API (VPS)

Goal: one machine runs **Node + `walrus` + `sui`** with your **testnet wallet** so uploads hit **real Walrus** (visible on explorers). **Vercel** only hosts the UI and calls this API.

## 0. One-time on your laptop

Fund the wallet you will copy: **Sui testnet SUI** (gas) + **Walrus testnet WAL** (per current Walrus docs).

## 1. VPS (Ubuntu 22.04)

Smallest tier is often enough to *try*; if uploads/proofs OOM, resize up.

```bash
sudo apt update && sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
# log out and back in so `docker` works without sudo
```

## 2. Clone + wallet + env

```bash
git clone https://github.com/mglezos1/live-walrus-demo.git
cd live-walrus-demo
mkdir -p secrets/sui_config
# copy from your PC: entire ~/.sui/sui_config (client.yaml + keystore files)
cp .env.example .env.production
nano .env.production   # set contract IDs, SUI_PRIVATE_KEY if needed; leave DEMO_SKIP_WALRUS unset
```

**Do not** commit `secrets/` or `.env.production`.

## 3. Start the API (Docker)

```bash
./scripts/simple-start.sh
# or: docker compose --env-file .env.production up -d --build
curl -sS http://127.0.0.1:3000/health
```

Open host firewall **3000** if you want raw `http://YOUR_VPS_IP:3000`.

## 4. HTTPS for Vercel (pick one)

Browsers on **https** (Vercel) usually **block** calls to **http** APIs. You need an **https** API URL.

### A) Cloudflare Tunnel (fastest HTTPS, no cert bot)

On the VPS (after API is up):

```bash
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
./cloudflared tunnel --url http://127.0.0.1:3000
```

It prints a **`https://....trycloudflare.com`** URL. Use that as **`VITE_API_URL`** on Vercel (no trailing slash).

Note: quick tunnels get a new hostname when you restart unless you set up a named tunnel in Cloudflare.

### B) Your own domain + Caddy (stable URL)

Point **DNS A record** to the VPS IP. Install **Caddy** on the host, reverse proxy to `127.0.0.1:3000`, let Caddy obtain Let's Encrypt. Use `https://api.yourdomain.com` as **`VITE_API_URL`**.

## 5. Vercel

Project → Settings → Environment variables:

- `VITE_API_URL` = the **https** API URL from step 4
- If you set `INVITE_TOKEN` on the server, set `VITE_INVITE_TOKEN` to the **same** value and redeploy.

## 6. CORS (if the browser blocks requests)

In `.env.production` on the server:

`CORS_ORIGINS=https://your-app.vercel.app`

Then: `./scripts/simple-start.sh`

---

More detail: [DEPLOY-DOCKER.md](./DEPLOY-DOCKER.md)
