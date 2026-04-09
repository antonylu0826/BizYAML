# 02. Data Modeling Layer

The Data Modeling layer defines the underlying relational database schema of the system. Under BizYAML's conventions, this part should be declared within `[Entity].entity.yaml`.

## 1. Root Properties

The core of any BizYAML document begins with the most concise naming tags:

```yaml
name: PurchaseOrder      # English code for the entity, PascalCase. Combined with the current folder name to form a globally unique identifier.
label: Purchase Order    # Default display name (serves as a fallback before I18n translation)
description: "Records material purchase documents from suppliers, requiring a three-stage review workflow."  # Optional, business context note
```

> **Note:** `module` (Module Name) should not be hardcoded inside the document; it is auto-inferred from the directory structure.
> **`description` Design Principle**: Plain text intended for human and AI Agent consumption. It does not appear in UI rendering, is not extracted by i18n, and is optional. Simple dictionary tables can omit it entirely.

---

## 2. Fields System

> **Optional Default**: All fields default to **nullable** unless appended with a `!` suffix or explicitly set to `required: true` inside an `eval` block.

### 2.1 Base Types
Supported data types: `string`, `integer`, `decimal`, `boolean`, `date`, `datetime`, `json`.

Fields can carry a `description` to convey business intent, which is especially useful for AI Agent collaboration:

```yaml
fields:
  poNumber: string(50)!       # Shorthand: max length 50, required
  baseAmount: decimal         # No precision specified
  totalAmount: decimal(12,2)  # Shorthand: precision 12, scale 2
  exchangeRate: decimal(8,4)  # Exchange rates typically need 4 decimal places
  isActive: boolean
  email:
    type: string
    unique: true              # Field-level unique constraint — equivalent to a single-field unique index
```

**`decimal(precision, scale)` Syntax**: `precision` is the total number of digits; `scale` is the number of decimal places. When omitted, the platform applies its default. Financial fields should always declare these explicitly.

**`unique` Attribute**: Available on any field. Equivalent to declaring `{ fields: [fieldName], unique: true }` under `indexes` — it is syntactic sugar for a single-field unique constraint.

### 2.2 Enums & Arrays

**Enum — Shorthand** (value equals label; relies on i18n for display names):

```yaml
fields:
  status:
    type: enum
    options: [Draft, Pending, Approved, Rejected]
    default: Draft
```

**Enum — Explicit Value/Label** (used when the stored value differs from the display label, e.g., numeric codes):

```yaml
fields:
  priority:
    type: enum
    options:
      - value: 1
        label: Low
      - value: 2
        label: Medium
      - value: 3
        label: High
    default: 2
```

**Arrays:**
```yaml
fields:
  allowedTags: string[]   # Shorthand: a plain array of strings
```

### 2.3 Auto-Sequence Generation

ERP documents commonly require auto-incrementing sequential numbers. Use the `sequence` property with a pattern string; the parser automatically infers the reset cycle:

```yaml
fields:
  poNumber:
    type: string
    sequence: "PO-{YYYY}{MM}{DD}-{SEQ:4}" # Contains {DD} → parser infers daily reset
    eval:
      readonly: true
```

> **Sequence Pattern Syntax**: Uses `{...}` placeholders. `{YYYY}`, `{MM}`, `{DD}` represent date components; `{SEQ:N}` produces a zero-padded incrementing integer of width N. This syntax is **exclusive to the `sequence` property** — it is entirely separate from the `${...}` payload interpolation syntax used in hooks. See [05 Reserved Words](./05_Reserved_Words.md) Section 3 for details.

### 2.4 Computed Fields

Computed fields are evaluated in application memory and are not stored in the database. The parser marks them as `virtual: true` in the IR. Whether they are implemented as application-layer calculations or database Generated Columns is left to the platform — the DSL only declares the intent.

```yaml
fields:
  netAmount:
    type: decimal
    computed: "grossAmount - discountAmount"
```

> For expression syntax, see [06. Expression Language](./06_Expression_Language.md).

### 2.5 Field Description (`description`)

```yaml
fields:
  rejectReason:
    type: string
    description: "Reason for rejection, filled by the approver, used as the basis for subsequent improvement."
    eval:
      required: "status == 'Rejected'"
      hidden: "status != 'Rejected'"
```

`description` is a plain text attribute applicable to all field types, including `enum`, `lookup`, and `computed`. Markdown is not supported. It has no effect on UI rendering or validation.

### 2.6 Dynamic Field Controls (`eval`)

`eval` is a container for the three field-level display and input controls:

| Form | Behavior | Example |
| :--- | :--- | :--- |
| Boolean literal | Static, always-on condition | `readonly: true` |
| Expression string | Evaluated at runtime, must return a boolean | `readonly: "isLocked == true"` |

```yaml
fields:
  poNumber:
    type: string
    sequence: "PO-{YYYY}{MM}-{SEQ:4}"
    eval:
      readonly: true                      # Always read-only

  rejectReason:
    type: string
    eval:
      required: "status == 'Rejected'"   # Required only when status is Rejected
      hidden: "status != 'Rejected'"     # Hidden in all other states
      readonly: "isLocked == true"       # Read-only when the record is locked
```

### 2.7 Virtual Lookup Fields (`type: lookup`)

When a form needs to display an attribute from a related entity (e.g., the supplier's phone number) without duplicating data in the database, use a `lookup` field. It is virtual — not stored in the database — and always reads from the live relation.

```yaml
fields:
  supplierPhone:
    type: lookup
    relation: supplier    # Must match a key name under `relations` (not the FK column name)
    field: phoneNumber    # The property to read from the target entity
```

> **Important**: The `relation` value must match the **key name** defined under the `relations` node (e.g., `supplier`), not the generated foreign key column name (e.g., `supplierId`). The parser resolves the FK automatically.

---

## 3. Relations

All relationships are declared under `relations`. The parser automatically generates the corresponding foreign key fields (e.g., `supplierId`, `projectId`). Do not declare foreign key columns manually in `fields`.

```yaml
relations:
  # Many-to-One (belongsTo): generates supplierId FK automatically
  supplier: Supplier

  # One-to-Many (hasMany)
  items: [PurchaseOrderItem]

  # Another Many-to-One
  project: Project

  # Self-referencing tree structure (e.g., org chart)
  parent: Department      # belongsTo — points to parent node
  children: [Department]  # hasMany — points to child nodes
```

**Foreign key naming convention**: For `belongsTo` relations, the FK column name is derived as `{relationKey}Id`. For example, `supplier` → `supplierId`.

---

## 4. Indexes

Indexes optimize database query performance. The `name` field is optional — if omitted, the parser generates a name automatically (e.g., `idx_status_createdAt`).

```yaml
indexes:
  - fields: [status, createdAt]           # Name omitted → auto-generated
  - fields: [companyId, orderNumber]
    unique: true
    name: uq_company_order                # Explicit name
```
