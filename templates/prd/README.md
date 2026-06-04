# PRD 分層模板總覽(Product Requirements — Target)

本資料夾把產品需求文件(PRD)切成獨立的分層模板,每份都是**可填空**的 markdown。
使用方式:把整個 `prd/` 複製到專案的 `docs/prd/`,從 `PRD_Business.md` 開始依序填寫。

## 流程定位:PRD = 目標 (Target) 的單一真實來源

本專案的文件鏈是「現況 → Baseline → Target → gap」模型:

```
既有程式碼/系統 ─(逆向工程)→ srs.md(現況 Baseline)
使用者意圖 ─(/spec 收斂)→ docs/prd/(目標 Target)   ← 本資料夾
                                  │
        srs(現況) + PRD(目標) ─→ TOGAF A–H 做 gap 分析與 roadmap
                                  │
                  PRD_Data → db-design(migration/SQL)
                  PRD_Frontend → DESIGN.md(視覺語言)→ 開發
```

- **`srs.md`** 記錄「**現在的系統實際做了什麼**」(現況,只在重構/加 feature 時逆向)。
- **`docs/prd/`(本資料夾)** 記錄「**要做成什麼樣**」(目標,含資料格式/SQL 慣例/前端 UI)。
- **`togaf/` A–H** 是銜接層:Baseline 取自 srs、**Target 取自 PRD**,不重抄細節,只做 gap 與 roadmap。

> greenfield(全新)專案沒有既有系統,srs 各章 Baseline 視為空,PRD 即是主要的需求來源。

## 職責邊界(避免與其他文件重複)

| 內容 | 真實來源 | PRD 怎麼處理 |
|------|----------|--------------|
| 既有系統現況 | `srs.md` | 不寫;PRD 只寫目標 |
| 資料實體 + SQL 語法慣例 | **`PRD_Data.md`** | 完整寫(下游 db-design / TOGAF C1 引用) |
| 前端**視覺** token(色/字/間距) | `DESIGN.md` | 不寫;PRD_Frontend 只寫畫面結構/流程 |
| 前端**畫面/欄位/流程** | **`PRD_Frontend.md`** | 完整寫 |
| 架構 gap / roadmap | `togaf/` | 不寫;PRD 只提供 Target 輸入 |

## 分層一覽

| 檔案 | 一句話目的 | 對應 TOGAF/下游 |
|------|-----------|------------------|
| [PRD_Business.md](PRD_Business.md) | 產品願景、使用者、商業目標、成功指標、範圍 | TOGAF A / B |
| [PRD_Data.md](PRD_Data.md) | 資料實體、欄位、SQL 語法慣例、約束、索引 | TOGAF C1 / db-design |
| [PRD_Application.md](PRD_Application.md) | 模組/元件、職責、互動、狀態 | TOGAF C2 |
| [PRD_API.md](PRD_API.md) | endpoint、req/resp、錯誤碼、認證 | TOGAF C2 / SRS §4 |
| [PRD_Frontend.md](PRD_Frontend.md) | 畫面清單、wireframe、流程(視覺歸 DESIGN.md) | DESIGN.md |
| [PRD_Technology.md](PRD_Technology.md) | 技術棧、部署目標、非功能需求 | TOGAF D |

## 各情境用哪些檔

| 情境 | 用哪些 PRD 檔 |
|------|---------------|
| **新專案** | 全套(視有無前端決定是否填 PRD_Frontend) |
| **重構** | 全套(目標),以 `srs.md` 現況做對照 |
| **加 feature** | 只填**受影響的層**(子集);小 feature 可略 |
| **debug** | ❌ 不產 PRD |

## 填寫慣例
- `「待填」` = 需替換的內容。
- 表格留空格即為填寫區。
- `- [ ]` = 出場前要勾選的檢查點。
