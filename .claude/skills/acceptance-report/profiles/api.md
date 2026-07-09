# profile: api — API/後端服務(對合約/schema + 行為)

適用:後端 API、微服務。基準 = **API 合約**(OpenAPI/GraphQL schema/protobuf)+ 行為契約。

## 驗收準則來源(acceptance[])
每個 endpoint 抽出**依狀態碼/情境**的準則:
- 來源:`openapi.yaml`/`schema.graphql`/route handler + validation。
- 每條 = 一個情境 → 預期回應(狀態碼 + body 符合 schema + 錯誤碼):
  - 正常:「合法 payload → 201,回傳物件符合 schema」
  - 驗證失敗:「缺必填 → 400,錯誤碼 XXX」
  - 業務規則:「庫存不足 → 409,錯誤碼 YYY」
  - 授權:「未帶 token → 401」(如適用)
- `surface` 用 `METHOD /path`(如 `POST /api/orders`);`writes` 標寫入/交易/外呼副作用。

## 驗證基準與策略(verification)
- `baseline`:`openapi.yaml #/paths/...` 的 request/response schema(標清路徑)。
- `strategy`:契約測試(回應對 schema 驗證)+ 每個情境的範例 req/resp 比對。
- 提升證據力:
  - **A** — 契約測試通過(回應驗 schema)+ 三類情境(正常/驗證/業務)都有案例過。
  - **B** — 有測試但未對 schema 驗證,或只測正常路徑。
  - **C** — 僅實作完成。

## 常見坑
- 別只測 200/201;錯誤碼與 4xx/409 契約最常漂移。
- 回應 body 要**逐欄對 schema**(型別、必填、enum),不是只看 200。
