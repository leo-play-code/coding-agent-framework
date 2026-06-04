---
name: ci-setup
description: 依專案技術棧從零產出 GitHub Actions CI workflow(lint / type-check / test / build gate)。與 gh-actions-fix 互補(那個修現有 CI)。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - 設定 CI
  - 建立 CI
  - 加 github actions
  - 建 CI workflow
  - set up ci
  - create ci pipeline
  - add github actions workflow
  - scaffold ci
---

# ci-setup — 從零建立 GitHub Actions CI

目的:依專案技術棧產出一份 CI workflow,設好 lint / type-check / test / build 關卡。
這是「**建立**新 CI」;要 **debug 現有 CI 到綠燈** 用 `gh-actions-fix`。

## 流程

### 1. 偵測技術棧
用 Glob/Grep 找:
- runtime / 套件管理器:`package.json`(npm/pnpm/yarn/bun)、`pyproject.toml`/`requirements.txt`、`go.mod`、`Cargo.toml`、`composer.json`、`Gemfile`、`mix.exs`
- 測試框架:`vitest/jest/playwright.config`、`pytest.ini`、`go test`、`cargo test`、`phpunit.xml`
- lint/type:`eslint`、`ruff`/`mypy`、`tsc`、`gofmt/golangci-lint`、`clippy`

### 2. 確認要哪些 gate(用 AskUserQuestion,除非已能從專案推斷)
預設:`install → lint → type-check → unit test → build`。E2E(playwright)視需求加。

### 3. 產出 `.github/workflows/ci.yml`
- `on: [push, pull_request]`(針對 main / 目標分支)
- jobs:依棧安裝相依 → lint → type-check → test → build
- **cache 相依**(actions/setup-* 的 cache,或 actions/cache)
- 可選 matrix(多版本/多 OS)
- `permissions:` 給**最小權限**(預設 `contents: read`)

### 4. 已有 workflow 就補,不覆蓋
讀現有 `.github/workflows/*.yml`,只補缺的 gate,保留既有設定。

### 5. 收尾
提示:push 後用 `gh-actions-fix` 確保跑到綠燈。

## 注意
- ⚠️ **絕不把 secrets / token 寫進 YAML** —— 用 GitHub Secrets(`${{ secrets.X }}`)。
- gate 指令要對齊專案實際的 script(讀 `package.json` scripts / Makefile,不要硬編一套不存在的指令)。
