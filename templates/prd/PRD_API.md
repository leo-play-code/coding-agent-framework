# PRD — API 規格 (API Specification)

> 產品需求文件(目標 Target)｜目的:界定**目標的對外/對內介面契約**。
> 上游:[PRD_Application](PRD_Application.md)。下游:TOGAF [C2 應用架構](../togaf/C2-application-architecture.md)、SRS §4 外部介面。

## 0. 通則
| 項目 | 內容 |
|------|------|
| 風格 | 「待填」(REST / GraphQL / RPC) |
| Base URL / 版本策略 | 「待填」 |
| 認證 / 授權 | 「待填」(JWT / session / API key + 角色) |
| 資料格式 | 「待填」(JSON…) |
| 共通錯誤格式 | 「待填」 |

## 1. Endpoint 清單
| 方法 | 路徑 | 用途 | 認證 | 角色 |
|------|------|------|------|------|
|  |  |  |  |  |

## 2. Endpoint 細節
> 每個重要 endpoint 一節。

### 2.1 `METHOD /path`
- 用途:「待填」
- Request(path / query / body):

```json
// 待填
```

- Response(成功):

```json
// 待填
```

- 錯誤碼:

| HTTP | 代碼 | 情境 |
|------|------|------|
|  |  |  |

## 3. 共通錯誤碼 / 慣例
| HTTP | 代碼 | 含義 |
|------|------|------|
|  |  |  |

## 出場檢查點 (Exit Criteria)
- [ ] 認證/授權方式已定
- [ ] Endpoint 清單齊全且對齊功能矩陣
- [ ] 關鍵 endpoint 有 request/response 範例
- [ ] 錯誤碼慣例一致

## 階段關聯
- 上一份:[PRD_Application](PRD_Application.md)
- 下一份:[PRD_Frontend](PRD_Frontend.md)
- 餵給:TOGAF [C2](../togaf/C2-application-architecture.md) 的 Target
