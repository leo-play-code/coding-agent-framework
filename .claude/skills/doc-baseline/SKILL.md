---
name: doc-baseline
description: 確保專案具備「標準架構文件集」(srs.md 逆向工程版 + TOGAF A–H);缺則逆向工程補齊,非本模板格式則正規化取代,讓專案有完整可依循的方向。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - 建立架構文件
  - 補架構文件
  - 文件基準化
  - 正規化文件
  - 產出 srs 和 togaf
  - establish architecture docs
  - normalize project docs
  - bootstrap architecture docs
---

# doc-baseline — 建立 / 正規化標準架構文件集

目的:讓**既有專案**具備一套完整、可依循、且**符合本專案標準模板**的架構文件:
- `srs.md`(逆向工程版,§0–§9)
- `togaf/` 全套(`0-preliminary`、`A`、`B`、`C1`、`C2`、`D`–`H`)

模板來源:`templates/srs.md`、`templates/togaf/`。產出的是**填好內容**的文件,放在目標專案。

## 流程

### 1. 盤點現況
用 Glob/Grep 找專案既有的 `srs.md`、`togaf/`、或其他架構文件(`architecture.md`、design docs、ADR…)。
對每一類判斷狀態:**缺少** / **存在且符合本模板** / **存在但格式不同**。

### 2. 依狀況處理
- **缺少** → 逆向工程補齊:讀既有程式碼,用 `templates/srs.md` 產出 `srs.md`(現況 Baseline),再用 `templates/togaf/` 產出 TOGAF(以 srs 為各階段 Baseline)。**產出完整結構,但內容份量隨專案規模**(見下「份量原則」)。
- **格式不同(非本模板)** → 讀舊文件**萃取內容** → 用本模板**重產取代**。
  ⚠️ **取代前先用 AskUserQuestion 跟使用者確認**,並把舊檔備份成 `*.bak`(不直接丟棄)。
- **已符合本模板** → 只檢查是否過時,需要才更新,不重做。

### 3. 收尾
列出「產出 / 取代 / 保留」了哪些檔,確認專案現在有完整可依循的架構文件集。

## 份量原則(避免對小專案過度)
**一律產出完整的文件「結構」(srs §0–§9、TOGAF `0`/`A`–`H`),但「內容深度」隨專案規模調整:**
- **小 / 簡單專案**:不適用或無內容的階段用「簡述 / N/A」一兩行帶過,不硬湊。
- **大 / 複雜專案**:各階段填完整。
- 判斷依據:模組數、是否多服務、資料/整合是否複雜。
- 一次性 onboarding;之後只增修受影響章節,不重跑全套。

## 注意
- 取代既有文件是破壞性操作 → **務必先確認 + 備份 `.bak`**。
- 大型專案的逆向工程**分模組**進行;程式碼看不出意圖處標 `❓待確認` 回報使用者。
- 這是**一次性 onboarding**:之後該專案已有基準,後續小 feature 只增修受影響章節,不必重跑全套。
