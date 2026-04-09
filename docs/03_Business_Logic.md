# 03. Business Logic Layer

Unlike traditional methodologies that hardcode numerous `if-else` blocks inside Controllers, BizYAML advocates abstracting business rules, centralizing them in `[Entity].flow.yaml` for parsers and engines to execute automatically.

---

## 1. Cross-Field and Entity Validations (Entity/Record Validations)

Certain logic does not belong to a single field, but rather requires record-wide checks. These are declared in the root `validations` directory:

```yaml
validations:
  - rule: "endDate >= startDate"
    message: "End date cannot precede the start date."
  - rule: "discountAmount <= totalAmount * 0.5"
    message: "Discount amount cannot exceed 50% of the total amount."
```

> **Trigger Timing**: Root level `validations` are triggered every time a record is **created** or **updated**, regardless of the current state. This serves as the fundamental data integrity guard throughout the entity's lifecycle.

> For expression syntax, please refer to [06. Expression Language](./06_Expression_Language.md).

---

## 2. State Machine and Workflow (Workflow & State Machine)

Utilizes Finite State Machines (FSM) to replace chaotic review flow logic, establishing the preconditions and necessary tasks between node transitions right from the source.

### 2.1 Coupling Convention Between `statusField` and `enum`

`workflow.statusField` must reference an existing field declared in `fields`, and this field **must be of `type: enum`**. All state values used in `initial`, `terminal`, `transitions[].from[]`, and `transitions[].to` within the Workflow **must strictly exist within the `options` of that enum**.

If this convention is violated, the parser should throw an error during the **compilation phase**, specifying which state value was not declared in the enum options.

```yaml
# Enum declaration in fields (.entity.yaml)
fields:
  status:
    type: enum
    options: [Draft, Pending, Approved, Rejected, Cancelled]
    default: Draft

# All state values referenced in the workflow must exist in the options list above
workflow:
  statusField: status        # ← Points to the status field above
  initial: Draft             # ← Must be in options
  terminal: [Approved, Cancelled]
  transitions:
    - action: Submit
      from: [Draft, Rejected]  # ← Must be in options
      to: Pending              # ← Must be in options
```

### 2.2 Complete Workflow Example

```yaml
workflow:
  statusField: status
  initial: Draft
  terminal: [Approved, Cancelled]   # Once entering a terminal state, no further transitions can be initiated

  transitions:
    - action: Submit
      label: Submit for Review
      description: "In the Draft or Rejected state, the filler verifies the data is correct and submits it, entering the pending review queue."
      from: [Draft, Rejected]
      to: Pending
      guard:                            # Guard condition checks before the action is triggered
        validations:
          - rule: "totalAmount > 0"
            message: "Amount must be greater than zero."
          - rule: "count(items) > 0"
            message: "There must be at least one line item."

    - action: Approve
      label: Approve
      from: [Pending]
      to: Approved

    - action: Reject
      label: Reject Document
      from: [Pending]
      to: Rejected
      guard:
        requireParams: [rejectReason]   # When the "Reject" action is triggered, filling out the rejection reason is mandatory

    - action: Cancel
      label: Cancel
      from: [Draft]
      to: Cancelled
```

### 2.3 Differences between `guard` and Root Level `validations`

| | Root Level `validations` | `transitions[].guard.validations` |
| :--- | :--- | :--- |
| **Trigger Timing** | Every time a record is created or updated | Only when a specific transition action is triggered |
| **Purpose** | Data integrity guard (rules that are always true) | Preconditions for specific actions (only meaningful under that action) |
| **Example** | `endDate >= startDate` | `count(items) > 0` (only needed before submission) |

> **`guard` vs `eval`**: `eval` is used for static/dynamic condition control at the field level (`hidden`, `readonly`, `required`, etc.); `guard` is exclusive to `workflow.transitions`, representing "guard logic checked only before executing an action". The semantics of the two are different and they cannot be interchanged.

---

## 3. External Hooks and Asynchronous Integration (Webhooks / Events)

To maintain maximum extensibility, workflows are allowed to mount event hooks to integrate with any external systems or automation platforms that support the Webhook protocol. BizYAML itself is not bound to any specific external tools.

```yaml
hooks:
  - event: "after:transition:Approve"
    type: webhook
    url: "https://your-automation-platform/webhook/po-approved"
    method: POST                        # HTTP method, defaults to POST
    async: true
    headers:                            # Custom HTTP Headers (e.g., authentication keys)
      X-Api-Key: "secret-token"
    payload:
      poId: "${id}"
      amount: "${totalAmount}"
    retry:                              # Failure retry strategy (optional)
      attempts: 3
      backoff: exponential              # Optional: fixed | exponential
```

### 3.1 Supported Event Formats

| Event Format | Trigger Timing |
| :--- | :--- |
| `after:transition:{Action}` | After the specified state transition succeeds |
| `before:transition:{Action}` | Before the specified state transition executes |
| `after:transition:*` | After **any** state transition succeeds (wildcard) |
| `before:transition:*` | Before **any** state transition executes (wildcard) |
| `after:create` | After record creation |
| `after:update` | After record update |

> **Wildcard `*`**: Using `after:transition:*` mounts the same hook to all transitions. This is common in auditing logs, message queue notifications, etc., where all state changes need to be intercepted, avoiding the repetition of declaring multiple identical hooks.

> **`payload` Interpolation Syntax**: Using the `${fieldName}` syntax, the parser dynamically injects the current record's field values when the event is triggered. Only direct fields of the current entity are supported; cross-relation paths (like `${supplier.name}`) are not supported. If related data needs to be passed, the receiving end should query it themselves.

> **Best Practices**: BizYAML is only responsible for the state transitions of the document itself. Composite tasks (like sending notifications or transferring data across systems) should be handed over to external platforms by declaring webhooks with `async: true`, achieving a clean separation of "business logic belongs to the system, automation tasks belong externally."
