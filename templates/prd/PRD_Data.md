# PRD — 資料 (Data)

> 產品需求文件(目標 Target)｜目的:界定**目標資料模型 + 資料庫格式與 SQL 語法慣例**。
> 上游:[PRD_Business](PRD_Business.md)。下游:TOGAF [C1 資料架構](../togaf/C1-data-architecture.md)、`db-design` skill(產 migration/SQL)。
> 現況請見 `srs.md` §5;本檔只寫**目標**,由 TOGAF C1 做 gap 分析。

## 0. 資料庫基礎
| 項目 | 內容 |
|------|------|
| DBMS / 版本 | 「待填」(PostgreSQL / MySQL / SQLite / …) |
| 字元集 / collation | 「待填」 |
| Schema 切分 | 「待填」(單一 / 多 schema + 用途) |
| migration 工具 | 「待填」(Prisma / Alembic / Knex / Flyway / Django / raw SQL) |

## 1. 資料實體 (Data Entities)
| 實體 | 說明 | 擁有者 | 對應業務能力 | 可寫 |
|------|------|--------|--------------|------|
|  |  |  |  |  |

## 2. 概念 / ER 關係
- 主要關聯 `[目標]`:「待填」(1:1 / 1:N / N:M;可附文字版 ER 圖)

## 3. 核心表欄位規格
> 每張表一節;型別、Null、預設、約束、說明。

### 3.1 `表名`
| # | 欄位名 | 型別 | 可 NULL | 預設 | 說明 |
|---|--------|------|---------|------|------|
| 1 | `id` |  | N |  | 主鍵 |

## 4. 資料庫格式 & SQL 語法慣例
> 統一規則,讓 db-design 與開發遵循,避免各表各自為政。
- **命名慣例**:表/欄/索引/外鍵命名規則(如 `snake_case`、`idx_`、`fk_` 前綴):「待填」
- **主鍵策略**:`BIGINT AUTO_INCREMENT` / `UUID` / …:「待填」
- **型別慣例**:金額 `DECIMAL(p,s)`、時間 `DATETIME`/`TIMESTAMP`、布林、JSON 欄位:「待填」
- **時間戳**:`created_at` / `updated_at` 是否強制、由 DB 或 app 維護:「待填」
- **軟刪除 / 狀態欄**:慣例:「待填」
- **migration 規範**:up/down 皆要、是否可逆、破壞性變更流程:「待填」

### 4.1 範例 DDL(目標)
```sql
-- 待填:示範一張核心表的目標建表語法(展示上述慣例)
```

## 5. 約束與完整性
| 約束 | 層級 (DB / application) | 說明 |
|------|--------------------------|------|
|  |  |  |

## 6. 索引策略
| 表 | 索引 | 欄位 | 用途(WHERE/JOIN/ORDER BY) |
|----|------|------|------------------------------|
|  |  |  |  |

> 每個索引標理由,避免過度索引拖慢寫入。

## 7. 資料流向與治理
- 資料流 `[目標]`:「待填」(誰寫入、誰讀取、批次 vs 即時)
- 主資料 / 資料品質規則:「待填」
- 法遵 / 隱私(GDPR、個資法):「待填」
- 保存期限 / 機密等級:「待填」

## 出場檢查點 (Exit Criteria)
- [ ] DBMS 與 schema 切分已定
- [ ] 目標資料實體與核心表欄位齊全
- [ ] SQL 語法慣例(命名/型別/migration)成文
- [ ] 範例 DDL 展示慣例
- [ ] 約束與索引策略已記錄
- [ ] 已交付 db-design 作為目標、TOGAF C1 作為 Target 輸入

## 階段關聯
- 上一份:[PRD_Business](PRD_Business.md)
- 餵給:TOGAF [C1](../togaf/C1-data-architecture.md) 的 Target、`db-design` skill;現況對照 `srs.md` §5
