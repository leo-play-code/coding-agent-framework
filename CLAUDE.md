# coding-agent — 開發流程路由

這份檔案讓你(Claude)依使用者的自然語言意圖,判斷情境並自動跑對應流程。
使用者不用記指令,只說想做什麼;你判斷屬於哪個情境,跑對應 pipeline。
行為準則沿用全域 `~/.claude/CLAUDE.md`,本檔只定義流程編排。

---

## ⛔ 強制規則 — 違反即為錯誤

> 這些規則的優先級高於一切「效率」或「已知答案」的理由。

1. **每個步驟必須實際呼叫對應 Skill**,不可用內部判斷、直接寫程式碼、或 `AskUserQuestion` 替代。
   - `/spec`、`/design-md`、`prd`、`doc-baseline`、`/ship`、`/code-review` 等是 Skill tool 呼叫,不是可選建議。
   - `feature-dev`、`pr-review-toolkit` 是 **plugin**(非內建 skill):用其 slash command(`/feature-dev`、`/review-pr`),或經 `Agent` tool 帶其 agent type(如 `feature-dev:code-architect`、`pr-review-toolkit:silent-failure-hunter`)。
   - ⚠️ **feature-dev 的 `code-explorer / code-architect / code-reviewer` 是唯讀子代理**(只有 Glob/Grep/Read… 沒有 Edit/Write),用於**探索 / 設計 / 審查**,**不能落地程式碼**。**實作一律用 `general-purpose`**(唯一有 Write/Edit 的實作者)。**絕不**傳 `subagent_type:"feature-dev"`(不存在,會失敗);要嘛主對話跑 `/feature-dev` slash command,要嘛用上面帶冒號的具體 agent type。
   - `AskUserQuestion` 只用於 Skill 無法涵蓋的單點確認(如選擇 port、輸入 DB 連線字串),**不可取代整個步驟**。

2. **⏸ 確認關卡不可跳過**:新專案 / 重構在 TOGAF push 後**必須停下等使用者明確說「繼續」**,才進入開發。不論文件是否「已存在」、「已更新」,關卡就是關卡。

3. **禁止在流程完成前寫任何應用程式碼**:在 `/spec` →(PRD 目標)→ `doc-baseline` → TOGAF → ⏸ 確認全部完成前,不得建立任何 `.ts/.tsx/.py/.go` 等應用程式檔案。

4. **開發一律用 `TaskCreate` + `Agent` 拆分**:不得在主對話直接實作功能。每個 task 給自包含 brief;能平行就用 `isolation: worktree`。

5. **每次 Skill 呼叫前宣告**:一句話說明「現在要跑哪個步驟、呼叫哪個 Skill、原因是什麼」,讓使用者可以即時確認或打斷。

6. **隨時維護狀態檔**(給跨 session 看板用):
   - 每次 phase / skill 切換時,更新專案根 `STATUS.md` —— 沿用既有
     `PHASE/STATUS/AGENT/MESSAGE` 欄位,並多寫一行 **`NEXT:`**(一句話寫「下一步要做什麼」)。
   - 每完成一個里程碑(skill 跑完、phase 推進、平行 task 整合完)時,**append 一行**到專案根
     `JOURNAL.md`,格式固定:`- <ISO8601 時間> [PHASE] 完成了什麼`。**只新增、不重寫、不刪舊行**。
   - 這兩個檔是 Leo 在 Slack / Notion 看板上「在做什麼 / 下一步 / 完成了什麼」的來源,務必即時。

7. **禁止承諾「背景 agent / 非同步工作」**:你的子代理(`Agent`/`Task`)一律在**當前回合內同步執行**,回合一結束(使用者看到「回合結束」)就**什麼都沒在跑**——CF 沒有回合結束後仍持續的背景執行。
   - **嚴禁**用「已交給 ○○ agent 在背景處理 / 它一完成會自動通知你 / 你先等通知」這類說法**結束回合**:不會有任何進程在跑、不會有通知,使用者會空等。
   - 長工作就在**這個回合內**做完——子代理會把回合撐住直到完成(回合可以跑很久,沒關係)。
   - 真的要分批,就**明確把控制權交回**使用者(「我做到這裡,你說『繼續』我接著做」),由使用者的下一句觸發下一回合;**不要**假裝有背景進度在累積。

---

## 核心原則

1. **意圖路由**:判斷四種情境之一(建立新專案 / 重構 / 加 feature / debug)→ 跑對應 pipeline。**若意圖不屬於四情境(如只想 review、跑測試、出 PDF、查健康度)→ 直接路由到「工具對照」表中對應的單一 skill,不必套整條 pipeline。**
2. **需求要談透,不可草率**:用 `/spec` 確認到細節,**包含技術框架選型**(語言、前後端框架、資料庫、部署目標)。涉及前端 → 用 `/design-md`:**新專案問清楚風格**;**既有專案萃取沿用現用風格**。
3. **自主執行**:中途**只在「架構不清晰 / 有多種合理走法」時才停下問**。Skill 之間的執行不需逐步詢問。
4. **確認關卡**:**新專案 / 重構必停** —— TOGAF push 後等使用者確認才開始開發。加 feature 僅在**動到架構**時停;debug 不適用。
5. **破壞性操作**(DB drop / 改型別、force push、刪檔)一律先確認。
6. **平行開發**:`TaskCreate` 拆 task,`Agent`(`isolation: worktree` + 自包含 brief)平行執行;全部完成後整合(merge + 解衝突 + 測試)。任務若完全不共用檔可省略 worktree;相依的循序跑。
7. **完成通知**:全部做完(含 CI 全綠、部署)後用 `PushNotification` 通知使用者。
8. **文件基準化**(僅限**重構 / 加 feature**):這兩種情境前先呼叫 `doc-baseline` skill 確保具備 `srs.md` + TOGAF A–H。**缺 → 逆向工程補齊;格式不對 → 正規化取代(先確認 + 備份 `.bak`)**;已符合則略過。
9. **PRD = 目標 (Target) 的單一真實來源**(新專案 / 重構 / 加 feature):`/spec` 之後、TOGAF 之前,呼叫 **`prd`** skill(依 `templates/prd/` 產出分層 PRD 到專案 `docs/prd/`)。**srs.md=現況、PRD=目標**,TOGAF 各階段的 Target 引用 PRD(不重抄)。新專案 / 重構填**全套**;加 feature 只填**受影響的層**(子集);**debug 不產 PRD**。
10. **專案記憶(gbrain)**:每個專案 = 你個人 brain 裡的一個 source。**開工先召回、里程碑後沉澱**,見下節。

---

## 專案記憶(gbrain)

容器內已備好持久的個人 brain(`gbrain`,OpenAI embedding 已設、跨 session/容器重建都在)。**每個專案註冊成一個 source**,讓你記得這個專案過去的決策與脈絡。指令在專案根目錄用 Bash 跑;`<專案名>` 用 repo 目錄名。

> ### ⛔ 反幻覺護欄 — 不准謊報 gbrain 壞掉
>
> gbrain 在本容器是**正常可用的**(pgvector 內建、embedding key 已注入)。以下是**禁止行為**:
>
> 1. **`gbrain doctor` 的 `[WARN] pgvector: Could not check pgvector extension` 是良性警告,不是故障。** 「Could not check(無法檢查)」≠「未安裝」。extension 有載入、向量搜尋照常運作。**不得**據這行(或任何含 `vector`/`extension` 字樣的 WARN)判定 gbrain 不可用。
> 2. **宣稱 gbrain「未安裝 / 連不上 / 不可用 / 缺 vector extension」之前,必須先實跑一次 round-trip 為證:**
>    `gbrain capture --source <s> "probe" && GBRAIN_SOURCE=<s> gbrain embed --all && GBRAIN_SOURCE=<s> gbrain query "probe"`
>    **只有這個 round-trip 真的報錯**,才算壞掉,且必須把錯誤輸出原文貼出來。query 回得到相似度分數 `[0.xx]` = 正常。
> 3. **若 round-trip 真的報錯**,先自救:`gbrain apply-migrations --yes`,再重試一次 round-trip。仍失敗才回報(貼輸出),並繼續主線(記憶是輔助、不阻斷)。
> 4. **禁止**用「基礎設施問題 / 非本任務範圍」當藉口直接略過記憶而不先做第 2 點的 round-trip 驗證。
>
> 同原則套用到 **skill**:宣稱某 skill「未安裝」前,先 `ls ~/.claude/skills/` 確認;在就是有,直接用 Skill tool 呼叫,不得謊報缺失來跳過必跑關卡。

- **開工召回**(每情境「理解既有程式碼」階段一開始):
  - 註冊/確認 source:先 `gbrain sources list`;沒有才 `gbrain sources add <專案名> --path .`。
  - 召回脈絡:`GBRAIN_SOURCE=<專案名> gbrain query "<這次要做的事>"`,把相關的過往決策讀進來再開始。
    (source 是 isolated,**query 一定要帶 `GBRAIN_SOURCE=<專案名>`** 才會搜到該專案的記憶。)
- **里程碑沉澱**(每次 append `JOURNAL.md` 的同時):
  - `gbrain sync --source <專案名>`(把最新程式碼/文件增量進 brain)。
  - 重要決策/取捨用一句話 `gbrain capture "<決策與原因>" --source <專案名>` 記下(供日後召回)。
- brain 是**個人私有**(per-user 容器,彼此看不到);不需手動 init,容器首次啟動已自動建好。

---

## 工具對照
| 階段 | 工具 |
|------|------|
| 需求 / 規格 | `/spec`(很模糊先 `/office-hours`) |
| 前端細節風格 | `/design-md` → 專案 `DESIGN.md` |
| 產品需求 (PRD,目標) | `prd` skill(依 `templates/prd/` 分層產出 → 專案 `docs/prd/`) |
| 架構文件 | `templates/togaf/`(A–H)、`templates/srs.md` |
| 文件基準化 | `doc-baseline`(缺則產、不符則正規化取代) |
| 規劃 / 審查 | 計畫模式、`/autoplan`、`/plan-eng-review` |
| 前後端 / API 開發 | **plugin `feature-dev`(子代理唯讀)**:`code-explorer` 摸碼 / `code-architect` 出實作藍圖 / `code-reviewer` 審查;**實作落地用 `general-purpose`**(把 architect 的藍圖當自包含 brief)。整段也可在主對話用 `/feature-dev` slash command 跑 |
| 資料庫設計 / migration | `db-design` |
| 測試(含 **unit test**) | `/ship` Test Bootstrap(產 unit test + 覆蓋率)、`/qa`、`/verify`、`playwright`(E2E) |
| UIUX / RWD 測試 | `/design-review`(有前端時;RWD、視覺層級、色彩對比、spacing、WCAG) |
| code review | `/code-review`、**plugin `pr-review-toolkit`**(`/review-pr`,或 `Agent` 帶 `pr-review-toolkit:code-reviewer / silent-failure-hunter / type-design-analyzer …`)、`/review`、`/cso`(安全) |
| 出貨 / push | `/ship`、`git` + `gh`(GitHub)/ `tea`(Gitea,見 `gitea-ops`) |
| CI 建置(從零) | `ci-setup`(GitHub Actions)/ `gitea-ops` §4(Gitea Actions) |
| CI 修到綠燈 | `gh-actions-fix`(GitHub)/ `gitea-ops` §5(Gitea) |
| **Gitea 全套(repo/push/PR/CI)** | **`gitea-ops`** —— GitHub 做的事用 Gitea 再做一遍 |
| 部署 / 上線後 | `/land-and-deploy`(首次先 `/setup-deploy`)、`/canary` |

---

## git 目標(每個任務開頭先決定)

**若系統提示(system prompt)已指明本次 git 目標**(使用者在對話外已選好 GitHub / Gitea),**直接採用,不要再問** —— 略過下面這題的 `AskUserQuestion`,依指定目標處理。只有在系統提示沒指明時,才**用 `AskUserQuestion` 問使用者這次的 git 目標**(repo / push / PR / CI 要推到哪):

- **GitHub** — 照各情境原本的步驟(`gh` / `ci-setup` / `gh-actions-fix`)。
- **Gitea** — 把那些 GitHub 專屬步驟改用 **`gitea-ops`** 做(`.gitea/workflows`、push 到 gitea remote、`gitea-ops` §5 修 CI)。
- **兩者** — GitHub 那套照舊跑,**再呼叫 `gitea-ops` 把同樣的事在 Gitea 做一次**(workflow 直接複製 `.github/` → `.gitea/`)。

**規則**:下面流程中凡出現 GitHub 專屬步驟(`ci-setup`、push、`gh-actions-fix`),依上面選擇對應處理 —— 含 Gitea 就同步呼叫 `gitea-ops`。已連接 Gitea 的使用者(容器內 `tea logins list` 有 gitea)才提供 Gitea 選項。

---

## 情境 1:建立新專案

> 每步執行前說明:「步驟 N:呼叫 [skill]，因為…」

1. 呼叫 **`/spec`** — 談需求到細節 + 技術框架選型。**有前端 → 呼叫 `/design-md` 問細節風格**,不可草率、不可假設。
2. 呼叫 **`prd`** skill 產出**分層 PRD(全套)**到 `docs/prd/` —— 作為整個系統的**目標 (Target)**(含資料格式/SQL 慣例、API、前端畫面、技術選型);無前端可略 PRD_Frontend。
3. 呼叫 **`/autoplan`** 或進入計畫模式規劃 + 審查。
4. 依模板填寫 **TOGAF**(A–H)(`templates/togaf/`;greenfield 各階段 Baseline 留空,**Target 引用 `docs/prd/`**)。
5. 初始化 repo、呼叫 **`ci-setup`** 建立 GitHub Actions CI、commit、push。
6. ⏸ **停下,等使用者明確說「確認」或「繼續」**。
7. 呼叫 **`TaskCreate`** 拆 task → 每個 task:(可選)先用 **`Agent`** 帶 `feature-dev:code-architect` 出實作藍圖當 brief → 用 **`Agent`**(`subagent_type:"general-purpose"`,`isolation: worktree` + 自包含 brief)**落地實作** → 用 `feature-dev:code-reviewer` 審查。可平行的平行、相依的循序;完成後整合(merge + 解衝突 + 測試)。**(實作者必為 general-purpose;feature-dev 子代理唯讀不能寫 code)**
8. 呼叫 **`/ship`** Test Bootstrap 產生並跑 unit test;呼叫 **`/qa`**;呼叫 **`/verify`**;**有前端 → 呼叫 `/design-review`(UIUX + RWD 審查,確保設計符合 DESIGN.md)**。
9. 呼叫 **`/code-review`** + **`pr-review-toolkit`**(+ **`/cso`** 安全審查)。
10. push → GitHub Actions;呼叫 **`gh-actions-fix`** 修到全綠。
11. 呼叫 **`/land-and-deploy`**(首次先 **`/setup-deploy`**)→ **`/canary`** 監控。
12. ✅ 呼叫 **`PushNotification`** 通知使用者。

## 情境 2:重構專案

> 每步執行前說明:「步驟 N:呼叫 [skill]，因為…」

0. 呼叫 **`doc-baseline`** — 讀既有程式碼 → 產出/正規化 `srs.md` + TOGAF A–H。**已有文件不代表可以跳過**;`doc-baseline` 負責驗證格式是否符合本模板。
1. 呼叫 **`/spec`** — 談重構目標 + 框架。**有前端改動 → 呼叫 `/design-md`**:預設萃取沿用既有風格;若要重新設計則問清楚來源。
2. 呼叫 **`prd`** skill 產出/更新**目標 PRD(全套)**到 `docs/prd/` —— 以 `srs.md`(現況)為對照,寫下重構後要長成的樣子(資料/SQL 慣例、API、前端、技術)。
3. 由 srs.md(Baseline)+ PRD(Target)產出/更新 **TOGAF**(各階段以 srs 為現況、PRD 為目標,做 gap 分析)。
4. commit、push。
5. ⏸ **停下,等使用者明確說「確認」或「繼續」**。
6. 呼叫 **`TaskCreate`** 拆 task → 每個 task:(可選)`feature-dev:code-architect` 出藍圖當 brief → **`Agent`**(`subagent_type:"general-purpose"`,`isolation: worktree` + 自包含 brief)**落地實作** → `feature-dev:code-reviewer` 審查 → 整合;資料層變更呼叫 **`db-design`**(以 PRD_Data 為目標、srs §5 為現況;**破壞性 migration 先確認**)。**(實作者必為 general-purpose;feature-dev 子代理唯讀不能寫 code)**
7. 呼叫 **`/ship`** Test Bootstrap;呼叫 **`/qa`**;呼叫 **`/verify`**;**有前端改動 → 呼叫 `/design-review`**;呼叫 **`/code-review`** + **`pr-review-toolkit`**;push;呼叫 **`gh-actions-fix`** 到綠燈。
8. 呼叫 **`/land-and-deploy`** → **`/canary`**。
9. ✅ 呼叫 **`PushNotification`** 通知使用者。

## 情境 3:加 feature(延續既有專案)

> 每步執行前說明:「步驟 N:呼叫 [skill]，因為…」

0. **先摸清現有專案(延續性的關鍵,務必做)**:
   - 用 **`Agent`** 帶 `feature-dev:code-explorer`(唯讀)+ 讀關鍵檔,學既有架構、命名、慣例、測試風格。
   - 呼叫 **`/design-md`** 分析既有前端 —— 有 `DESIGN.md` 就遵循;沒有就反推並寫成 `DESIGN.md`。
   - 呼叫 **`doc-baseline`** 確保有本標準文件集;缺則補,格式不對則正規化取代(先確認)。
1. 呼叫 **`/spec`** — 談這個 feature 的需求到細節。動到前端 → 延續步驟 0 的風格。
2. 大型/動到架構的 feature → 呼叫 **`prd`** skill 填**受影響層的 PRD(子集)**到 `docs/prd/`(動到資料就填 PRD_Data、動到畫面就填 PRD_Frontend…)+ 補 srs/TOGAF 受影響範圍;一般小 feature 略過。
3. ⏸ **只有動到架構才需等確認**;否則繼續。
4. 呼叫 **`TaskCreate`** 拆 task → 每個 task:(可選)`feature-dev:code-architect` 出藍圖當 brief → 可平行就用 **`Agent`**(`subagent_type:"general-purpose"`,`isolation: worktree` + 自包含 brief)**落地實作**,遵循步驟 0 的慣例 → `feature-dev:code-reviewer` 審查。**(實作者必為 general-purpose;feature-dev 子代理唯讀不能寫 code)**
5. 呼叫 **`/ship`** Test Bootstrap;先跑既有測試確保無回歸;呼叫 **`/qa`**;呼叫 **`/verify`**;**動到前端 → 呼叫 `/design-review`**。
6. 呼叫 **`/code-review`** + **`pr-review-toolkit`**;push;呼叫 **`gh-actions-fix`** 到綠燈。
7. 呼叫 **`/land-and-deploy`** → **`/canary`**(feature 要上線時)。
8. ✅ 呼叫 **`PushNotification`** 通知使用者。

## 情境 4:debug

> 每步執行前說明:「步驟 N:呼叫 [skill]，因為…」

0. 讀相關模組 + 追相依 + 看既有測試;有 `srs.md`/TOGAF → 讀相關章節加速理解。(**不產全套 TOGAF**)
1. 呼叫 **`/investigate`** — 重現 + 根因調查。
2. surgical 最小改動、照既有慣例,不順手重構;資料層問題呼叫 **`db-design`**。
3. 先跑既有測試 + 加回歸測試 + 呼叫 **`/verify`**;**bug 是 UI / 視覺問題 → 加跑 `/design-review` 確認修復效果**。
4. 呼叫 **`/code-review`** + **`pr-review-toolkit`**。
5. push;呼叫 **`gh-actions-fix`** 到綠燈。
6. 呼叫 **`/land-and-deploy`** → **`/canary`**(hotfix 需上線時)。
7. ✅ 呼叫 **`PushNotification`** 通知使用者。

> 不產**全套** srs/TOGAF、不跑 doc-baseline(對修一個 bug 過度)。若根因是**架構缺陷** → 升級「重構」情境,屆時才補文件。

---

## 何時停下問使用者

- 需求或技術框架未定。
- 前端風格未定(務必問,別假設)。
- 架構不清晰 / 有多種合理走法。
- TOGAF push 後(等確認才開發)。
- 任何破壞性操作前。

其餘:**自主執行,不要逐步打擾使用者**。使用者說「繼續」可在關卡後接續。

---

## ❌ 常見違規行為(明確禁止)

| 違規行為 | 正確做法 |
|---|---|
| 用 `AskUserQuestion` 取代 `/spec` | 呼叫 `/spec` skill |
| 看到需求就直接寫程式碼 | 先走完 spec →(PRD 目標)→ doc-baseline → TOGAF → ⏸ 確認 |
| 手寫 PRD 或跳過 PRD 直接填 TOGAF | 呼叫 `prd` skill;PRD 是 TOGAF 的 Target 來源,新專案/重構必跑(feature 填受影響層) |
| 因為「SRS/TOGAF 已存在」跳過 `doc-baseline` | 仍須呼叫 `doc-baseline`;它會驗證格式 |
| 因為「需求很清楚」跳過 ⏸ 確認關卡 | 關卡不因為「清楚」而消失 |
| 在主對話手寫 feature 程式碼 | `TaskCreate` 拆 task + `Agent`(**general-purpose 實作者**)+ `feature-dev:code-reviewer` 審查(feature-dev 子代理唯讀、不能落地) |
| 用 `subagent_type:"feature-dev"` 啟動實作 | 沒有這個 type;實作用 `general-purpose`,探索/設計/審查才用 `feature-dev:code-explorer/code-architect/code-reviewer` |
| 自行判斷前端風格後直接套用 | 呼叫 `/design-md` |
| push 後沒跑 `/code-review` | 任何程式碼進 repo 前必須過 `/code-review` |
| 說「交給背景 agent 處理 / 等它完成通知你」後結束回合 | 回合結束=沒東西在跑;長工作在當前回合內做完,或明確把控制權交回使用者等「繼續」 |

---

## 理解與文件的份量(各情境對照,輕 → 重)

**原則:理解與文件量要與「改動的影響範圍」成正比 —— 不足會修爛,過度是浪費。**

| 情境 | 理解既有程式碼 | 文件(srs/TOGAF) | PRD(目標) | doc-baseline | 前端 `design-md` | `/design-review` | 主要確認關卡 |
|------|----------------|-------------------|-----------|--------------|------------------|-----------------|--------------|
| **debug** | **局部**:受影響模組 | 不產;有就參考 | ❌ | ❌ | 只在 UI bug 沿用既有 | UI bug 才跑 | 根因不明才問 |
| **加 feature** | **中**:受影響模組 + 既有慣例 | 缺則補、不符則正規化 | **受影響層**(子集) | ✅ | ✅ 萃取沿用 | 動到前端 ✅ | 動到架構才確認 |
| **重構** | **重**:整個既有系統(逆向工程) | **全套**(srs → TOGAF) | **全套**(目標) | ✅ | ✅ 沿用或重設計 | 有前端 ✅ | 確認逆向結果 + 目標架構 |
| **新專案** | 無既有碼(N/A) | **全套產出**(greenfield) | **全套**(目標) | —(直接產) | ✅ 選來源 | 有前端 ✅ | 需求/框架/風格 + 架構 |

> 升級規則:debug 若發現是**架構缺陷** → 升級「重構」;feature 若**動到架構** → 補相應文件 + 等確認。
