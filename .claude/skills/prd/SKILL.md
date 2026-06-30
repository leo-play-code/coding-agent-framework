---
name: prd
description: 依 templates/prd/ 產出/更新專案 docs/prd/ 的分層 PRD(目標 Target);作為 TOGAF 各階段的 Target 來源。新專案/重構填全套,加 feature 只填受影響層;以 srs.md(現況)為對照,不重抄。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - 產出 prd
  - 寫產品需求文件
  - 填 prd
  - 更新 prd
  - 產品需求文件
  - author a prd
  - write product requirements
  - fill in the prd
---

# prd — 產出 / 更新分層 PRD(目標 Target)

目的:把 `/spec` 收斂的需求,依 `${CODING_AGENT_DIR:-.}/templates/prd/` 結構化成專案的**目標 (Target)** 文件,放在 `docs/prd/`。
**PRD 是 TOGAF 各階段的 Target 來源**(srs=現況、PRD=目標)。本 skill 只寫目標,不重抄現況、不寫架構 gap(那是 TOGAF 的事)。

模板來源:`${CODING_AGENT_DIR:-.}/templates/prd/`(`README`、`PRD_Business`、`PRD_Data`、`PRD_Application`、`PRD_API`、`PRD_Frontend`、`PRD_Technology`;容器內 `CODING_AGENT_DIR=/workspace`)。產出的是**填好內容**的文件,放目標專案 `docs/prd/`。

## 前置
- 必須先有 `/spec` 的需求與框架選型結論。沒有 → 提醒先跑 `/spec`,不要自行假設需求。

## 流程

### 1. 判斷情境與範圍
- **新專案 / 重構** → 填**全套**(無前端可略 `PRD_Frontend`)。
- **加 feature** → 只填**受影響的層**(動到資料填 `PRD_Data`、動到畫面填 `PRD_Frontend`、動到介面填 `PRD_API`…);小 feature 可不產。
- 用 Glob 看 `docs/prd/` 是否已存在 → 有就**增修**對應層,沒有就從模板新建。

### 2. 取得來源
- `/spec` 結論(需求、user stories、框架選型)。
- **重構 / 加 feature**:讀 `srs.md`(現況)當對照,確保 PRD 寫的是「目標」而非複述現況。
- 既有 `DESIGN.md`(若有)→ `PRD_Frontend` 不重複視覺 token,只引用。

### 3. 依模板填寫到 docs/prd/
逐層用 `${CODING_AGENT_DIR:-.}/templates/prd/<檔>` 產出對應內容:
- **PRD_Business**:願景、目標使用者、商業目標 + 可量測 KPI、範圍與非目標、user stories(標優先級)。
- **PRD_Data**:資料實體、核心表欄位,**+ 資料庫格式 & SQL 語法慣例(命名/型別/migration 規範)+ 範例 DDL**、約束、索引策略。
- **PRD_Application**:模組/元件職責、互動、狀態機與不變式。
- **PRD_API**:認證/授權、endpoint 清單、關鍵 endpoint 的 req/resp、錯誤碼慣例。
- **PRD_Frontend**:畫面清單、wireframe、欄位、流程、loading/empty/error/success 狀態(**視覺細節歸 `DESIGN.md`,本檔只寫結構/內容**)。
- **PRD_Technology**:技術棧選型 + 理由、部署目標、非功能需求(可量測)。

### 4. 收尾
- 列出**產出 / 更新**了哪些 PRD 檔。
- 交棒提示:TOGAF 各階段以這些 PRD 為 **Target**(C1←PRD_Data、C2←PRD_Application+PRD_API、D←PRD_Technology、A/B←PRD_Business);`db-design` 以 PRD_Data 為目標;`design-md` 維護 PRD_Frontend 對應的視覺語言。

## 份量原則(避免過度)
- **一律產出對應層的完整「結構」(各 §section 與出場檢查點),但「內容深度」隨規模調整**:小專案不適用的區塊用「簡述 / N/A」帶過,不硬湊。
- 加 feature 只動受影響層,不重寫全套。

## 注意
- 只寫**目標**;現況寫在 `srs.md`,架構 gap 寫在 `togaf/`,視覺寫在 `DESIGN.md` —— **不重複**。
- 取代既有 `docs/prd/` 內容前,若會覆寫使用者已填的實質內容 → 先用 AskUserQuestion 確認 + 備份 `*.bak`。
- 需求看不出意圖處標 `❓待確認` 回報使用者,不要臆測。
