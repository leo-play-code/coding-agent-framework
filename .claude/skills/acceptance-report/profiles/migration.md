# profile: migration — 汰換/重寫(對舊系統逐格對等)

適用:把舊系統(舊 ERP / Oracle Forms / legacy app)逐支重寫成新系統。基準 = **舊系統本尊**。

## 驗收準則來源(acceptance[])
新系統要**重現舊系統既有行為**,所以驗收準則 = 舊功能該做的事:
- ① 查詢/操作能得到正確結果 ② 匯出 ③ 列印 ④ 每欄資料與舊系統逐格相符。
從新系統該功能的程式碼抽:
- `types.ts` → 查詢參數(查詢條件)、輸出 row 欄位(→ `fields[]`)
- `page.tsx` → UI 條件、表格欄位、匯出/列印按鈕、寫入按鈕(→ `writes`)
- `logic.ts` → 彙總/分桶邏輯(定恆等式)
- `oracle.ts`/資料層 → 真實來源(harness 要 import 的函式)

## 驗證基準與策略(verification)
- `baseline`:舊系統逐格對等(legacy 匯出檔 `legacy/<code>__<參數>.xlsx`,或先前人工驗值)。
- `strategy`:harness 對真 DB 跑新系統資料層 → 逐格 diff + 恆等式(彙總==逐筆加總==桶合計)。
- 提升證據力:
  - **A** — 有 legacy 實際匯出檔,逐列逐欄 diff 通過。
  - **B** — 即時計算、legacy 未存回:恆等式內部一致 + 沿用先前人工驗值。
  - **C** — 只有恆等式,尚無 legacy 檔。

## 直接複用 test-parity
這個 profile 就是 `test-parity` skill 做的事。若專案已裝 `test-parity`,可直接用它的
`gen-uat-report.mjs` + `run-app.harness.mjs`,或把其 manifest 模組對映成本 skill 的 feature
(`fields`/`writes`/`verification` 對得起來)。本 skill 額外提供跨 profile 的三方狀態表。

## 額外產物
- `report/parity-<code>.md`(harness 逐格證據,見 test-parity 的 parity 模板)。
