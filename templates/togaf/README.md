# TOGAF ADM 模板總覽

本資料夾把 TOGAF 架構發展方法(ADM)的每個階段切成獨立模板,每份都是**可填空**的 markdown。
使用方式:把整個 `togaf/` 複製到專案的架構文件區,從 `0-preliminary.md` 開始依序填寫,或針對單一階段使用。

## 工作流:現況(srs)+ 目標(PRD)→ ADM gap
TOGAF 各階段吃兩份輸入:**現況 (Baseline) 來自 [`../srs.md`](../srs.md)**(逆向工程既有系統),**目標 (Target) 來自 [`../prd/`](../prd/README.md)**(`/spec` 收斂後填的分層 PRD)。各階段只做 gap 分析與 roadmap,**不重抄 srs / PRD 的細節**。

```
既有程式碼/系統 ─(逆向工程)→ srs.md(現況 Baseline)
使用者意圖 ─(/spec)→ docs/prd/(目標 Target)
                          └─→ ADM A → B → C1 → C2 → D → E → F → G → H
                              (srs=現況、PRD=目標,各階段做 gap 分析)
```

> 註:greenfield(全新)專案沒有既有系統可逆向,可略過 srs.md,各階段 Baseline 視為空,PRD 即主要需求來源。
> 對應:C1 ← PRD_Data、C2 ← PRD_Application + PRD_API、D ← PRD_Technology、A/B ← PRD_Business。

## 階段一覽

| 檔案 | 階段 | 一句話目的 |
|------|------|-----------|
| [0-preliminary.md](0-preliminary.md) | 準備階段 (Preliminary) | 確立架構原則、客製 TOGAF、建立治理 |
| [A-architecture-vision.md](A-architecture-vision.md) | A 架構願景 | 定範疇與願景、確認利害關係人、取得批准 |
| [B-business-architecture.md](B-business-architecture.md) | B 業務架構 | 現況/目標業務模型、流程、價值流 |
| [C1-data-architecture.md](C1-data-architecture.md) | C 資訊系統架構 — 資料 | 企業資料的管理、結構與儲存 |
| [C2-application-architecture.md](C2-application-architecture.md) | C 資訊系統架構 — 應用 | 軟體應用系統及其互動關聯 |
| [D-technology-architecture.md](D-technology-architecture.md) | D 技術架構 | 軟硬體基礎設施與技術標準 |
| [E-opportunities-and-solutions.md](E-opportunities-and-solutions.md) | E 機會與解決方案 | 實施順序、交付策略、過渡架構 |
| [F-migration-planning.md](F-migration-planning.md) | F 移轉規劃 | 詳細實施計畫、時程、資源 |
| [G-implementation-governance.md](G-implementation-governance.md) | G 實施治理 | 監督執行、確保符合架構 |
| [H-architecture-change-management.md](H-architecture-change-management.md) | H 架構變更管理 | 監控環境變化、維護架構生命週期 |

## 貫穿全程:需求管理 (Requirements Management)
TOGAF ADM 的圓心是需求管理 —— 不是一個依序執行的階段,而是**貫穿 A–H 的持續活動**:每個階段產生與消費的需求都進出此處。請在各階段的「需求變更」區塊登錄需求,維持一份單一真實來源。

## 填寫慣例
- `「待填」` = 需替換的內容。
- 表格留空格即為填寫區。
- `- [ ]` = 出場前要勾選的檢查點。
