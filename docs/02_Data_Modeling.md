# 02. 資料模型層 (Data Modeling)

資料模型層定義了系統深層的關連資料庫 Schema。在 BizYAML 的約定設計中，這部分應當宣告於 `[Entity].entity.yaml` 內。

## 1. 根屬性定義 (Root Properties)

任何 BizYAML 文件的核心，皆由最精簡的名稱標籤起手：

```yaml
name: PurchaseOrder      # 實體英文代碼，大駝峰。結合當前資料夾名稱構成全域唯一識別碼。
label: 採購單             # 預設顯示名稱 (可作為 I18n 前的 Fallback)
description: "記錄公司向供應商採購物料的單據，需經過三階段審核流程。"  # 選填，業務說明
```

> **注意：** `module`（模組名稱）不該在文件中被寫死，應交由目錄結構自動推斷。
> **`description` 設計原則**：純文字字串，給人和 AI Agent 閱讀的業務說明。不進 UI 渲染、不被 i18n 提取、不強制填寫。簡單的字典實體可省略。

---

## 2. 欄位系統 (Fields System)

> **可選預設**：所有欄位預設為**可選 (nullable)**，除非加上 `!` 後綴或在 `eval` 中宣告 `required: true`。

### 2.1 基礎型別
底層支援通用的資料型別對映：`string`, `integer`, `decimal`, `boolean`, `date`, `datetime`, `json` 等。

欄位可加入 `description` 說明業務含義，對 AI Agent 協作特別有幫助：

```yaml
fields:
  poNumber: string(50)!       # 語法糖：限制最長 50 字元且為必填 (Required)
  baseAmount: decimal         # 不指定精度
  totalAmount: decimal(12,2)  # 語法糖：精度 12 位，小數點後 2 位
  exchangeRate: decimal(8,4)  # 匯率通常需要 4 位小數
  isActive: boolean
  email:
    type: string
    unique: true              # 欄位級唯一約束，等同於宣告單欄位唯一索引
```

**`decimal(precision, scale)` 語法**：`precision` 為總位數，`scale` 為小數位數。不指定時由平台決定預設精度。金融場景建議明確宣告。

**`unique` 屬性**：可在任何欄位下宣告，效果等同於在 `indexes` 中加入 `{ fields: [fieldName], unique: true }`，為單欄位唯一約束的語法糖。

### 2.2 列舉與陣列

**列舉 — 簡寫語法**（值即顯示名稱，由 i18n 推斷翻譯）：

```yaml
fields:
  status:
    type: enum
    options: [Draft, Pending, Approved, Rejected]
    default: Draft
```

**列舉 — 值/標籤分離語法**（儲存值與顯示名稱不同時使用，例如儲存代碼、顯示中文）：

```yaml
fields:
  priority:
    type: enum
    options:
      - value: 1
        label: 低
      - value: 2
        label: 中
      - value: 3
        label: 高
    default: 2
```

**陣列：**
```yaml
fields:
  allowedTags: string[]   # 語法糖：宣告一個字串陣列型別
```

### 2.3 自動流水號編碼 (Auto-Sequence Generation)
ERP 單據極度依賴嚴謹的編碼規則。利用 `sequence` 屬性，搭配 Pattern 動態推論歸零週期：

```yaml
fields:
  poNumber:
    type: string
    sequence: "PO-{YYYY}{MM}{DD}-{SEQ:4}" # 包含 YYYYMMDD 即自動推斷為「按日歸零流水號」
    eval:
      readonly: true
```

> **Sequence Pattern 語法**：使用大括號 `{...}` 作為佔位符，`{YYYY}`、`{MM}`、`{DD}` 為時間維度，`{SEQ:N}` 為補零 N 位的流水數字。此語法**僅適用於 `sequence` 屬性**，與 `hooks.payload` 的 `${...}` 插值語法性質不同，請勿混淆（詳見 05 第三節）。

### 2.4 即時計算欄位 (Computed Field)
只存在於應用層記憶體，不實體寫入資料庫。各平台 Parser 自行決定在前端記憶體、API 回應層或資料庫 Generated Column 實作，DSL 只聲明意圖。

```yaml
fields:
  netAmount:
    type: decimal
    computed: "grossAmount - discountAmount"
```

> 表達式語法請參閱 [06. 表達式語言規範](./06_Expression_Language.md)。

### 2.5 欄位說明 (`description`)

```yaml
fields:
  rejectReason:
    type: string
    description: "退回原因，由審核人員填寫，作為後續改善依據。"
    eval:
      required: "status == 'Rejected'"
      hidden: "status != 'Rejected'"
```

`description` 為純文字選填屬性，適用於所有欄位型別（包含 `enum`、`lookup`、`computed`）。不支援 Markdown，不進 i18n 提取，不影響任何驗證邏輯。

### 2.6 欄位動態條件控制 (`eval`)

`eval` 是所有欄位控制項的**統一容器**，接受兩種值形式：

| 形式 | 說明 | 範例 |
| :--- | :--- | :--- |
| 布林字面值 | 靜態永久生效 | `readonly: true` |
| 表達式字串 | 動態條件，運算結果為 boolean | `readonly: "isLocked == true"` |

```yaml
fields:
  poNumber:
    type: string
    sequence: "PO-{YYYY}{MM}-{SEQ:4}"
    eval:
      readonly: true                      # 靜態：永遠唯讀

  rejectReason:
    type: string
    eval:
      required: "status == 'Rejected'"   # 動態：狀態為拒絕時必填
      hidden: "status != 'Rejected'"     # 動態：否則在 UI 上實體隱藏不渲染
      readonly: "isLocked == true"       # 動態：鎖定時唯讀
```

### 2.7 虛擬查表映射 (Lookup / Virtual Fields)
當需要在畫面上呈現來自關聯實體的某項屬性時（如：選了供應商要顯示電話），為確保 Database 遵守第三正規化，可使用 `lookup` 類型，不重複轉存資料：

```yaml
fields:
  supplierPhone:
    type: lookup
    relation: supplier        # 引用 relations 節點中宣告的關聯 key 名稱
    field: phoneNumber        # 抓取對方實體身上的 phoneNumber 屬性呈現
```

> **注意：** `relation` 的值對應的是 `relations` 節點下的 **key 名稱**（如 `supplier`），而非資料庫外鍵欄位名稱（如 `supplierId`）。外鍵欄位由解析器自動生成，無需手動宣告。

---

## 3. 關聯定義 (Relations)

**所有關聯統一在 `relations` 節點宣告**，解析器將自動在資料庫層推算並生成對應的外鍵欄位（如 `supplierId`、`projectId`）。`fields` 節點內不再宣告任何關聯。

```yaml
relations:
  # 多對一 (belongsTo)：單一名稱，解析器自動推算外鍵為 supplierId
  supplier: Supplier

  # 一對多 (hasMany)：陣列框語法，解析器自動推算外鍵對應
  items: [PurchaseOrderItem]

  # 多對一 (belongsTo)
  project: Project

  # 支援處理「無窮樹狀階層 (Tree/Hierarchy)」(如：部門組織圖)
  parent: Department      # 隸屬上級部門 (belongsTo 自己)
  children: [Department]  # 擁有多個子部門 (hasMany 自己)
```

**外鍵命名約定**：`belongsTo` 關聯的外鍵欄位名稱由解析器依 `{relationKey}Id` 規則自動生成。

---

## 4. 索引設計 (Indexes)

確保龐大企業資料能在資料庫端得到最佳化。`name` 為**選填**，省略時解析器依欄位名自動生成。

```yaml
indexes:
  - fields: [status, createdAt]           # name 省略 → 自動生成 idx_status_createdAt
  - fields: [companyId, orderNumber]
    unique: true
    name: uq_company_order                # 明確命名（選填）
```
