# 06. Expression Language Specifications (Expression Language)

BizYAML allows the use of "dynamic expressions" across multiple blocks to describe calculation logic and conditional assessments. To ensure parsers and cross-platform generators can interpret them consistently, this chapter defines the **Minimal Expression Subset** shared by all expressions.

> **Applicable Scope**: `fields[].computed`, `fields[].eval.*`, `validations[].rule`, `workflow.transitions[].guard.validations[].rule`

---

## 1. Operators

### 1.1 Comparison Operators

| Operator | Description | Example |
| :--- | :--- | :--- |
| `==` | Equals | `status == 'Approved'` |
| `!=` | Not equals | `status != 'Draft'` |
| `>` | Greater than | `totalAmount > 0` |
| `>=` | Greater than or equal | `endDate >= startDate` |
| `<` | Less than | `quantity < maxStock` |
| `<=` | Less than or equal | `discountRate <= 1.0` |
| `in` | Included in list | `status in ['Draft', 'Pending']` |
| `not in` | Not included in list | `status not in ['Approved', 'Cancelled']` |

> **`in` / `not in` Syntax**: The right side must be an array of literal values wrapped in square brackets. Currently, using field names as the source of the target list is unsupported.

### 1.2 Logical Operators

| Operator | Description | Example |
| :--- | :--- | :--- |
| `&&` | Logical AND | `isActive == true && quantity > 0` |
| `\|\|` | Logical OR | `status == 'Draft' \|\| status == 'Rejected'` |
| `!` | Logical NOT | `!isLocked` |

### 1.3 Arithmetic Operators

| Operator | Description | Example |
| :--- | :--- | :--- |
| `+` `-` `*` `/` | Arithmetic operations | `totalAmount - discountAmount` |

> **Usage Limits**: Arithmetic operators can be used across all blocks, but within `eval.*`, `validations[].rule`, `guard.validations[].rule`, the **final returning type of the entire expression must explicitly be boolean**. Arithmetic can only act as intermediate calculations, for example:
> ```
> discountAmount <= totalAmount * 0.5    # ✅ Legal: Arithmetic serves as a sub-expression in the comparison
> totalAmount - discountAmount           # ❌ Illegal: Cannot be the final standalone result in eval/validations
> ```

---

## 2. Literal Types

| Type | Syntax | Example |
| :--- | :--- | :--- |
| String | Single quotes `'...'` | `'Approved'`, `'Draft'` |
| Integer | Direct numbers | `0`, `100` |
| Decimal | Including decimal point | `0.5`, `1.0` |
| Boolean | `true` / `false` | `isActive == true` |
| Null | `null` | `approvedBy != null` |
| String Array | `['...', '...']` | `['Draft', 'Pending']` (Only on the right side of `in` / `not in`) |

> **Attention**: String literals must always use **single quotes**. Double quotes are reserved for YAML's own syntax wrappers and are not used inside expressions.

---

## 3. Field Identifiers

In expressions, you can directly use the **field name** as an identifier to reference any field value of the current entity:

```
status == 'Approved'        # Reference the value of the status field
endDate >= startDate        # Cross-reference two fields to compare
totalAmount > 0
status in ['Draft', 'Pending']
```

> **Cross-entity references are unsupported** (e.g., `supplier.creditLimit`). If cross-entity conditions are needed, the data should first be imported into the current entity through a `lookup` field before being referenced.

---

## 4. Built-in Functions

Supplies a handful of generic operations, parsers across every platform must implement the following checklist:

| Function | Description | Example |
| :--- | :--- | :--- |
| `count(relationKey)` | Counts the number of child records in a one-to-many relationship | `count(items) > 0` |
| `sum(relationKey, field)` | Sums the designated field of child records | `sum(items, unitPrice) > 1000` |
| `length(field)` | Retrieves the length dimension natively sizing string or array constraints | `length(tags) <= 5` |
| `now()` | Equivalent current timestamp targeting `datetime` constraints | `expiryDate > now()` |
| `today()` | Identical current date parameters natively targeting `date` properties | `startDate >= today()` |

---

## 5. Usage Constraints Summary per Block

| Block | Comparison Operators | Logical Operators | `in`/`not in` | Arithmetic Operators | Built-in Functions |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `computed` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `eval.*` | ✅ | ✅ | ✅ | ✅ (Sub-expression) | ✅ |
| `validations[].rule` | ✅ | ✅ | ✅ | ✅ (Sub-expression) | ✅ |
| `guard.validations[].rule` | ✅ | ✅ | ✅ | ✅ (Sub-expression) | ✅ |

---

## 6. Implementation Notes (For Parser Developers)

- Expressions are **pure function evaluations** and should not entail side effects (cannot trigger database writes or external requests).
- Each platform may compile expressions into native target syntax (e.g., TypeScript conditional expressions or SQL `CASE WHEN`), or evaluate them dynamically at runtime. Either approach is valid.

The above content shows the entire, complete file contents of the requested file.
