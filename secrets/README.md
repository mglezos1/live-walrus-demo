# Place Sui client config here for Docker

Copy your **entire** local `~/.sui/sui_config` directory contents into `./sui_config/`:

- `client.yaml`
- `sui.keystore` (or whatever paths `client.yaml` references)

Do **not** commit real keystores. This folder should stay gitignored.
