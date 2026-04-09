# 01. 架構總覽與哲學 (Architecture)

BizYAML 是一套專為開發企業 CRUD、ERP 等複雜商業邏輯系統所設計的「領域特定語言 (DSL)」。旨在作為領域專家與開發人員之間的共同語言，實現單一真實來源 (Single Source of Truth)。

## 1. 核心設計哲學

BizYAML 的設計圍繞著三大核心哲學：

1. **約定優於配置 (Convention over Configuration)**：提供極簡語法糖，盡可能隱藏冗餘的設定。例如，關聯設定可以簡化到只寫一個陣列符號 `[TargetEntity]`。
2. **關注點分離 (Separation of Concerns)**：將複雜的商業系統拆分為靜態資料結構與動態處理流程，確保跨部門協作不會互相干擾。
3. **介面驅動 (Interface-Driven)**：DSL 不單單只是產生資料庫 ORM Schema，它同時具備前端視圖排版與多語系對接能力。

---

## 2. 檔案與模組約定

### 2.1 目錄即模組 (Directory as Module)
強烈建議透過實體的「資料夾位置」來自動推斷其所屬的 Module。開發者無須在 YAML 內重複宣告 `module`。

**範例結構：**
```text
/biz-schema
  /Procurement                <-- 自動推斷 module: Procurement
    PurchaseOrder.entity.yaml 
    PurchaseOrder.flow.yaml
    PurchaseOrder.views.yaml
    Supplier.entity.yaml
```
當 `PurchaseOrder.entity.yaml` 置於目錄下時，解析器將自動為其註冊全域唯一識別碼 `Procurement.PurchaseOrder`。

### 2.2 依職責拆檔約定
針對欄位眾多、邏輯複雜的實體，我們推薦在同一資料夾下採行「依檔名後綴拆分職責」的模式。
解析器在編譯期間會智慧地將「相同主檔名」的設定進行合併：
 
* `[Entity].entity.yaml`: 負責欄位、關聯、索引等靜態設定 (核心讀者：DBA / Backend)。
* `[Entity].flow.yaml`: 負責驗證規則、狀態工作流、事件等動態邏輯 (核心讀者：PM / Flow Designer)。
* `[Entity].views.yaml`: 負責資料呈現在畫面上時的佈局與視覺資訊 (核心讀者：Frontend)。

> **Tip**: 如果遇到極度簡單的字典檔（例如：國家代碼表），你可以直接將所有內容合併寫入唯一的 `Country.entity.yaml` 中，不強制拆檔。

---

## 3. 編譯管線 (Compilation Pipeline)

BizYAML 的原始 YAML 檔案不直接被執行，而是經過一條三階段的編譯管線，最終產出一份**平台無關的中間表示 (Intermediate Representation, IR)**，供下游的程式碼生成器或動態引擎消費。

```text
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ YAML Source  │ ──▶ │  Discovery  │ ──▶ │ Parse/Merge  │ ──▶ │  Validate/Emit  │
│  (.entity    │     │  & Grouping │     │ & Desugar    │     │  IR (JSON)      │
│   .flow      │     │             │     │              │     │                 │
│   .views)    │     └─────────────┘     └──────────────┘     └─────────────────┘
└─────────────┘           ①                    ②                     ③
```

### 3.1 階段一：Discovery（探索與分組）

解析器遞迴掃描指定的根目錄，依照以下規則建立實體清單：

1. **辨識模組**：以資料夾路徑推斷 module 名稱。
2. **辨識實體**：以去除後綴（`.entity.yaml`、`.flow.yaml`、`.views.yaml`）後的主檔名辨識實體名稱。
3. **分組**：將同一資料夾下主檔名相同的檔案歸為同一組。

```text
/Procurement/PurchaseOrder.entity.yaml  ─┐
/Procurement/PurchaseOrder.flow.yaml     ├─▶ 一組，實體 = Procurement.PurchaseOrder
/Procurement/PurchaseOrder.views.yaml    ─┘
/Procurement/Supplier.entity.yaml        ──▶ 一組，實體 = Procurement.Supplier
```

### 3.2 階段二：Parse、Merge、Desugar（解析、合併、去糖）

#### 合併策略 (Merge Strategy)

每種檔案後綴**擁有 (owns)** 特定的根節點 (Root Keys)。合併時，解析器依照「誰擁有誰」的規則將各檔內容組裝成一棵完整的實體樹：

| 擁有的根節點 | `.entity.yaml` | `.flow.yaml` | `.views.yaml` |
| :--- | :---: | :---: | :---: |
| `name`, `label` | ✅ 主要來源 | ⚠️ 可重複宣告，必須一致 | ⚠️ 可重複宣告，必須一致 |
| `fields`, `relations`, `indexes` | ✅ | ❌ | ❌ |
| `validations`, `workflow`, `hooks` | ❌ | ✅ | ❌ |
| `views` | ❌ | ❌ | ✅ |

**衝突規則**：
- 若某個根節點出現在**非其所屬**的檔案後綴中 → **編譯錯誤**，附帶明確訊息指出該節點應搬移到正確的檔案。
- `name` 和 `label` 允許在多個檔案中出現（方便各檔案獨立閱讀），但其值**必須完全一致**，否則為編譯錯誤。
- 單檔模式（只有一個 `.entity.yaml`）：所有根節點均可在同一檔案中出現，不受擁有權限制。解析器以「該目錄下只有一份 YAML 檔案」為判斷條件進入此模式。

#### 語法糖還原 (Desugar)

合併完成後，解析器將所有語法糖展開為標準化的完整形式：

| 語法糖 | 還原結果 |
| :--- | :--- |
| `title: string(50)!` | `title: { type: "string", maxLength: 50, eval: { required: true } }` |
| `tags: string[]` | `tags: { type: "array", items: "string" }` |
| `supplier: Supplier` (relations) | `supplier: { type: "belongsTo", target: "Supplier", foreignKey: "supplierId" }` |
| `items: [OrderItem]` (relations) | `items: { type: "hasMany", target: "OrderItem" }` |
| `status: enum` + `options: [A, B]` | `options: [{ value: "A", label: "A" }, { value: "B", label: "B" }]` |

### 3.3 階段三：Validate & Emit IR（驗證與產出）

#### 編譯期驗證 (Compile-time Checks)

在產出 IR 之前，解析器**必須**執行以下檢查，任何一項失敗即為編譯錯誤：

| 檢查項目 | 說明 |
| :--- | :--- |
| 表達式合法性 | 所有 `computed`、`eval`、`validations.rule`、`guard.validations.rule` 中的表達式必須符合 [06 表達式語言規範](./06_Expression_Language.md) |
| 識別符可解析 | 表達式中引用的識別符必須為已宣告的 `fields` key 或內建函式 |
| 保留字衝突 | `fields` / `relations` 的自訂 key 不可與該層級的保留字同名 (依 [05 保留字辭典](./05_Reserved_Words.md)) |
| Lookup 引用有效 | `type: lookup` 的 `relation` 值必須存在於 `relations` 節點中 |
| 狀態機完整性 | `workflow.statusField` 引用的欄位必須為 `type: enum`；`initial`、所有 `from[]`、所有 `to` 值必須存在於該欄位的 `options` 之中 |
| Enum options 合法 | `options` 中的 `value` 值不可重複 |

#### 中間表示 (IR) 格式

每個實體的最終產出為一份獨立的 **JSON 物件**。IR 的結構鏡像自合併後且去糖後的 YAML，外加解析器推算的元資料：

```jsonc
{
  // 解析器推算
  "module": "Procurement",

  // 來自 .entity.yaml
  "name": "PurchaseOrder",
  "label": "採購單",
  "fields": {
    "poNumber": {
      "type": "string",
      "maxLength": null,
      "sequence": {
        "pattern": "PO-{YYYY}{MM}-{SEQ:4}",
        "resetCycle": "monthly"        // 解析器由 pattern 自動推斷
      },
      "eval": { "readonly": true, "required": false, "hidden": false }
    },
    "status": {
      "type": "enum",
      "options": [
        { "value": "Draft", "label": "Draft" },
        { "value": "Pending", "label": "Pending" }
      ],
      "default": "Draft"
    },
    "netAmount": {
      "type": "decimal",
      "computed": "grossAmount - discountAmount",
      "virtual": true                  // 解析器標記：不產生 DB 欄位
    },
    "supplierPhone": {
      "type": "lookup",
      "relation": "supplier",
      "field": "phoneNumber",
      "virtual": true
    }
  },
  "relations": {
    "supplier": {
      "type": "belongsTo",
      "target": "Supplier",
      "foreignKey": "supplierId"       // 解析器依約定生成
    },
    "items": {
      "type": "hasMany",
      "target": "PurchaseOrderItem"
    }
  },
  "indexes": [
    { "fields": ["status", "createdAt"], "name": "idx_status_createdAt", "unique": false }
  ],

  // 來自 .flow.yaml
  "validations": [
    { "rule": "totalAmount > 0", "message": "金額必須大於零" }
  ],
  "workflow": {
    "statusField": "status",
    "initial": "Draft",
    "transitions": [
      {
        "action": "Submit",
        "label": "送出審核",
        "from": ["Draft", "Rejected"],
        "to": "Pending",
        "guard": null
      }
    ]
  },
  "hooks": [],

  // 來自 .views.yaml
  "views": {
    "list": {
      "columns": ["poNumber", "supplier", "totalAmount", "status"],
      "defaultSort": { "field": "createdAt", "direction": "DESC" },
      "filterBy": ["status", "supplier"]
    },
    "detail": {
      "layout": []
    }
  }
}
```

**關鍵設計決策**：

- **每個實體一份 IR**：IR 不做跨實體的關聯解析。`target: "Supplier"` 只是一個字串參照，下游生成器自行決定如何解析引用。這確保每份 IR 是自包含的，可獨立處理。
- **語法糖全部展開**：IR 中不存在任何簡寫形式。下游工具永遠不需要理解 BizYAML 的語法糖，只需讀取結構化 JSON。
- **解析器推算的欄位明確標記**：`virtual`、`foreignKey`、`resetCycle` 等推算值在 IR 中一律顯式呈現，下游工具不需要重新推算。
- **IR 格式即契約**：所有下游工具（程式碼生成器、前端引擎、Linter）皆以 IR JSON 為輸入，不直接讀取 YAML 原始碼。規範的 YAML 語法可以演化，只要 IR 結構不變，下游工具不受影響。
