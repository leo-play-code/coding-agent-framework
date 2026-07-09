---
name: acceptance-report
version: 0.1.0
description: 為任何專案類型產出 PM/RD/User 三方協作的驗收與驗證報告——使用者驗收報告(勾填)+ 開發者驗證報告(證據力分級)+ 三方狀態表(需求→實作→驗證→驗收)。開發完一個功能後、或要讓 PM/RD/User 對「做完沒、驗過沒、收了沒」達成共識時使用。支援汰換/重寫、全新功能、API/後端、一般 web app 四種 profile。
triggers:
  - 驗收報告
  - 驗證報告
  - acceptance report
  - UAT
  - PM RD User 協作
  - 三方狀態
  - 使用者驗收
  - 開發者驗證
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
---

# acceptance-report — 跨專案類型的三方驗收/驗證報告

讓 **PM、RD、User** 對每個功能有一致的溝通語言:**做完沒、驗過沒、收了沒**。
不管專案是汰換重寫、全新功能、API 還是一般 web app,都產出同一套三份報告;
差異只在「驗證基準從哪來」(profile)。

## 三份固定產物(任何專案類型都一樣)
| 產物 | 給誰 | 內容 |
|---|---|---|
| `使用者驗收報告.md` + `.xlsx` | User / PM | 每功能逐條**驗收準則**勾填 PASS/FAIL(report 類加欄位逐格) |
| `開發者驗證報告.md` | RD | 每功能「用什麼基準、什麼策略驗、證據力多強」+ 證據力分佈 |
| `三方狀態表.md` | PM | 每功能 `需求→實作→驗證→驗收` pipeline,一眼看協作進度 |

## 證據力分級(跨 profile 一致,務必誠實標)
- **A 最強** — 對權威基準做過**獨立比對並通過**(舊系統逐格對 / 對 spec 驗收準則 verify 全綠 / API 契約測試 / UI 逐步驟 qa+截圖)。
- **B 中** — 自動化測試或內部一致性通過,**但尚未對權威基準**(恆等式、單元測試綠但無驗收操作)。
- **C 弱** — 僅實作完成,尚未驗證。
> 別把「測試綠」講成「已對基準」。B/C 就誠實標,列進「待補」。

## Profile — 依專案類型決定「驗證基準」
| profile | 專案類型 | 驗收準則來源 | 驗證基準 | 詳見 |
|---|---|---|---|---|
| `migration` | 汰換/重寫 | 舊系統既有功能 | 對舊系統逐格對等 | `profiles/migration.md` |
| `greenfield` | 全新功能 | 需求/spec | 對 spec 驗收準則(串 `spec`/`verify`) | `profiles/greenfield.md` |
| `api` | API/後端 | API 合約 | 對 OpenAPI/schema + 行為(契約測試) | `profiles/api.md` |
| `webapp` | 一般 web app | PM 驗收清單 | 對 UI 行為清單(串 `qa`/`verify`) | `profiles/webapp.md` |

一個 manifest 可混多種 profile(每個 feature 各自標 `profile`)。

## 產出流程

### Step 0 — 判定 profile
對每個要納入的功能,判它屬哪個 profile(汰換/全新/API/webapp)。同一專案可混用。
不確定就用 `AskUserQuestion` 問使用者這批功能的類型。

### Step 1 — 抽料(核心,忠實來自程式碼/需求,勿憑印象)
對每個功能抽出一筆 manifest feature 物件。**共通欄位**:
- `id` / `name` / `surface`(route / endpoint / module 路徑) / `profile`
- `acceptance[]` — User 逐條驗收準則(來源依 profile,見各 profile 檔)
- `fields[]` — (report/表格類才有)逐格對基準的欄位
- `writes` — 寫入/副作用警語(有寫入/金流/寄信/寫回一定要標)
- `status` — `{spec,impl,verify,accept}` 各 `done|pending|na|blocked`
- `owner` — `{pm,rd}`
- `verification` — `{baseline, strategy, evidenceLevel(A/B/C), ...}`(依 profile 補 harness/contract/criteriaSource/screenshots)

**怎麼抽,依 profile 讀不同來源** → 見 `profiles/<profile>.md`。Schema 範例見 `references/manifest.example.json`(四種 profile 各一筆)。

### Step 2 — 產三份報告(不碰 DB,純從 manifest)
```bash
node scripts/gen-acceptance-report.mjs docs/acceptance/manifest.json
```
一次產出 `使用者驗收報告.xlsx/.md`、`開發者驗證報告.md`、`三方狀態表.md` 到 `meta.outDir`。
(需 `exceljs`;跑前 `npm i exceljs`。)

### Step 3 — 補開發者驗證證據(依 profile 提升證據力)
照該 profile 的策略實際驗證,把證據力從 C→B→A,並回填 `verification` 後重跑 Step 2:
- `migration`:harness 對真 DB 逐格對等 → 見 `profiles/migration.md`(可直接用 `test-parity` skill)。
- `greenfield`:`verify` 端到端跑驗收準則 + 單元測試。
- `api`:契約測試(回應對 schema)+ 範例 req/resp。
- `webapp`:`qa` 逐步驟操作 + 截圖存 `screenshots` 路徑。

### Step 4 — 交付與協作
- 要給 User/主管看的正式版:對 `使用者驗收報告.md` 跑 `make-pdf`。
- PR 描述引用 `三方狀態表.md`,讓 PM 一眼看進度。
- 每次有新功能/改動 → 回 Step 1 append 或更新該筆 feature,重跑,報告永遠對齊現況。

## 檔案佈局(產物)
```
docs/acceptance/
  manifest.json          # 功能清單(資料源;新功能 append)
  使用者驗收報告.xlsx/.md  # User/PM
  開發者驗證報告.md         # RD
  三方狀態表.md            # PM
  shots/<功能>/           # webapp profile 的驗收截圖
```

## 常見坑
- **證據力別灌水**:沒對基準就是 B/C,誠實標,別讓 PM/User 以為已驗收。
- **acceptance 要可勾填**:每條是 User 能實際操作判 PASS/FAIL 的具體行為,不是抽象需求。
- **抽料來自程式碼/合約/spec**:route/endpoint/欄位/錯誤碼以實作為準。
- **寫入一定標警語**:有副作用的功能,測寫入前需確認/授權。
- **狀態要真**:`status.accept=done` 只有在 User 真的簽核後才填。

## 隨附
- `scripts/gen-acceptance-report.mjs` — manifest → 三份報告。
- `profiles/{migration,greenfield,api,webapp}.md` — 各專案類型的抽料與驗證指引。
- `references/manifest.example.json` — schema + 四 profile 範例。
- 串接:`spec`(驗收準則)、`verify`/`qa`(RD 證據)、`make-pdf`(交付)、`test-parity`(migration 逐格對等)。
