# 範例:Next.js + Oracle 專案的完整契約檔

以下取自實際在生產部署中的專案(erp-gashank),四道守衛全通過。
**照抄結構,不要照抄 Oracle 的部分** —— 那是該專案特有的外部依賴。

## `compose.staging.yml`

```yaml
# staging:host 8081 → 容器 3000。在目標機本地 build。
# 機密/連線設定走 ./.env.local(掛進容器,啟動與 migrate 皆讀它)。
services:
  web:
    build: .
    image: erp-gashank:staging          # 本地 build 出來的 tag,不是 registry 位址
    container_name: erp-gashank-staging
    env_file:
      - .env.local
    environment:
      - PORT=3000
    volumes:
      - ./.env.local:/app/.env.local:ro
      # 外部依賴唯讀掛載(此例為 Oracle Instant Client;一般專案不需要)
      - ../.deps/oracle/instantclient_11_2:/opt/oracle/instantclient:ro
    ports:
      - "8081:3000"                     # 左邊必須等於後台規則的 host_port
    restart: unless-stopped
```

有 `route_prefix`(例如 `/gashank/`)時,要讓 basePath 在 **build 時**烤進 app:

```yaml
    build:
      context: .
      args:
        - NEXT_PUBLIC_BASE_PATH=/gashank/
    environment:
      - NEXT_PUBLIC_BASE_PATH=/gashank/
```

## `Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1

# ---- build:裝全部依賴 + build ----
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime:slim ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# .cf/environment.json 宣告的 systemDeps 一定要出現在這行 apt install 裡
RUN apt-get update \
 && apt-get install -y --no-install-recommends libaio1 \
 && rm -rf /var/lib/apt/lists/*

# 只裝 production 依賴 + 帶入 build 產物
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
# migration / 維運腳本(讓 `docker compose run web node scripts/migrate.mjs` 跑得起來)
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations

EXPOSE 3000
# 機密走掛進來的 /app/.env.local,不烤進 image
CMD ["npx", "next", "start", "-p", "3000"]
```

守衛對照:
- `FROM node:22-*` ←→ `.mise.toml` 的 `node = "22"`(主版號要一致)
- `apt install ... libaio1` ←→ `.cf/environment.json` 的 `systemDeps[].name`
- glibc base(`bookworm`),**不能用 alpine**(musl 跟很多預編譯二進位不相容)

## `.cf/environment.json`

```json
{
  "schema": 1,
  "miseToml": "[tools]\nnode = \"22\"\n",
  "systemDeps": [
    {
      "name": "libaio1",
      "reason": "oracledb 6.x thick client 執行期相依"
    }
  ],
  "mounts": [
    {
      "name": "oracle-instantclient-11.2",
      "hostPath": "/opt/oracle/instantclient_11_2",
      "reason": "thick mode 需 Instant Client;mise 無法安裝,須主機掛載"
    }
  ],
  "notes": "為什麼選這些版本 —— 給後面的人看的脈絡"
}
```

`systemDeps` 存在的理由:dev 容器的 apt 靠 operator 核准就裝得到,但**目標機的 image 只照 Dockerfile build**。
少寫一個,dev 跑得好好的、CI 也綠,部署後才 runtime 缺庫炸掉。所以宣告與 Dockerfile 必須對得起來。

## `.env.local`(值一律留空)

```
DATABASE_URL=
ORACLE_USER=
ORACLE_PASSWORD=
APP_JWT_SECRET=
```

## `.mise.toml`

```toml
[tools]
node = "22"
```
