# 04. Presentation and I18n

BizYAML serves not only as a data layer description but also integrates the core Layout logic for backend UI. It is recommended to define this in the `[Entity].views.yaml` file, helping frontend dynamic rendering engines automatically generate usable CRUD templates.

---

## 1. Views Layout Abstraction

### 1.1 List View (`list`)

Declares the fields, sorting, and filtering conditions for the data list screen:

```yaml
views:
  list:
    columns: [poNumber, supplier, totalAmount, status]  # Fields to render in sequence
    defaultSort: "-createdAt"                           # Default sort, `-` prefix signifies descending
    filterBy: [status, supplier, poNumber]              # Dimensions available for user filtering
```

### 1.2 Detail/Form View (`detail`)

Declares the layout of the form screen, composed of various **Layout Containers**. It supports two types: `group` and `tabs`:

#### Card Group (`type: group`)

Collects fields into the same card:

```yaml
views:
  detail:
    layout:
      - type: group
        label: Basic Information
        fields: [poNumber, supplier, status]
      - type: group
        label: Amount Information
        fields: [totalAmount, discountAmount, netAmount]
```

#### Pagination Tabs (`type: tabs`)

When there are numerous detail items, use `tabs` to horizontally page different sections:

```yaml
views:
  detail:
    layout:
      - type: group
        label: Basic Information
        fields: [poNumber, supplier, status]
      - type: tabs
        children:
          - label: Line Items
            fields: [items]               # One-to-many relationships automatically render as CRUD sub-tables
          - label: Amounts
            fields: [discountAmount, netAmount, totalAmount]
          - label: Rejection Details
            fields: [rejectReason]
```

> **Regarding Master-Detail**: By placing a one-to-many relationship name declared in `relations` (such as `items`) into `fields`, the frontend component will automatically render it as a "CRUD sub-data table," without requiring additional configuration.

### 1.3 Actions Button Area (`actions`)

The `transitions` action buttons declared in the Workflow are by default rendered in the **top action bar** of the detail page. If you need a customized display location, you can add `actions` to `detail`:

```yaml
views:
  detail:
    actions:
      placement: top                      # top (default) | bottom | both
      include: [Submit, Approve, Reject]  # Optional: Limits which actions to display; if omitted, all are displayed
    layout:
      - type: group
        label: Basic Information
        fields: [poNumber, supplier, status]
```

> Whether buttons are displayed is automatically controlled by the Workflow's `transitions[].from` states: The frontend engine compares the current value of the `statusField` and only renders action buttons that are valid under the current state.

---

## 2. I18n and Localization Strategy

### 2.1 Design Principles

BizYAML **does not allow** mixing a vast amount of multi-language copy directly in YAML. Instead, it adopts a "**Non-intrusive Key Inference Strategy**":

- Only the default language needs to be written in the DSL (e.g., `label: Purchase Order`).
- During compilation, the parser automatically extracts all `label` and `message` values, outputting a foundational translation JSON according to the hierarchical structure for downstream i18n tools to use.

### 2.2 Extractable I18n Sources

The parser traverses all of the following locations for extraction:

| Source | Content to Extract | Corresponding JSON Key Path |
| :--- | :--- | :--- |
| Root level `label` | Entity display name | `{module}.{Entity}.__label__` |
| `fields[].label` | Field display name (if unset, use key name as fallback) | `{module}.{Entity}.fields.{field}` |
| `fields[].options[].label` | Enum option display name | `{module}.{Entity}.fields.{field}.options.{value}` |
| `workflow.transitions[].label` | Action button text | `{module}.{Entity}.actions.{action}` |
| `validations[].message` | Validation failure prompt message | `{module}.{Entity}.validations.{index}` |
| `views.detail.layout[].label` | Group/Tab titles | `{module}.{Entity}.views.detail.{index}` |

### 2.3 Extraction Output Example

```json
{
  "Procurement": {
    "PurchaseOrder": {
      "__label__": "Purchase Order",
      "fields": {
        "poNumber": "PO Number",
        "supplier": "Supplier",
        "totalAmount": "Total Amount",
        "status": {
          "__label__": "Status",
          "options": {
            "Draft": "Draft",
            "Pending": "Pending Review",
            "Approved": "Approved",
            "Rejected": "Rejected"
          }
        },
        "rejectReason": "Rejection Reason"
      },
      "actions": {
        "Submit": "Submit for Review",
        "Approve": "Approve",
        "Reject": "Reject"
      },
      "validations": {
        "0": "Amount must be greater than zero."
      },
      "views": {
        "detail": {
          "0": "Basic Information",
          "1": "Line Items",
          "2": "Amounts"
        }
      }
    }
  }
}
```

The development team simply needs to connect the above dictionary file to any multi-language management tool to achieve precise translation, without needing to modify any BizYAML source code.
