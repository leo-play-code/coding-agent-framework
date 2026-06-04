---
name: db-design
description: 設計資料庫 schema、寫 migration、定索引與約束;以 srs.md §5 / TOGAF C1 為基準。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
triggers:
  - 設計資料庫
  - 設計 schema
  - 寫 migration
  - 加索引
  - 資料模型設計
  - design a database schema
  - write a migration
  - add an index
  - data model design
---

# db-design — 資料庫設計 / migration

目的:設計或演進資料庫 schema,產出 migration 與索引,並與架構文件對齊。

## 流程

### 1. 先確認現況與技術
- 用 Glob/Grep 找專案既有的:DB 設定、ORM、migration 工具(Prisma / Alembic / Knex / TypeORM / Flyway / Django / raw SQL)。
- 確認 DB 種類(PostgreSQL / MySQL / SQLite / NoSQL)。找不到就用 AskUserQuestion 問。

### 2. 取得需求來源(目標 + 現況)
- **目標 (Target)**:若有 `docs/prd/PRD_Data.md` → 以它為設計目標(資料實體、SQL 慣例、約束、索引)。
- **現況 (Baseline)**:若有 `srs.md` §5 資料模型 或 `templates/togaf/C1-data-architecture.md` → 以它為現況基準,對照做 gap。
- 兩者都沒有 → 從使用者描述的實體/關係出發。

### 3. 設計 schema
- 實體、欄位、型別、Null 與預設值。
- 主鍵、外鍵、唯一鍵、關聯(1:1 / 1:N / N:M)。
- 正規化到合理程度(預設 3NF;有讀取效能考量再反正規化並註明理由)。

### 4. 索引與效能
- 依查詢模式決定索引(WHERE / JOIN / ORDER BY 用到的欄位)。
- 標明每個索引的理由,避免過度索引拖慢寫入。

### 5. 產出 migration
- 依專案既有工具產生,**up 與 down 皆要**(確保可逆)。
- 沒有工具就出 raw SQL,分 `up.sql` / `down.sql`。

### 6. 收尾
- 把最終 schema 回填 `srs.md` §5 / TOGAF `C1`,維持單一真實來源。

## 注意
- ⚠️ 破壞性 migration(DROP / 改型別 / 改 NOT NULL)先明確跟使用者確認,並提供可逆 down 與資料遷移策略。
- 大表的 schema 變更要考慮鎖表 / 線上遷移。
