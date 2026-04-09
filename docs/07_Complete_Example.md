# 07. 完整實戰範例 (Complete Example)

本章以「採購單 (PurchaseOrder)」為例，展示一個真實業務場景下，如何將一個完整的實體拆分為 `.entity.yaml`、`.flow.yaml`、`.views.yaml` 三份檔案，以及解析器最終產出的 IR 形貌。

---

## 目錄結構

```text
/biz-schema
  /Procurement
    PurchaseOrder.entity.yaml   # 資料結構定義
    PurchaseOrder.flow.yaml     # 商業邏輯與工作流
    PurchaseOrder.views.yaml    # 展現層佈局
    Supplier.entity.yaml        # 被關聯的供應商實體（簡化版）
```

---

## PurchaseOrder.entity.yaml

```yaml
name: PurchaseOrder
label: 採購單
description: "記錄公司向供應商採購物料的單據，需經過送審、核准兩階段流程，退回時須附理由。"

fields:
  # 流水單號：系統自動生成，唯讀
  poNumber:
    type: string
    sequence: "PO-{YYYY}{MM}-{SEQ:4}"
    eval:
      readonly: true

  # 狀態：由 workflow 驅動
  status:
    type: enum
    options:
      - value: Draft
        label: 草稿
      - value: Pending
        label: 待審核
      - value: Approved
        label: 已核准
      - value: Rejected
        label: 已退回
    default: Draft

  # 金額欄位
  totalAmount: decimal(12,2)!
  discountAmount:
    type: decimal(12,2)
    default: 0

  # 計算欄位：不寫入 DB，由應用層計算
  netAmount:
    type: decimal(12,2)
    computed: "totalAmount - discountAmount"

  # 退回理由：僅在退回狀態下顯示且必填
  rejectReason:
    type: string
    description: "退回原因，由審核人員填寫，作為填寫人後續改善的依據。"
    eval:
      required: "status == 'Rejected'"
      hidden: "status != 'Rejected'"

  # 備註
  notes: string

  # 虛擬查表欄位：顯示供應商電話，不存入 DB
  supplierPhone:
    type: lookup
    relation: supplier
    field: phoneNumber

relations:
  supplier: Supplier              # belongsTo → 自動生成 supplierId FK
  items: [PurchaseOrderItem]      # hasMany

indexes:
  - fields: [status, createdAt]
  - fields: [supplierId, status]
```

---

## PurchaseOrder.flow.yaml

```yaml
name: PurchaseOrder

# 實體層級的跨欄位驗證（每次儲存都會觸發）
validations:
  - rule: "totalAmount > 0"
    message: "採購金額必須大於零"
  - rule: "discountAmount <= totalAmount * 0.5"
    message: "折扣金額不可超過總額的 50%"

# 狀態機定義
workflow:
  statusField: status
  initial: Draft
  terminal: [Approved, Cancelled]   # 這兩個狀態無法再轉換

  transitions:
    - action: Submit
      label: 送出審核
      from: [Draft, Rejected]
      to: Pending
      guard:
        validations:
          - rule: "count(items) > 0"
            message: "必須至少有一筆明細才能送審"

    - action: Approve
      label: 核准
      from: [Pending]
      to: Approved

    - action: Reject
      label: 退回
      from: [Pending]
      to: Rejected
      guard:
        requireParams: [rejectReason]

    - action: Cancel
      label: 作廢
      from: [Draft]
      to: Cancelled

# 事件掛鉤
hooks:
  # 核准後通知外部系統
  - event: "after:transition:Approve"
    type: webhook
    url: "https://your-platform/webhook/po-approved"
    method: POST
    async: true
    headers:
      X-Api-Key: "secret-token"
    payload:
      poId: "${id}"
      supplierId: "${supplierId}"
      amount: "${totalAmount}"
    retry:
      attempts: 3
      backoff: exponential

  # 任何狀態轉換後記錄稽核日誌
  - event: "after:transition:*"
    type: webhook
    url: "https://your-platform/webhook/audit-log"
    async: true
    payload:
      entityName: "PurchaseOrder"
      recordId: "${id}"
      status: "${status}"
```

---

## PurchaseOrder.views.yaml

```yaml
name: PurchaseOrder

views:
  # 列表視圖
  list:
    columns: [poNumber, supplier, totalAmount, status, createdAt]
    defaultSort: "-createdAt"
    filterBy: [status, supplier, poNumber]

  # 詳情/表單視圖
  detail:
    actions:
      placement: top

    layout:
      # 卡片群組：基本資料
      - type: group
        label: 基本資料
        fields: [poNumber, supplier, supplierPhone, status]

      # 卡片群組：金額
      - type: group
        label: 金額資訊
        fields: [totalAmount, discountAmount, netAmount]

      # 分頁標籤：明細與退回資訊
      - type: tabs
        children:
          - label: 採購明細
            fields: [items]           # 自動渲染 Master-Detail 子表格
          - label: 其他資訊
            fields: [notes, rejectReason]
```

---

## 最終產出 IR（示意）

解析器將上述三份檔案合併、驗證、去糖後，產出如下 JSON（節錄關鍵部分）：

```jsonc
{
  "module": "Procurement",
  "name": "PurchaseOrder",
  "label": "採購單",

  "fields": {
    "poNumber": {
      "type": "string",
      "maxLength": null,
      "sequence": {
        "pattern": "PO-{YYYY}{MM}-{SEQ:4}",
        "resetCycle": "monthly"
      },
      "eval": { "readonly": true, "required": false, "hidden": false },
      "virtual": false
    },
    "status": {
      "type": "enum",
      "options": [
        { "value": "Draft",    "label": "草稿" },
        { "value": "Pending",  "label": "待審核" },
        { "value": "Approved", "label": "已核准" },
        { "value": "Rejected", "label": "已退回" }
      ],
      "default": "Draft"
    },
    "totalAmount": {
      "type": "decimal",
      "precision": 12,
      "scale": 2,
      "eval": { "required": true, "readonly": false, "hidden": false }
    },
    "netAmount": {
      "type": "decimal",
      "precision": 12,
      "scale": 2,
      "computed": "totalAmount - discountAmount",
      "virtual": true
    },
    "rejectReason": {
      "type": "string",
      "eval": {
        "required": "status == 'Rejected'",
        "hidden": "status != 'Rejected'",
        "readonly": false
      }
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
      "foreignKey": "supplierId"
    },
    "items": {
      "type": "hasMany",
      "target": "PurchaseOrderItem"
    }
  },

  "workflow": {
    "statusField": "status",
    "initial": "Draft",
    "terminal": ["Approved", "Cancelled"],
    "transitions": [
      {
        "action": "Submit",
        "label": "送出審核",
        "from": ["Draft", "Rejected"],
        "to": "Pending",
        "guard": {
          "validations": [
            { "rule": "count(items) > 0", "message": "必須至少有一筆明細才能送審" }
          ],
          "requireParams": []
        }
      }
      // ...其他 transitions 省略
    ]
  },

  "views": {
    "list": {
      "columns": ["poNumber", "supplier", "totalAmount", "status", "createdAt"],
      "defaultSort": { "field": "createdAt", "direction": "DESC" },
      "filterBy": ["status", "supplier", "poNumber"]
    },
    "detail": {
      "actions": { "placement": "top", "include": null },
      "layout": [
        {
          "type": "group",
          "label": "基本資料",
          "fields": ["poNumber", "supplier", "supplierPhone", "status"]
        },
        {
          "type": "tabs",
          "children": [
            { "label": "採購明細", "fields": ["items"] },
            { "label": "其他資訊", "fields": ["notes", "rejectReason"] }
          ]
        }
      ]
    }
  }
}
```

---

## 編譯期自動提取的 I18n 基礎翻譯檔

```json
{
  "Procurement": {
    "PurchaseOrder": {
      "__label__": "採購單",
      "fields": {
        "poNumber": "poNumber",
        "supplier": "supplier",
        "supplierPhone": "supplierPhone",
        "status": {
          "__label__": "status",
          "options": {
            "Draft": "草稿",
            "Pending": "待審核",
            "Approved": "已核准",
            "Rejected": "已退回"
          }
        },
        "totalAmount": "totalAmount",
        "discountAmount": "discountAmount",
        "netAmount": "netAmount",
        "rejectReason": "rejectReason",
        "notes": "notes"
      },
      "actions": {
        "Submit": "送出審核",
        "Approve": "核准",
        "Reject": "退回",
        "Cancel": "作廢"
      },
      "validations": {
        "0": "採購金額必須大於零",
        "1": "折扣金額不可超過總額的 50%"
      },
      "views": {
        "detail": {
          "0": "基本資料",
          "1": "金額資訊",
          "2": "採購明細",
          "3": "其他資訊"
        }
      }
    }
  }
}
```

> 沒有 `label` 的欄位（如 `poNumber`、`totalAmount`）以 field key 名稱作為佔位，等待翻譯人員填入正確名稱。
