---
name: gh-actions-fix
description: 用 gh CLI 反覆 debug GitHub Actions 失敗直到綠燈:讀失敗 log → 修 → push → 等結果 → 重試。
allowed-tools:
  - Bash
  - Read
  - Edit
  - Grep
  - Glob
triggers:
  - 修 CI
  - CI 紅了
  - github actions 失敗
  - actions 沒過
  - 讓 CI 過
  - fix the ci
  - debug github actions
  - make ci pass
---

# gh-actions-fix — debug GitHub Actions 到綠燈

目的:用已安裝的 `gh` CLI,循環修復 CI 直到通過。

## 前置
- 確認在 git repo、有 GitHub remote、`gh auth status` 已登入。

## 循環(每輪)
1. 找最新失敗的 run:
   `gh run list --branch "$(git branch --show-current)" --limit 5`
2. 看失敗詳情與失敗 log:
   `gh run view <run-id>` → `gh run view <run-id> --log-failed`
3. 定位失敗的 job / step 與錯誤訊息,讀相關檔案。
4. 盡量在本機重現該步驟(跑同樣的 test / lint / build 指令)。
5. 修正 → 說明這輪改了什麼 → commit + push。
6. 等新一輪結果:`gh run watch <new-run-id>`(或輪詢 `gh run list`)。
7. 綠燈 → 結束;仍紅 → 回到步驟 2。

## 注意
- ⚠️ **不要為了讓 CI 過而刪測試、略過檢查、或 `--no-verify`**;要修根因。
- 設**上限(預設 5 輪)**:連續修不好就停下,把目前診斷整理給使用者,不要無限迴圈。
- 每輪 commit 訊息要能看出修了什麼。
- 可搭配內建 `/loop` 做自動輪詢等待。
