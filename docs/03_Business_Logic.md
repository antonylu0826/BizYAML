# 03. 商業邏輯層 (Business Logic)

與傳統將大量 `if-else` 寫死在 Controller 的作法不同，BizYAML 主張將業務規則抽象化，統一存放在 `[Entity].flow.yaml` 供解析與引擎自動執行。

---

## 1. 跨欄位與實體驗證 (Entity/Record Validations)

某些邏輯不專屬於單個欄位，而是紀錄整體層級的查核，宣告於根目錄下的 `validations`：

```yaml
validations:
  - rule: "endDate >= startDate"
    message: "結束日期不能早於開始日期"
  - rule: "discountAmount <= totalAmount * 0.5"
    message: "折扣金額不可超過總額的 50%"
```

> **觸發時機**：根層級的 `validations` 在每次**建立**或**更新**紀錄時觸發，與當前狀態無關。這是整個實體生命週期中的基礎資料完整性守衛。

> 表達式語法請參閱 [06. 表達式語言規範](./06_Expression_Language.md)。

---

## 2. 狀態機與工作流 (Workflow & State Machine)

利用狀態機 (FSM) 取代混亂的流程審核邏輯，從源頭就確立節點轉換間的前置條件與必備工作。

### 2.1 `statusField` 與 `enum` 的耦合約定

`workflow.statusField` 必須引用 `fields` 中一個已宣告的欄位，且該欄位**必須為 `type: enum`**。Workflow 中所有 `initial`、`terminal`、`transitions[].from[]`、`transitions[].to` 所使用的狀態值，**必須全數存在於該 enum 的 `options` 之中**。

違反此約定時，解析器應在**編譯期**拋出錯誤，說明哪個狀態值未在 enum options 中宣告。

```yaml
# fields 中的 enum 宣告（.entity.yaml）
fields:
  status:
    type: enum
    options: [Draft, Pending, Approved, Rejected, Cancelled]
    default: Draft

# workflow 中引用的所有狀態值必須都在上方 options 清單中
workflow:
  statusField: status        # ← 指向上方的 status 欄位
  initial: Draft             # ← 必須在 options 中
  terminal: [Approved, Cancelled]
  transitions:
    - action: Submit
      from: [Draft, Rejected]  # ← 必須在 options 中
      to: Pending              # ← 必須在 options 中
```

### 2.2 完整工作流範例

```yaml
workflow:
  statusField: status
  initial: Draft
  terminal: [Approved, Cancelled]   # 進入終態後不可再發起任何 transition

  transitions:
    - action: Submit
      label: 送出審核
      description: "草稿或退回狀態下，填寫人確認資料無誤後送出，進入待審核佇列。"
      from: [Draft, Rejected]
      to: Pending
      guard:                            # 動作觸發前的守衛條件查核
        validations:
          - rule: "totalAmount > 0"
            message: "金額必須大於零"
          - rule: "count(items) > 0"
            message: "必須至少有一筆明細"

    - action: Approve
      label: 核准
      from: [Pending]
      to: Approved

    - action: Reject
      label: 退回單據
      from: [Pending]
      to: Rejected
      guard:
        requireParams: [rejectReason]   # 觸發「退回」動作當下，強制附帶填寫退回理由

    - action: Cancel
      label: 作廢
      from: [Draft]
      to: Cancelled
```

### 2.3 `guard` 與根層級 `validations` 的差異

| | 根層級 `validations` | `transitions[].guard.validations` |
| :--- | :--- | :--- |
| **觸發時機** | 每次建立或更新紀錄時 | 僅在觸發特定 transition 動作時 |
| **用途** | 資料完整性守衛（永遠成立的規則） | 特定動作的前置條件（僅在該動作下才有意義） |
| **範例** | `endDate >= startDate` | `count(items) > 0`（送審前才需要） |

> **`guard` vs `eval`**：`eval` 用於欄位層級的靜態/動態條件控制（`hidden`、`readonly`、`required` 等）；`guard` 專屬於 `workflow.transitions`，代表「執行動作前才查核的守衛邏輯」。兩者語義不同，不可互換。

---

## 3. 外部掛鉤與非同步整合 (Webhooks / Events)

為了保有最大的擴充彈性，允許工作流掛載事件鉤子，對接任何支援 Webhook 協議的外部系統或自動化平台。BizYAML 本身不綁定任何特定的外部工具。

```yaml
hooks:
  - event: "after:transition:Approve"
    type: webhook
    url: "https://your-automation-platform/webhook/po-approved"
    method: POST                        # HTTP 方法，預設為 POST
    async: true
    headers:                            # 自訂 HTTP Header（如驗證金鑰）
      X-Api-Key: "secret-token"
    payload:
      poId: "${id}"
      amount: "${totalAmount}"
    retry:                              # 失敗重試策略（選填）
      attempts: 3
      backoff: exponential              # 可選：fixed | exponential
```

### 3.1 支援的事件格式

| 事件格式 | 觸發時機 |
| :--- | :--- |
| `after:transition:{Action}` | 指定狀態轉換成功後 |
| `before:transition:{Action}` | 指定狀態轉換執行前 |
| `after:transition:*` | **任意**狀態轉換成功後（萬用字元） |
| `before:transition:*` | **任意**狀態轉換執行前（萬用字元） |
| `after:create` | 紀錄建立後 |
| `after:update` | 紀錄更新後 |

> **萬用字元 `*`**：使用 `after:transition:*` 可對所有 transition 掛載同一個 hook，常見於稽核日誌、訊息佇列通知等需要攔截全部狀態變化的場景，避免重複宣告多份相同的 hook。

> **`payload` 插值語法**：使用 `${fieldName}` 語法，解析器在事件觸發時動態注入當前紀錄的欄位值。僅支援當前實體的直接欄位，不支援跨關聯路徑（如 `${supplier.name}`）。如需傳遞關聯資料，應由接收端自行查詢。

> **最佳實踐**：BizYAML 只負責單據本身的狀態扭轉。複合型任務（如發送通知、跨系統拋轉資料）都應透過宣告 `async: true` 的 webhook 交付給外部平台處理，實現「業務邏輯歸系統，自動化任務歸外部」的乾淨切分。
