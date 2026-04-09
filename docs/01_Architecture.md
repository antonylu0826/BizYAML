# 01. Architecture Overview & Philosophy

BizYAML is a "Domain Specific Language (DSL)" designed specifically for developing complex business logic systems like enterprise CRUD and ERP systems. It aims to serve as a common language between domain experts and developers to achieve a Single Source of Truth (SSOT).

## 1. Core Design Philosophy

BizYAML's design revolves around three core philosophies:

1. **Convention over Configuration**: Provides minimalist syntax sugar, hiding redundant configurations wherever possible. For Example, relationship configurations can be simplified down to writing an array symbol `[TargetEntity]`.
2. **Separation of Concerns**: Splits complex business systems into static data structures and dynamic processing workflows to ensure cross-department collaboration does not interfere with each other.
3. **Interface-Driven**: The DSL is not merely mapped to generate database ORM schemas; it simultaneously possesses the capabilities for frontend views layout and i18n support integrations.

---

## 2. File and Module Conventions

### 2.1 Directory as Module
It is highly recommended to automatically infer the belonging Module through the physical "directory path". Developers do not need to repeatedly declare `module` within the YAML itself.

**Example Structure:**
```text
/biz-schema
  /Procurement                <-- Automatically inferred module: Procurement
    PurchaseOrder.entity.yaml 
    PurchaseOrder.flow.yaml
    PurchaseOrder.views.yaml
    Supplier.entity.yaml
```
When `PurchaseOrder.entity.yaml` is placed underneath the directory, the parser will automatically register it with the globally unique identifier `Procurement.PurchaseOrder`.

### 2.2 Responsibility Splitting Convention
For entities with an abundance of calculation fields and complex logic, we recommend adopting the "responsibility splitting by file suffix" pattern under the same folder.
The parser will intelligently merge configurations with the "same base filename" during the compilation process:
 
* `[Entity].entity.yaml`: Responsible for static definitions such as fields, relations, indexes, etc. (Core audience: DBA / Backend).
* `[Entity].flow.yaml`: Responsible for dynamic workflow logic, validation rules, state machines, and events (Core audience: PM / Flow Designer).
* `[Entity].views.yaml`: Responsible for the visual layout mapping when presenting data on screens (Core audience: Frontend).

> **Tip**: If you encounter an extremely simple dictionary table (e.g. Country Codes), you can merge all definitions into a single `Country.entity.yaml` without mandatory file splitting.

---

## 3. Compilation Pipeline

BizYAML's raw YAML files are not executed directly but instead pass through a three-stage compilation pipeline, ultimately generating a **Platform-Agnostic Intermediate Representation (IR)** destined for consumption by downstream code generators or dynamic engines.

```text
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ YAML Source │ ──▶ │  Discovery  │ ──▶ │ Parse/Merge  │ ──▶ │  Validate/Emit  │
│  (.entity   │     │  & Grouping │     │ & Desugar    │     │  IR (JSON)      │
│   .flow     │     │             │     │              │     │                 │
│   .views)   │     └─────────────┘     └──────────────┘     └─────────────────┘
└─────────────┘           ①                    ②                     ③
```

### 3.1 Phase One: Discovery & Grouping

The parser recursively crawls the root directory and establishes the entities list according to the following conventions:

1. **Identify Module**: Infers module name from the folder path structure.
2. **Identify Entity**: Derives entity name based on the base filename dropping the suffixes (`.entity.yaml`, `.flow.yaml`, `.views.yaml`).
3. **Grouping**: Groups files under the exact same folder with identical base filename into one cohort.

```text
/Procurement/PurchaseOrder.entity.yaml  ─┐
/Procurement/PurchaseOrder.flow.yaml     ├─▶ One Group, Entity = Procurement.PurchaseOrder
/Procurement/PurchaseOrder.views.yaml    ─┘
/Procurement/Supplier.entity.yaml        ──▶ One Group, Entity = Procurement.Supplier
```

### 3.2 Phase Two: Parse, Merge, and Desugar

#### Merge Strategy

Each file suffix **owns** specific root keys. When merging, the parser determines combinations based on the "who owns what" rules forming a completed structural tree:

| Owned Root Node | `.entity.yaml` | `.flow.yaml` | `.views.yaml` |
| :--- | :---: | :---: | :---: |
| `name`, `label` | ✅ Primary Source | ⚠️ Repeatable, must be identical | ⚠️ Repeatable, must be identical |
| `fields`, `relations`, `indexes` | ✅ | ❌ | ❌ |
| `validations`, `workflow`, `hooks` | ❌ | ✅ | ❌ |
| `views` | ❌ | ❌ | ✅ |

**Conflict Rules**:
- If a root node appears inside a **file extension it doesn't belong to** -> **Compilation Error**, accompanied by a clear message instructing moving the block to the correct file.
- `name` and `label` are permitted across multiple files (for self-containment purposes), but their respective values **must be exactly identical**, otherwise leading to a compile error.
- Single-File Mode (Only one `.entity.yaml` present): All root nodes can reside under one monolithic file, voiding ownership boundaries. The parser will enter this mode by concluding "there is only one YAML file located within the grouping folder."

#### Syntactic Desugar

After the merge finishes, the parser expands any syntactic sugar into standardized and comprehensive canonical formats:

| Markdown Syntax Sugar | Desugared IR Format |
| :--- | :--- |
| `title: string(50)!` | `title: { type: "string", maxLength: 50, eval: { required: true } }` |
| `tags: string[]` | `tags: { type: "array", items: "string" }` |
| `supplier: Supplier` (relations) | `supplier: { type: "belongsTo", target: "Supplier", foreignKey: "supplierId" }` |
| `items: [OrderItem]` (relations) | `items: { type: "hasMany", target: "OrderItem" }` |
| `status: enum` + `options: [A, B]` | `options: [{ value: "A", label: "A" }, { value: "B", label: "B" }]` |

### 3.3 Phase Three: Validate & Emit IR

#### Compile-time Checks

Before outputting IR JSON, the parser **must** execute the aforementioned structural checks; failing any test equals a compilation crash:

| Check Rule | Description |
| :--- | :--- |
| Expression Validity | Expressions located inside `computed`, `eval`, `validations.rule`, `guard.validations.rule` must strictly abide by [06 Expression Language Specifications](./06_Expression_Language.md). |
| Identifier Reachability | Identifiers referenced within calculations must point directly towards previously defined `fields` keys or intrinsic functions. |
| Reserved Word Constraints | Customized keys among `fields` / `relations` must rarely collide with layer identical native reserved keys (conforming to [05 Reserved Words](./05_Reserved_Words.md)). |
| Lookup Target Relevancy | The `relation` attribute inside `type: lookup` mappings must map back strictly towards a named item inside `relations` grouping context. |
| State Machine Integrity | The target variable field named beneath `workflow.statusField` must be mapped into `type: enum`; values declared underneath `initial`, `from[]`, `to` bindings must natively match with existing declarations under the host field's `options` array. |
| Enum Options Integrity | Nested `value` arrays existing inside an `options` mapping must remain distinct to avoid conflicts. |

#### Intermediate Representation (IR) Output Specification

The overarching generation for every entity equates towards producing an independent **JSON Object**. The IR object's internal infrastructure mirrors the desugared structures previously compiled under mapping logic alongside native parser interpolations.

```jsonc
{
  // Parser Inferences
  "module": "Procurement",

  // Sourced from .entity.yaml
  "name": "PurchaseOrder",
  "label": "Purchase Order",
  "fields": {
    "poNumber": {
      "type": "string",
      "maxLength": null,
      "sequence": {
        "pattern": "PO-{YYYY}{MM}-{SEQ:4}",
        "resetCycle": "monthly"        // Parser automatically infers reset cycle from pattern
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
      "virtual": true                  // Parser marks: Avoid generating actual Database Column
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
      "foreignKey": "supplierId"       // Generated dynamically via parser conventions
    },
    "items": {
      "type": "hasMany",
      "target": "PurchaseOrderItem"
    }
  },
  "indexes": [
    { "fields": ["status", "createdAt"], "name": "idx_status_createdAt", "unique": false }
  ],

  // Sourced from .flow.yaml
  "validations": [
    { "rule": "totalAmount > 0", "message": "Amount must be strictly greater than zero" }
  ],
  "workflow": {
    "statusField": "status",
    "initial": "Draft",
    "transitions": [
      {
        "action": "Submit",
        "label": "Submit for Review",
        "from": ["Draft", "Rejected"],
        "to": "Pending",
        "guard": null
      }
    ]
  },
  "hooks": [],

  // Sourced from .views.yaml
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

**Design Principles of the IR**:

- **One JSON object per entity**: Cross-entity references (e.g., `target: "Supplier"`) are kept as plain strings. Downstream tools resolve them independently — the IR does not embed foreign entity objects.
- **No syntactic sugar in the IR**: All shorthand is fully expanded. Code generators consume plain JSON and never need to understand BizYAML shorthand.
- **All inferred values are explicit**: Parser-derived properties such as `virtual`, `foreignKey`, and `resetCycle` are always present in the IR, so downstream tools do not have to re-derive them.
- **The IR is the contract**: All downstream consumers (code generators, UI renderers, linters) read only the IR — never the raw YAML. Changing YAML syntax does not break downstream tools as long as the IR format remains stable.
