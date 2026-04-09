# 05. Core Reserved Words Dictionary (Reserved Words)

To keep the DSL structure simple and prevent compilation parsing errors, BizYAML restricts a very small set of "core reserved words". This document serves as the golden rule for Parser developers and when writing Linter/JSON Schemas.

> [!WARNING]
> **Naming Collision Rules (Collision Rules)**
> When developers define **Entity Names**, **Custom Field Names (under `fields`)**, or **Custom Relation Names (under `relations`)**, they must **absolutely never** have the exact same name as the reserved words for that level.

---

## 1. Root Level Global Reserved Words (Root Keywords)

Only permitted to appear at the root node of the YAML file (regardless of whether the file is split).

| Reserved Word | Type | Required | Usage Description | Example / Notes |
| :--- | :--- | :---: | :--- | :--- |
| `name` | String | ✅ | Declares the globally unique identifier of the entity | Must be PascalCase (e.g., `PurchaseOrder`) |
| `label` | String | - | The default human-readable name of the entity | e.g., "Purchase Order" |
| `description` | String | - | Business description of the entity, for human and AI Agent reading; not rendered in UI, not extracted by i18n | Plain text, Markdown not supported |
| `fields` | Object | ✅ | The entry point containing declarations for all entity data properties | Relations are strictly declared in `relations`, not here |
| `relations` | Object | - | Independent declaration entry point for relations and tree structures | The parser automatically generates corresponding foreign key fields |
| `indexes` | Array | - | Entry point for composite indexes on the database entity side | - |
| `validations` | Array | - | Entry point for cross-field or entity-level checking rules | Triggered upon every create/update |
| `workflow` | Object | - | Entry point defining state machine lifecycles and approval workflows | - |
| `hooks` | Array | - | Entry point for external asynchronous integration and event listening | - |
| `views` | Object | - | Entry point defining UI layouts and view arrangements | - |

---

## 2. Second Level Scoped Reserved Words (Scoped Feature Keywords)

These reserved words only possess systemic operational meaning under specific blocks; outside of that scope, they are not considered reserved.

### 2.1 Specific to Field Properties (Child nodes of `fields`)

| Reserved Word | Type | Usage Description | Example |
| :--- | :--- | :--- | :--- |
| `type` | String | Determines corresponding database storage type | `string`, `integer`, `decimal`, `boolean`, `date`, `datetime`, `json`, `enum`, `lookup` |
| `description` | String | Business description of the field, for human and AI Agent reading; applies to all types, not extracted by i18n | Plain text, optional |
| `computed` | Expr | Defines pure-memory calculation formulas not stored in DB | `computed: "grossAmount - discountAmount"` |
| `sequence` | String | Sequence numbering string template, system auto-infers reset dimension | `"PO-{YYYY}{MM}-{SEQ:4}"` |
| `options` | Array | Legal enumeration list specific to the `enum` type | Shorthand: `[Draft, Pending]`; Full: `[{value: 1, label: Low}]` |
| `default` | Any | Default value setup upon data creation | `default: false` |
| `unique` | Boolean | Declares that the field's value must be unique across the entire table | `unique: true` (Equivalent to single-field unique index syntactic sugar) |
| `eval` | Object | **Dynamic Condition Container**: Holds `required`, `hidden`, `readonly` controls, accepts boolean literals or expression strings | `eval: { readonly: true }` / `eval: { hidden: "status=='Draft'" }` |

### 2.2 Specific to `eval` Child Nodes

| Reserved Word | Accepted Values | Usage Description |
| :--- | :--- | :--- |
| `required` | `boolean` \| `Expr` | Whether the field is mandatory |
| `hidden` | `boolean` \| `Expr` | Whether the field is hidden and not rendered on UI |
| `readonly` | `boolean` \| `Expr` | Whether the field is locked as read-only |

### 2.3 Specific to Relation Lookup (Child nodes when `type: lookup`)

| Reserved Word | Type | Usage Description |
| :--- | :--- | :--- |
| `relation` | String | Binds the target relation being listened to, value matches the **key name** under the `relations` node (Not DB field name) |
| `field` | String | Specifies exactly "which property" to grab and display from the target entity |

### 2.4 Specific to Workflow (`workflow` node)

| Reserved Word | Type | Usage Description | Notes |
| :--- | :--- | :--- | :--- |
| `statusField` | String | Specifies which `fields` key carries the state value, must be `type: enum` | Checked at compile-time |
| `initial` | String | The initial state of the state machine | Must exist inside the `statusField`'s enum options |
| `terminal` | Array | List of terminal states, entering implies no further transitions can be initiated | Must exist inside the `statusField`'s enum options |
| `transitions` | Array | List of state transition rules | - |

### 2.5 Specific to Workflow Transitions (Under `workflow.transitions`)

| Reserved Word | Type | Usage Description | Notes |
| :--- | :--- | :--- | :--- |
| `action` | String | Name of the trigger button or action | E.g.: `Submit`, `Reject` |
| `label` | String | Human-readable action name, extracted by i18n | E.g.: `Submit for Review` |
| `description` | String | Business description of the action, for human & AI Agent reading; not extracted by i18n | Plain text, optional |
| `from` | Array | Pre-condition state constraints permitting the firing of this action | E.g.: `[Draft, Rejected]` |
| `to` | String | Landing state after action completes successfully | E.g.: `Pending` |
| `guard` | Object | **Guard Condition Container**: Pre-conditional logic checked right before execution. Distinctly different styling semantics from field level `eval`, do not intermix | - |

### 2.6 Specific to `guard` Child Nodes

| Reserved Word | Type | Usage Description |
| :--- | :--- | :--- |
| `validations` | Array | Rule checking prior to action execution, structurally identical to root `validations`; trigger timing solely limited to this transition action |
| `requireParams` | Array | Required list of parameter fields needing explicit filling alongside triggering the current action |

### 2.7 Specific to Hooks (`hooks[]` Child nodes)

| Reserved Word | Type | Required | Usage Description |
| :--- | :--- | :---: | :--- |
| `event` | String | ✅ | Event trigger designation formatted as `{Timing}:{Type}:{Action}`, supporting wildcard `*` replacing action names |
| `type` | String | ✅ | Currently supports: `webhook` |
| `url` | String | ✅ | Receiving endpoint URL |
| `method` | String | - | HTTP method formatting, defaults specifically to `POST` |
| `async` | Boolean | - | Specifies asynchronous execution, defaults to `false` |
| `headers` | Object | - | Custom HTTP Header key-value pairs |
| `payload` | Object | - | Request Body, value can use `${fieldName}` interpolation syntax |
| `retry` | Object | - | Failure retry strategy |

### 2.8 Specific to `retry` Child Nodes

| Reserved Word | Type | Usage Description |
| :--- | :--- | :--- |
| `attempts` | Integer | Maximum retry count |
| `backoff` | String | Retry interval strategy: `fixed` (fixed interval) or `exponential` (exponential backoff) |

### 2.9 Specific to Views (Under `views`)

| Reserved Word | Type | Usage Description |
| :--- | :--- | :--- |
| `columns` | Array | Defines which fields to render in sequence in the list view |
| `filterBy` | Array | Provides dimension search conditions that users can filter by on the screen |
| `defaultSort` | String | Default sort field for list view. Prefix `-` implies descending (DESC), no prefix implies ascending (ASC) |
| `layout` | Array | Form layout architecture, composed of various layout containers (`group`, `tabs`) |
| `actions` | Object | Declares rendering positions and display scopes for workflow action buttons |

### 2.10 Specific to `views.detail.actions` Child Nodes

| Reserved Word | Type | Usage Description |
| :--- | :--- | :--- |
| `placement` | String | Button render position: `top` (default), `bottom`, `both` |
| `include` | Array | Optional: Limit which action names are displayed, omitting this displays all legal actions |

---

## 3. System Reserved Syntactic Sugar Symbols (Syntactic Sugar Symbols)

During compilation, if the parser reads the following symbols inside field definition values, it automatically triggers built-in type conversion and shorthand unrolling capabilities:

* **Exclamation Mark `!`**: Type suffix. Represents that the specific field **is required (Required)**.
  * `title: string!` is identical to configuring `eval: { required: true }` under that field.
  * Combined with length limitations: `string(50)!`

* **Array Brackets `[]`**: Type or relation suffix.
  * Represents simple native arrays: `tags: string[]`.
  * Represents One-to-Many entity relationships (hasMany): `items: [PurchaseOrderItem]` (Declared under `relations`).

* **Minus Prefix `-`**: Sort direction symbol, **only valid in values of `views.list.defaultSort`**.
  * `-createdAt` means sort by `createdAt` **DESC**.
  * `createdAt` (no prefix) means **ASC**, which is the default direction.

---

## 4. Template Syntax Reference

BizYAML possesses two sets of template syntaxes with disparate functions, whose scopes are strictly distinguished and cannot be intermixed:

| Syntax | Name | Scope | Evaluation Timing | Example |
| :--- | :--- | :--- | :--- | :--- |
| `{PLACEHOLDER}` | Sequence Pattern Placeholder | Strictly exclusively specific to `fields[].sequence` | Evaluated by backend sequence engine when creating every new record | `"PO-{YYYY}{MM}-{SEQ:4}"` |
| `${fieldName}` | Payload Interpolation Variable | Exclusively limited to values inside `hooks[].payload` | Evaluated dynamically injecting current record field values at runtime during event trigger | `"${id}"`, `"${totalAmount}"` |

---

## 5. Expression Language Reserved Operators

The following operators carry special semantic meaning in BizYAML expressions and cannot be used as identifiers. For the full specification, please refer to [06. Expression Language](./06_Expression_Language.md).

| Operator | Category |
| :--- | :--- |
| `==` `!=` `>` `>=` `<` `<=` | Comparison Operators |
| `in` `not in` | Set Operators |
| `&&` `\|\|` `!` | Logical Operators |
| `+` `-` `*` `/` | Arithmetic Operators |
| `true` `false` `null` | Literal Value Keywords |
