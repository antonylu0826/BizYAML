/**
 * BizYAML Intermediate Representation (IR)
 *
 * The final output of the compiler pipeline. All shorthand is expanded,
 * all inferred values are explicit. Downstream tools only consume IR —
 * they never read raw YAML.
 */

// ---------------------------------------------------------------------------
// Field IR
// ---------------------------------------------------------------------------

export type IrEval = {
  required: boolean | string
  hidden:   boolean | string
  readonly: boolean | string
}

export type IrSequence = {
  pattern:    string
  resetCycle: 'daily' | 'monthly' | 'yearly' | 'never'
}

export type IrEnumOption = {
  value: string | number
  label: string
}

export type IrBaseField = {
  type:        'string' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'json'
  description: string | null
  virtual:     false
  array:       boolean
  maxLength:   number | null   // string only
  precision:   number | null   // decimal only
  scale:       number | null   // decimal only
  default:     unknown
  unique:      boolean
  sequence:    IrSequence | null
  computed:    string | null
  eval:        IrEval
}

export type IrEnumField = {
  type:        'enum'
  description: string | null
  virtual:     false
  options:     IrEnumOption[]
  default:     string | number | null
  unique:      boolean
  eval:        IrEval
}

export type IrLookupField = {
  type:        'lookup'
  description: string | null
  virtual:     true
  relation:    string  // key in IrEntity.relations
  field:       string  // field name on target entity
}

export type IrField = IrBaseField | IrEnumField | IrLookupField

// ---------------------------------------------------------------------------
// Relation IR
// ---------------------------------------------------------------------------

export type IrRelation =
  | { type: 'belongsTo'; target: string; foreignKey: string }
  | { type: 'hasMany';   target: string }

// ---------------------------------------------------------------------------
// Index IR
// ---------------------------------------------------------------------------

export type IrIndex = {
  fields: string[]
  unique: boolean
  name:   string
}

// ---------------------------------------------------------------------------
// Validation IR
// ---------------------------------------------------------------------------

export type IrValidation = {
  rule:    string
  message: string | null
}

// ---------------------------------------------------------------------------
// Workflow IR
// ---------------------------------------------------------------------------

export type IrGuard = {
  validations:   IrValidation[]
  requireParams: string[]
}

export type IrTransition = {
  action:      string
  label:       string | null
  description: string | null
  from:        string[]
  to:          string
  guard:       IrGuard | null
}

export type IrWorkflow = {
  statusField: string
  initial:     string
  terminal:    string[]
  transitions: IrTransition[]
}

// ---------------------------------------------------------------------------
// Hook IR
// ---------------------------------------------------------------------------

export type IrHook = {
  event:   string
  type:    'webhook'
  url:     string
  method:  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  async:   boolean
  headers: Record<string, string>
  payload: Record<string, string>
  retry:   { attempts: number; backoff: 'fixed' | 'exponential' } | null
}

// ---------------------------------------------------------------------------
// Views IR
// ---------------------------------------------------------------------------

export type IrDefaultSort = {
  field:     string
  direction: 'ASC' | 'DESC'
}

export type IrListView = {
  columns:     string[]
  defaultSort: IrDefaultSort | null
  filterBy:    string[]
}

export type IrGroupLayout = {
  type:   'group'
  label:  string | null
  fields: string[]
}

export type IrTabItem = {
  label:  string
  fields: string[]
}

export type IrTabsLayout = {
  type:     'tabs'
  children: IrTabItem[]
}

export type IrLayoutItem = IrGroupLayout | IrTabsLayout

export type IrDetailView = {
  actions: { placement: 'top' | 'bottom' | 'both'; include: string[] | null }
  layout:  IrLayoutItem[]
}

export type IrViews = {
  list:   IrListView | null
  detail: IrDetailView | null
}

// ---------------------------------------------------------------------------
// Root Entity IR
// ---------------------------------------------------------------------------

export type IrEntity = {
  // inferred by parser
  module: string

  // from .entity.yaml
  name:        string
  label:       string | null
  description: string | null
  fields:      Record<string, IrField>
  relations: Record<string, IrRelation>
  indexes:   IrIndex[]

  // from .flow.yaml
  validations: IrValidation[]
  workflow:    IrWorkflow | null
  hooks:       IrHook[]

  // from .views.yaml
  views: IrViews
}
