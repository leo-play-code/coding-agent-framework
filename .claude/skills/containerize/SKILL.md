---
name: containerize
description: 產出主機部署需要的整套契約檔(compose.<env>.yml / Dockerfile / .cf/environment.json / .env.local / deploy.yml),【在容器內把它真的 build 起來、跑起來、curl 得到】,並確保一次通過中央部署器的六道守衛。專案要部署到目標主機、尚未容器化、或部署被擋下時用這個。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - 容器化
  - 產生 compose
  - 補部署檔
  - 缺 compose
  - 部署契約
  - 做 docker compose
  - 建 Dockerfile
  - containerize
  - generate compose
  - deploy contract
  - dockerize project
---

# containerize — 產出主機部署契約檔

目的:讓一個專案 repo 具備「部署終端控制」要求的全套檔案,使中央部署器能把它部署到目標主機。
這是**建立**部署契約;要 debug 已上線的部署走 `gitea-ops` §5 / `gh-actions-fix`。

## 部署架構(先理解,否則會產錯東西)

中央部署器不 pull image、**沒有 registry**。它做的是:
從 Gitea clone 該 commit → 等 CI 綠 → 跑四道守衛 → `rsync` 整份原始碼到目標機 `~/<repo>/<branch>/` →
在**目標機本地**跑 `docker compose -f compose.<env>.yml up -d --build`。

所以:
- 檔名是 **`compose.<env>.yml`**,不是 `docker-compose.yml`。後者在這條鏈上完全不被讀取。
- compose 用 `build: .`(目標機自己 build),**不要**寫 `image: registry/xxx` 期待 pull。
- `.env.local` 會被 rsync 帶上目標機,所以它必須在 git 裡。

## 流程

### 1. 取得參數

派工進來的 prompt 會帶 `env_name` / `host_port` / `route_prefix`(後兩者可能是 null)。

- **有值就必須對齊**,不可自作主張改。
- `host_port` 為 null → 自己選一個(避開 80/443/3000/8080 等常見占用,建議 8081+),並在 PR 說明寫明選了什麼。
- `route_prefix` 為 null → 不設 basePath。
- 沒帶參數(使用者手動呼叫)→ 依分支推斷 `env_name`:分支名同名的 compose 優先 → 分支含 `dev` 取 `staging` →
  含 `main`/`master` 取 `prod` → 其他取 `staging`。

> ⚠️ **自動派工模式下不要用 `AskUserQuestion`** —— 沒有人在對話另一端,問了就卡死。
> 資訊不足時自己做合理決定,把決定與理由寫進 PR 說明讓人審。

### 2. 偵測專案實況

用 Glob/Grep 找:runtime 與套件管理器(`package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml`)、
build 與 start 指令(讀 `package.json` scripts / Makefile,**不要硬編不存在的指令**)、
app 實際監聽的容器內 port、外部依賴(DB、Oracle client、S3、Redis…)。

### 3. 產出檔案(缺的才補,**不覆蓋既有檔**)

| 檔案 | 內容要點 |
|---|---|
| `compose.<env>.yml` | 一環境一份。`build: .`、`container_name`、`env_file: .env.local`、`ports: "<host_port>:<容器 port>"`、`restart: unless-stopped` |
| `Dockerfile` | 多階段:build stage → slim runtime。機密不進 image |
| `.cf/environment.json` | 若缺則產;`systemDeps` 列出 runtime 需要的 apt 套件(附 `reason`) |
| `.env.local` | **只有 key、值留空**。已存在就不動 |
| `.env.local.example` | 同一組 key,附註解說明每個要填什麼 |
| `.gitea/workflows/deploy.yml` | 缺才補(見 §5) |

### 4. 六道守衛檢查表(產完**逐條自檢**,錯一條部署就被擋)

中央部署器 `deployer.js` 會對質這六件事(**它才是把關者,這裡只是讓你提早知道**;真的不一致時以部署器的錯誤訊息為準):

1. **compose 存在** — `compose.<env>.yml` 必須在 repo **根目錄**(不是子目錄)。
2. **port 一致** — compose 的宿主 port(`ports:` 左邊那個數字)必須等於後台規則的 `host_port`。
3. **basePath 一致** — 有 `route_prefix` 時,compose 裡的 `NEXT_PUBLIC_BASE_PATH` 或 `BASE_PATH`
   必須等於它(頭尾斜線正規化後比對)。沒設會讓「首頁開得起來但 JS/CSS 全 404」。
4. **systemDeps 已裝** — `.cf/environment.json` 宣告的每個 `systemDeps[].name`,都必須出現在
   Dockerfile 某行 `apt(-get) install` 裡。**寫在註解裡不算**。
5. **node 版本一致** — 有 `.mise.toml` / `.tool-versions` 宣告 node 版本時,Dockerfile 的
   `FROM node:X` 主版號必須相同。
   > 這條的由來:**對話預覽走 mise、目標機走 docker**。兩套環境各自宣告版本,不對齊就會出現
   > 「我這邊好好的、上目標機就壞」——所以 `.mise.toml` 與 Dockerfile 是同一件事的兩種寫法,要一起改。
6. **prod 的 `.env.local` 已收尾** — 只查 `env_name=prod`:`AUTH_SECRET` 不可留模板預設值
   `dev-insecure-secret-change-me`,且不可有 `AUTH_DISABLED=1`。`.env.local` 進 git、會原樣上正式機,
   沒改就是一個免登入、session 金鑰人人知道的正式站。
7. **宣告的 mounts 已烤進 image** — `.cf/environment.json` 的 `mounts` 是**開發容器**的掛載,
   目標機不會有。部署時中央會把 Oracle Instant Client 同步進 build context 的 `.deps/oracle/<版本>`,
   但 **`COPY` 要你自己寫**:
   ```dockerfile
   COPY .deps/oracle/instantclient_11_2 /opt/oracle/instantclient_11_2
   ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_11_2
   ```
   漏了這行:部署會「成功」,image 裡卻沒有那份依賴,要到 runtime 才炸(找不到 .so),
   錯誤訊息完全連不回「忘了寫一行 COPY」。
   > Oracle 以外的 mounts 目前**不會**被同步 —— 宣告了也不會出現在目標機,別依賴它。

### 5. 真的把它跑起來(**不可略過**)

前面四步都只是「檔案長得對」。檔案長得對而 build 不起來、起來又 crash,是最常見的情況 ——
所以**產完一定要在這裡真的跑一次**,不要 push 出去等 CI 或等部署才發現。

```bash
node ~/.claude/skills/containerize/verify-up.mjs staging
```

這支會:`docker compose build` → `up` → 把自己接進 compose 的 network 直接 curl 服務 →
不論成敗都把東西收乾淨。**exit 0 才算過**;失敗時 stderr 會有真實錯誤與容器最後 60 行 log。

- 它刻意**不綁宿主 port、不掛宿主上不存在的 bind、容器名加 `cfverify-` 前綴** ——
  你的容器用的是【宿主的 docker daemon】,直接 `docker compose up` 會佔用宿主 port、
  把 bind 掛到宿主上不存在的路徑(daemon 會默默建空目錄 → 服務起得來但讀不到檔)、
  甚至撞到宿主上正在跑的同名容器。所以**請用這支,不要自己下 `docker compose up`**。
- 失敗就修 Dockerfile / compose,**改完重跑到過為止**。這是「能不能部署到目標主機」
  在 push 之前唯一能得到的真答案。
- 真的有外部相依(要連公司 DB、要 Oracle 憑證…)而在這裡起不來:把「跑到哪裡、卡在什麼」
  寫進 PR 說明,不要假裝驗過。

### 6. 確認部署請求 workflow 到位

`.gitea/workflows/deploy.yml` 的作用是 push 後向後台請求部署(**它自己不部署**,也拿不到 SSH 金鑰)。
缺就補一份:`on: push: branches: [dev, main]`,job 只做一件事 —— 帶 org secret `DEPLOY_REQUEST_TOKEN`
`curl -X POST "$DEPLOY_CONTROL_URL/api/deploy/request"`,body 帶 `repo`/`branch`/`commit`/`pusher`。
沒設 token 時要綠燈 no-op(不弄壞還沒接管的專案)。可直接抄同 org 其他 repo 的既有 `deploy.yml`。

### 7. 檢查 .gitignore(容易漏的坑)

`.env.local` 常被 `.gitignore` 擋掉。它**必須進 git**(rsync 從 git checkout 出來的工作目錄同步,
不在 git 裡的檔案上不了目標機,容器就會因缺環境變數啟動失敗)。
被擋到就在 `.gitignore` 加 `!.env.local` 例外,並在 PR 說明講明白這件事。

> 值留空是刻意的:**不要**把任何真實密碼/連線字串寫進去。

### 8. 收尾:commit + 開 PR

全部變更 commit 到目前的工作分支,照標準流程開 PR(Gitea 走 `gitea-ops` §3)交付審查,**不要直推**。

PR 說明要包含:
- 產了哪些檔、每個環境用哪個 port
- 自選的值(port / 容器 port / base image)與理由
- **使用者必須自己填的東西**:`.env.local` 的哪些 key 要填什麼
- 六道守衛的自檢結果(逐條 ✓)
- **`verify-up.mjs` 的實跑結果**(通過就貼那行 ✅;沒跑過不准說「已驗證」)

## 注意

- ⚠️ **絕不把機密寫進 compose / Dockerfile / .env.local** —— 值一律留空給人填。
- 不要動既有的 `compose.example.yml`(那是模板留的樣板,不是實際環境)。
- 多服務專案(app + db)要不要把 DB 也放進 compose,看專案實況決定;若目標機已有共用 DB,
  compose 只放 app、連線資訊走 `.env.local`。
- 完整可對照的範例見 `references/`。
