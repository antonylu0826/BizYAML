# 05. 核心保留字辭典 (Reserved Words)

為了確保 DSL 結構單純、防堵編譯期的解析錯誤，BizYAML 收斂了極少數的「核心保留字」。這份文件是為解析器 (Parser) 開發者、以及撰寫 Linter/JSON Schema 所制定的黃金準則。

> [!WARNING]
> **命名衝突防範 (Collision Rules)**
> 開發者在定義**實體名稱**、**自訂欄位名稱 (`fields` 底下)** 或 **自訂關聯名稱 (`relations` 底下)** 時，**絕對不可**與該層級的保留字完全同名。

---

## 1. 第一層級全域保留字 (Root Keywords)

僅允許出現在 YAML 文件的最上層的根節點（不論是否拆檔）。

| 保留字 | 類型 | 必填 | 用途說明 | 範例 / 備註 |
| :--- | :--- | :---: | :--- | :--- |
| `name` | String | ✅ | 宣告實體的全域唯一識別碼 | 必須為大駝峰 (如: `PurchaseOrder`) |
| `label` | String | - | 實體的預設人類可讀名稱 | 如: "採購單" |
| `fields` | Object | ✅ | 包含所有實體資料屬性的宣告進入點 | 關聯一律宣告於 `relations`，不在此處 |
| `relations` | Object | - | 關聯與樹狀結構的獨立宣告進入點 | 解析器自動生成對應外鍵欄位 |
| `indexes` | Array | - | 資料庫實體端之複合索引進入點 | - |
| `validations` | Array | - | 跨欄位或實體層級的查核規則進入點 | 每次建立/更新時觸發 |
| `workflow` | Object | - | 狀態機生命週期與審核流的定義進入點 | - |
| `hooks` | Array | - | 外部非同步整合與事件監聽進入點 | - |
| `views` | Object | - | 介面佈局與視圖排版的定義進入點 | - |

---

## 2. 第二層級區域保留字 (Scoped Feature Keywords)

這些保留字只在特定的區塊下才具備系統運算意義，離開了該作用域就不算保留字。

### 2.1 欄位屬性專用 (`fields` 子節點)

| 保留字 | 類型 | 用途說明 | 範例 |
| :--- | :--- | :--- | :--- |
| `type` | String | 決定對應的資料庫儲存型別 | `string`, `integer`, `decimal`, `boolean`, `date`, `datetime`, `json`, `enum`, `lookup` |
| `computed` | Expr | 定義不存入資料庫的純記憶體計算公式 | `computed: "grossAmount - discountAmount"` |
| `sequence` | String | 流水單號字串板模，系統自動推算歸零維度 | `"PO-{YYYY}{MM}-{SEQ:4}"` |
| `options` | Array | 專供 `enum` 型別使用的合法列舉值清單 | 簡寫：`[Draft, Pending]`；完整：`[{value: 1, label: 低}]` |
| `default` | Any | 建立資料時的預設值設定 | `default: false` |
| `unique` | Boolean | 宣告此欄位的值在整個資料表中必須唯一 | `unique: true`（等同於單欄位唯一索引語法糖） |
| `eval` | Object | **動態條件容器**：裝載 `required`, `hidden`, `readonly` 等控制項，值接受布林字面值或表達式字串 | `eval: { readonly: true }` / `eval: { hidden: "status=='Draft'" }` |

### 2.2 `eval` 子節點專用

| 保留字 | 接受值 | 用途說明 |
| :--- | :--- | :--- |
| `required` | `boolean` \| `Expr` | 欄位是否為必填 |
| `hidden` | `boolean` \| `Expr` | 欄位是否在 UI 上隱藏不渲染 |
| `readonly` | `boolean` \| `Expr` | 欄位是否鎖定為唯讀 |

### 2.3 關聯查表專用 (`type: lookup` 時的子節點)

| 保留字 | 類型 | 用途說明 |
| :--- | :--- | :--- |
| `relation` | String | 綁定要監聽的關聯，值對應 `relations` 節點下的 **key 名稱**（非資料庫欄位名） |
| `field` | String | 表明要抓取對方實體身上的「哪一個屬性」過來顯示 |

### 2.4 工作流專用 (`workflow` 節點)

| 保留字 | 類型 | 用途說明 | 備註 |
| :--- | :--- | :--- | :--- |
| `statusField` | String | 指定由哪個 `fields` key 承載狀態值，必須為 `type: enum` | 編譯期驗證 |
| `initial` | String | 狀態機的初始狀態 | 必須存在於 `statusField` 的 enum options 中 |
| `terminal` | Array | 終態列表，進入後不可再發起任何 transition | 必須存在於 `statusField` 的 enum options 中 |
| `transitions` | Array | 狀態轉換規則清單 | - |

### 2.5 工作流轉換專用 (`workflow.transitions` 下)

| 保留字 | 類型 | 用途說明 | 備註 |
| :--- | :--- | :--- | :--- |
| `action` | String | 觸發按鈕或動作的名稱 | 如: `Submit`, `Reject` |
| `label` | String | 動作的人類可讀名稱，由 i18n 提取 | 如: `送出審核` |
| `from` | Array | 允許發起此動作的前置狀態限制 | 如: `[Draft, Rejected]` |
| `to` | String | 動作執行成功後的落點狀態 | 如: `Pending` |
| `guard` | Object | **守衛條件容器**：執行動作前才查核的前置邏輯。與欄位層的 `eval` 語義不同，不可混用 | - |

### 2.6 `guard` 子節點專用

| 保留字 | 類型 | 用途說明 |
| :--- | :--- | :--- |
| `validations` | Array | 執行動作前的規則查核，結構與根層級 `validations` 相同；觸發時機僅限於該 transition 動作 |
| `requireParams` | Array | 觸發動作時必須附帶填寫的欄位清單 |

### 2.7 掛鉤專用 (`hooks[]` 子節點)

| 保留字 | 類型 | 必填 | 用途說明 |
| :--- | :--- | :---: | :--- |
| `event` | String | ✅ | 觸發事件名稱，格式為 `{時機}:{類型}:{動作}`，支援萬用字元 `*` 代替動作名稱 |
| `type` | String | ✅ | 目前支援：`webhook` |
| `url` | String | ✅ | 接收端的 URL |
| `method` | String | - | HTTP 方法，預設為 `POST` |
| `async` | Boolean | - | 是否非同步執行，預設為 `false` |
| `headers` | Object | - | 自訂 HTTP Header 鍵值對 |
| `payload` | Object | - | 請求 Body，值可使用 `${fieldName}` 插值語法 |
| `retry` | Object | - | 失敗重試策略 |

### 2.8 `retry` 子節點專用

| 保留字 | 類型 | 用途說明 |
| :--- | :--- | :--- |
| `attempts` | Integer | 最大重試次數 |
| `backoff` | String | 重試間隔策略：`fixed`（固定間隔）或 `exponential`（指數退避） |

### 2.9 視圖專用 (`views` 下)

| 保留字 | 類型 | 用途說明 |
| :--- | :--- | :--- |
| `columns` | Array | 定義列表視圖要依序渲染哪些查表欄位 |
| `filterBy` | Array | 提供使用者可在畫面上過濾的維度搜尋條件 |
| `defaultSort` | String | 列表視圖的預設排序欄位。前綴 `-` 代表降序 (DESC)，無前綴代表升序 (ASC) |
| `layout` | Array | 表單的排版架構，由各種佈局容器（`group`、`tabs`）組成 |
| `actions` | Object | 宣告 workflow 動作按鈕的渲染位置與顯示範圍 |

### 2.10 `views.detail.actions` 子節點專用

| 保留字 | 類型 | 用途說明 |
| :--- | :--- | :--- |
| `placement` | String | 按鈕渲染位置：`top`（預設）、`bottom`、`both` |
| `include` | Array | 選填：限定顯示哪些 action 名稱，省略則顯示全部合法動作 |

---

## 3. 系統保留符號 (Syntactic Sugar Symbols)

解析器在編譯期間，若在欄位定義的值中讀取到以下符號，將自動啟動內建的型別轉換與簡寫還原功能：

* **驚嘆號 `!`**：型別後綴。代表該欄位**為必填 (Required)**。
  * `title: string!` 等同於在該欄位下配置 `eval: { required: true }`。
  * 結合長度限制：`string(50)!`

* **陣列框 `[]`**：型別或關聯後綴。
  * 代表單純原生陣列：`tags: string[]`。
  * 代表一對多實體關聯 (hasMany)：`items: [PurchaseOrderItem]`（宣告於 `relations` 下）。

* **減號前綴 `-`**：排序方向符號，**僅在 `views.list.defaultSort` 的值中有效**。
  * `-createdAt` 代表依 `createdAt` **降序 (DESC)** 排列。
  * `createdAt`（無前綴）代表**升序 (ASC)**，為預設方向。

---

## 4. 模板語法對照 (Template Syntax Reference)

BizYAML 中存在兩套功能相異的模板語法，適用範圍嚴格區分，不可混用：

| 語法 | 名稱 | 適用範圍 | 求值時機 | 範例 |
| :--- | :--- | :--- | :--- | :--- |
| `{PLACEHOLDER}` | Sequence Pattern 佔位符 | 僅限 `fields[].sequence` | 每次新建紀錄時，由後端序號引擎求值 | `"PO-{YYYY}{MM}-{SEQ:4}"` |
| `${fieldName}` | Payload 插值符 | 僅限 `hooks[].payload` 的值 | 事件觸發時，由運行期引擎動態注入當前紀錄欄位值 | `"${id}"`, `"${totalAmount}"` |

---

## 5. 表達式語言保留運算子

以下運算子在 BizYAML 表達式中具有特殊語義，不可作為識別符使用。完整規範請參閱 [06. 表達式語言規範](./06_Expression_Language.md)。

| 運算子 | 類別 |
| :--- | :--- |
| `==` `!=` `>` `>=` `<` `<=` | 比較運算子 |
| `in` `not in` | 集合運算子 |
| `&&` `\|\|` `!` | 邏輯運算子 |
| `+` `-` `*` `/` | 算術運算子 |
| `true` `false` `null` | 字面值關鍵字 |
