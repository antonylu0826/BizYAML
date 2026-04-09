# 06. 表達式語言規範 (Expression Language)

BizYAML 在多個區塊中允許使用「動態表達式」來描述計算邏輯與條件判斷。為確保解析器與跨平台生成器能夠一致解讀，本章定義所有表達式共用的**最小語言子集 (Minimal Expression Subset)**。

> **適用範圍**：`fields[].computed`、`fields[].eval.*`、`validations[].rule`、`workflow.transitions[].guard.validations[].rule`

---

## 1. 運算子

### 1.1 比較運算子

| 運算子 | 說明 | 範例 |
| :--- | :--- | :--- |
| `==` | 等於 | `status == 'Approved'` |
| `!=` | 不等於 | `status != 'Draft'` |
| `>` | 大於 | `totalAmount > 0` |
| `>=` | 大於等於 | `endDate >= startDate` |
| `<` | 小於 | `quantity < maxStock` |
| `<=` | 小於等於 | `discountRate <= 1.0` |
| `in` | 包含於清單中 | `status in ['Draft', 'Pending']` |
| `not in` | 不包含於清單中 | `status not in ['Approved', 'Cancelled']` |

> **`in` / `not in` 語法**：右側必須為方括號包裹的字面值陣列，目前不支援以欄位名稱作為右側清單來源。

### 1.2 邏輯運算子

| 運算子 | 說明 | 範例 |
| :--- | :--- | :--- |
| `&&` | 且 (AND) | `isActive == true && quantity > 0` |
| `\|\|` | 或 (OR) | `status == 'Draft' \|\| status == 'Rejected'` |
| `!` | 非 (NOT) | `!isLocked` |

### 1.3 算術運算子

| 運算子 | 說明 | 範例 |
| :--- | :--- | :--- |
| `+` `-` `*` `/` | 四則運算 | `totalAmount - discountAmount` |

> **使用限制**：算術運算子在所有區塊中均可使用，但在 `eval.*`、`validations[].rule`、`guard.validations[].rule` 中，整個表達式的**最終結果型別必須為 boolean**。算術僅可作為中間計算，例如：
> ```
> discountAmount <= totalAmount * 0.5    # ✅ 合法：算術在比較中作為子式
> totalAmount - discountAmount           # ❌ 非法：在 eval/validations 中不可單獨作為結果
> ```

---

## 2. 字面值類型

| 類型 | 語法 | 範例 |
| :--- | :--- | :--- |
| 字串 | 單引號 `'...'` | `'Approved'`、`'Draft'` |
| 整數 | 直接數字 | `0`、`100` |
| 小數 | 帶小數點 | `0.5`、`1.0` |
| 布林 | `true` / `false` | `isActive == true` |
| 空值 | `null` | `approvedBy != null` |
| 字串陣列 | `['...', '...']` | `['Draft', 'Pending']`（僅用於 `in` / `not in` 右側） |

> **注意**：字串字面值一律使用**單引號**。雙引號保留給 YAML 本身的語法包裹，不在表達式內使用。

---

## 3. 欄位識別符

表達式中可直接以**欄位名稱**作為識別符，引用當前實體的任意欄位值：

```
status == 'Approved'        # 引用 status 欄位的值
endDate >= startDate        # 引用兩個欄位互相比較
totalAmount > 0
status in ['Draft', 'Pending']
```

> **不支援跨實體引用**（如 `supplier.creditLimit`）。如需跨實體條件，應透過 `lookup` 欄位將資料引入當前實體後再引用。

---

## 4. 內建函式 (Built-in Functions)

提供少量通用函式，各平台的解析器應實作以下清單：

| 函式 | 說明 | 範例 |
| :--- | :--- | :--- |
| `count(relationKey)` | 計算一對多關聯的子紀錄數量 | `count(items) > 0` |
| `sum(relationKey, field)` | 對子紀錄的指定欄位加總 | `sum(items, unitPrice) > 1000` |
| `length(field)` | 取得字串或陣列欄位的長度 | `length(tags) <= 5` |
| `now()` | 當前時間，對應 `datetime` 型別 | `expiryDate > now()` |
| `today()` | 當前日期，對應 `date` 型別 | `startDate >= today()` |

---

## 5. 各區塊使用限制摘要

| 區塊 | 比較運算子 | 邏輯運算子 | `in`/`not in` | 算術運算子 | 內建函式 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `computed` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `eval.*` | ✅ | ✅ | ✅ | ✅（子式） | ✅ |
| `validations[].rule` | ✅ | ✅ | ✅ | ✅（子式） | ✅ |
| `guard.validations[].rule` | ✅ | ✅ | ✅ | ✅（子式） | ✅ |

---

## 6. 實作注意事項（給 Parser 開發者）

- 表達式為**純函數求值**，不應有副作用（不能觸發資料庫寫入或外部請求）。
- 各平台可將表達式編譯為目標語言的原生條件（如 TypeScript 的三元運算式、SQL 的 `CASE WHEN`），也可在執行期直接解譯，由 Parser 自行決定。
- 遇到未知識別符（非欄位名、非內建函式）時，應在編譯期拋出錯誤，而非靜默忽略。
- `in` / `not in` 的右側陣列在編譯期即可確定（皆為字面值），Parser 應在編譯期驗證陣列元素型別與目標欄位型別一致。
