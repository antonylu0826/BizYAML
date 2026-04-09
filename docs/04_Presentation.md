# 04. 展現層與多語系 (Presentation & I18n)

BizYAML 不僅作為資料層描述，更整合了中後台 UI 的核心佈局 (Layout) 邏輯。推薦定義於 `[Entity].views.yaml` 檔案中，幫助前端動態渲染引擎自動生成可用的 CRUD 樣板。

---

## 1. 視圖排版抽象化 (Views Layout)

### 1.1 列表視圖 (`list`)

宣告資料列表畫面的欄位、排序與篩選條件：

```yaml
views:
  list:
    columns: [poNumber, supplier, totalAmount, status]  # 依序渲染的欄位
    defaultSort: "-createdAt"                           # 預設排序，- 前綴代表降序
    filterBy: [status, supplier, poNumber]              # 提供使用者可篩選的維度
```

### 1.2 詳情/表單視圖 (`detail`)

宣告表單畫面的佈局，由各種**佈局容器 (Layout Container)** 組成，支援 `group` 與 `tabs` 兩種類型：

#### 卡片群組 (`type: group`)

將欄位收納在同一張卡片中：

```yaml
views:
  detail:
    layout:
      - type: group
        label: 基本資料
        fields: [poNumber, supplier, status]
      - type: group
        label: 金額資訊
        fields: [totalAmount, discountAmount, netAmount]
```

#### 分頁標籤 (`type: tabs`)

當明細資料繁多時，使用 `tabs` 將不同區塊水平分頁：

```yaml
views:
  detail:
    layout:
      - type: group
        label: 基本資料
        fields: [poNumber, supplier, status]
      - type: tabs
        children:
          - label: 明細項目
            fields: [items]               # 一對多關聯自動渲染為可增刪改查的子資料表
          - label: 金額
            fields: [discountAmount, netAmount, totalAmount]
          - label: 退回資訊
            fields: [rejectReason]
```

> **關於 Master-Detail (主明細)**：在 `fields` 中放入已於 `relations` 宣告的一對多關聯名稱（如 `items`），前端組件將自動渲染為「可增刪改查的子資料表格」，無需額外設定。

### 1.3 動作按鈕區 (`actions`)

Workflow 中宣告的 `transitions` 動作按鈕，預設渲染在詳情頁面的**頂部操作列**。若需客製化顯示位置，可在 `detail` 中加入 `actions`：

```yaml
views:
  detail:
    actions:
      placement: top                      # top（預設）| bottom | both
      include: [Submit, Approve, Reject]  # 選填：限定顯示哪些 action，省略則全部顯示
    layout:
      - type: group
        label: 基本資料
        fields: [poNumber, supplier, status]
```

> 按鈕的顯示與否由 Workflow 的 `transitions[].from` 狀態自動控制：前端引擎比對當前 `statusField` 的值，只渲染當前狀態下合法的 action 按鈕。

---

## 2. 多語系與在地化策略 (I18n & Localization)

### 2.1 設計原則

BizYAML **不允許**在 YAML 中混入大量各國語言文案。而是採用「**無侵入的鍵值推斷策略 (Key Inference Strategy)**」：

- DSL 內只需寫預設語言（如 `label: 採購單`）。
- 解析器在編譯時自動提取所有 `label` 與 `message` 值，按層級結構吐出一份基礎翻譯 JSON，供下游多語系工具使用。

### 2.2 可提取的 I18n 來源

解析器會遍歷以下所有位置進行提取：

| 來源 | 提取內容 | 對應 JSON key 路徑 |
| :--- | :--- | :--- |
| 根層級 `label` | 實體顯示名稱 | `{module}.{Entity}.__label__` |
| `fields[].label` | 欄位顯示名稱（若無，以 key 名稱作 fallback） | `{module}.{Entity}.fields.{field}` |
| `fields[].options[].label` | 列舉選項顯示名稱 | `{module}.{Entity}.fields.{field}.options.{value}` |
| `workflow.transitions[].label` | 動作按鈕文字 | `{module}.{Entity}.actions.{action}` |
| `validations[].message` | 驗證失敗提示訊息 | `{module}.{Entity}.validations.{index}` |
| `views.detail.layout[].label` | 群組/分頁標題 | `{module}.{Entity}.views.detail.{index}` |

### 2.3 提取產出範例

```json
{
  "Procurement": {
    "PurchaseOrder": {
      "__label__": "採購單",
      "fields": {
        "poNumber": "採購單號",
        "supplier": "供應商",
        "totalAmount": "總金額",
        "status": {
          "__label__": "狀態",
          "options": {
            "Draft": "草稿",
            "Pending": "待審核",
            "Approved": "已核准",
            "Rejected": "已退回"
          }
        },
        "rejectReason": "退回原因"
      },
      "actions": {
        "Submit": "送出審核",
        "Approve": "核准",
        "Reject": "退回"
      },
      "validations": {
        "0": "金額必須大於零"
      },
      "views": {
        "detail": {
          "0": "基本資料",
          "1": "明細項目",
          "2": "金額"
        }
      }
    }
  }
}
```

開發團隊只需將上述字典檔對接至任何多語系管理工具，即可精準翻譯，無需修改任何 BizYAML 原始碼。
