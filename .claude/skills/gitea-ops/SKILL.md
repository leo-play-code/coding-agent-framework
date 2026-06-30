---
name: gitea-ops
description: Gitea 版的 git 操作全套(對應 GitHub:gh→tea、GitHub Actions→Gitea Actions)。建 repo、push、開 PR、建 CI(.gitea/workflows)、修 CI 到綠燈。容器內 `tea` 已登入、git 已可 push 到 gitea:3000。
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Grep
  - Glob
triggers:
  - gitea
  - 推到 gitea
  - gitea push
  - gitea 開 pr
  - gitea ci
  - gitea actions
  - tea repo
  - 公司 git
  - 內部 git
---

# gitea-ops — Gitea 版 git/CI 全套

把「GitHub 做的事」用 Gitea 做一遍。指令不同但對應如下:

| GitHub | Gitea(本 skill) |
|---|---|
| `gh repo create` | `tea repo create` |
| `gh pr create` | `tea pr create` |
| `.github/workflows/` | **`.gitea/workflows/`** |
| GitHub Actions | **Gitea Actions**(runner 已架好,label `ubuntu-latest`) |
| `gh-actions-fix` / `gh run` | 本 skill「§5 CI 修到綠」(用 commit status + 本地重現) |

> **何時用**:當任務的 git 目標含 Gitea(見 coding-agent CLAUDE.md「git 目標」決策)。GitHub + Gitea 兩者都要時,GitHub 那套照舊跑,**這個 skill 把同樣的事在 Gitea 再做一次**。

## 0. 前置(容器內已備好,確認即可)

```bash
tea logins list            # 應有一個 name=gitea 的登入(預設 default）
git config --get credential.http://gitea:3000.helper   # 應為 store（git push 免帳密）
```
- 容器內 Gitea 位址固定 **`http://gitea:3000`**(cf-net 內網)。
- repo 擁有者:**自己的帳號**(個人),或共用組織 **`team`**(多人共享的 repo 放這)。
- 若 `tea logins list` 空 → 此使用者尚未連接 Gitea,請他到 dev-agent「開發者連接」連好再來。

## 1. 建 repo

```bash
# 個人:
tea repo create --name <repo> --private
# 放共用組織:
tea repo create --name <repo> --owner team --private
```

## 2. 加 remote + push(與 GitHub remote 並存)

用獨立 remote 名 `gitea`,這樣 origin(GitHub)與 gitea 可同時存在、兩邊都推:
```bash
OWNER=$(tea logins list 2>/dev/null | awk -F'|' '/gitea/{gsub(/ /,"",$5);print $5;exit}')   # 或 team
git remote add gitea "http://gitea:3000/${OWNER}/<repo>.git" 2>/dev/null || \
  git remote set-url gitea "http://gitea:3000/${OWNER}/<repo>.git"
git push -u gitea "$(git branch --show-current)"
```
憑證已由 dev-agent 注入(`~/.git-credentials`),push 不需帳密。

## 3. 開 PR

```bash
tea pr create --repo <owner>/<repo> --head <branch> --base main --title "<標題>" --description "<說明>"
tea pr list --repo <owner>/<repo>            # 確認
```

## 4. 建 CI(Gitea Actions)

工作流放 **`.gitea/workflows/`**(不是 `.github/`)。語法與 GitHub Actions 相容,`runs-on` 用 **`ubuntu-latest`**(runner 已對應到 node:20)。

- 若專案已有 `.github/workflows/*.yml`(GitHub 那套),**直接複製到 `.gitea/workflows/`** 即可(語法相容);只把 GitHub 專屬的 action(如 `actions/checkout@v4`)保留即可,Gitea Actions 支援。
- 從零建,依技術棧產 lint / type-check / test / build gate(同 `ci-setup` 的內容,只是放 `.gitea/workflows/ci.yml`)。

範例(Node 專案):
```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm test --if-present
      - run: npm run build --if-present
```
push 後即觸發。**secrets 絕不寫進 YAML** — 用 Gitea repo 的 Secrets(`${{ secrets.X }}`)。

## 5. CI 修到綠(對應 gh-actions-fix)

`tea` 0.9.2 沒有 actions 子指令,改用 **commit status + 本地重現**:

```bash
# 查最新 commit 的 CI 結果(success / failure / pending）
curl -s -u "$GU:$GP" "http://gitea:3000/api/v1/repos/<owner>/<repo>/commits/$(git branch --show-current)/status" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['state'],[(s['context'],s.get('state')) for s in d['statuses']])"
```
> `$GU:$GP` 用該使用者的 token 當 basic auth(token 即可:`-u <login>:<token>`),或從 `~/.git-credentials` 取。

修法循環(直到 state=success):
1. 失敗 → **在容器內本地重現** workflow 的步驟(就是 YAML 裡那幾條 `run:`,例如 `npm ci && npm run lint && npm test && npm run build`),看真正的錯誤。
2. surgical 修掉(照既有慣例,不順手重構)。
3. `git push gitea`,等 ~10s 再查 commit status。
4. 還紅 → 回 1。

不要盲改 YAML;先用本地重現拿到真實錯誤再修。

## 重點

- 工作流目錄是 **`.gitea/workflows/`**;`runs-on: ubuntu-latest`。
- 多人共用的 repo 放 **`team`** 組織;個人實驗放自己帳號。
- GitHub + Gitea 兩者都要時,把 `.github/workflows/` 複製一份到 `.gitea/workflows/` 最省事(語法相容)。
- 一切走容器內 `http://gitea:3000`(cf-net),不要用 1.1.7.75:3000(那個只開給 nginx)。
