# Node API + Sui + Walrus CLIs (Mysten suiup). Mount wallet at /root/.sui/sui_config (see docker-compose).
FROM node:22-bookworm

RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.local/bin:${PATH}"
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh \
  && suiup install sui \
  && suiup install walrus

RUN mkdir -p /root/.config/walrus \
  && curl -fsSL https://docs.wal.app/setup/client_config.yaml -o /root/.config/walrus/client_config.yaml

WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY . .

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
