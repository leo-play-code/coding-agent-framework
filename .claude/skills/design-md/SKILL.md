---
name: design-md
description: 為專案挑選、建立、或「從既有前端程式碼反推」DESIGN.md 設計語言,輸出風格指引並確保新開發與既有風格一致。不生成實際元件。
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - 套用設計風格
  - 用 design.md 做設計
  - 我要做 UI 設計
  - 分析現有專案風格
  - 沿用既有風格 / 保持風格一致
  - 設定專案的設計語言
  - apply a design system
  - match existing style
  - extract design system from code
  - set up DESIGN.md
---

# design-md — 建立並套用專案的設計語言

目的:替專案確立一份 `DESIGN.md`(視覺設計語言),並輸出給開發階段用的風格指引。
**本 skill 不寫實際元件 / 不選框架** —— 那是後續開發階段的事。

> **與 PRD_Frontend 的分工**:`docs/prd/PRD_Frontend.md` 寫「**有哪些畫面、放什麼欄位、怎麼流轉**」(結構/內容);`DESIGN.md` 寫「**長什麼樣**」(色/字/間距/圓角/動效 token)。兩者互補,不重複。

## 流程

### 1. 先判斷專案前端狀態,決定走哪條路
用 Glob 找 `DESIGN.md` 與既有前端。
- 已有 `DESIGN.md` → 讀它,跳到步驟 4。
- 有**實質**既有前端(自訂元件 / token / 主題)**且**意圖是**沿用** → 步驟 2(反推現用風格)。
- **只是框架預設樣板**(create-* 的預設 config、無自訂元件)、或意圖是**重新設計**、或全新無前端 → 步驟 3(選新來源)。

### 2. 既有專案:從程式碼反推現用設計系統(保持一致性的關鍵)
掃描並萃取**實際在用**的設計語言,優先順序:
- **設定檔**:`tailwind.config.*`(色彩/間距/字體/斷點/圓角)、UI 框架主題(MUI/Chakra/Ant/shadcn 的 theme)、`theme.ts/js`、design tokens。
- **CSS 變數 / 全域樣式**:`:root` 變數、全域 CSS、`styled-*`。
- **既有元件**:讀數個 button / card / input,歸納命名與組合 pattern。
- **沒有設定檔時**:`grep` 重複出現的色碼、字體堆疊、間距值,推出 de-facto 尺度。
產出:把萃取結果寫成 `DESIGN.md`(色彩、字體階層、間距、圓角/陰影、元件 pattern),並標註「來源:逆向自既有程式碼」。
⚠️ **若發現既有風格不一致**(多套色/字、ad-hoc 值散落)→ 回報使用者,問要「忠實沿用現狀」還是「順手統一成一套」。

### 3. 全新專案:確立來源(用 AskUserQuestion 問使用者)
- **(a) 套用現成品牌**:`gh api repos/VoltAgent/awesome-design-md/contents/design-md --jq '.[].name'` 列品牌讓使用者選,再抓:
  `gh api repos/VoltAgent/awesome-design-md/contents/design-md/<品牌>/DESIGN.md --jq '.content' | base64 -d` 寫進根目錄。
  ⚠️ 套用真實品牌只當起點;正式產品建議改自有品牌。
- **(b) 自訂品牌**:轉交 gstack `/design-consultation` 從零建。
- **(c) 我已經有 / 直接貼**:用使用者內容寫成 `DESIGN.md`。

### 4. 輸出「給開發階段的風格指引摘要」
摘要至少涵蓋:主色 + 語義色、字體階層、間距尺度、圓角/陰影、互動與動效語氣。
**一致性要求(交給開發階段遵循)**:
- 沿用既有元件 / primitives,**不重造**已存在的東西。
- 用既有 token / utility class,**不新增 ad-hoc 值**。
- 標註:實際元件由框架/開發階段實作,本階段只定義風格。

### 5.(選配)收尾提示
完成後可用 `/design-review` 檢查新畫面與既有風格的一致性;或 `/design-html` 把設計做成 HTML。
