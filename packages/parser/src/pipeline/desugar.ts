import {
  IrEntity, IrField, IrBaseField, IrEnumField, IrLookupField,
  IrEval, IrRelation, IrIndex, IrValidation, IrWorkflow,
  IrTransition, IrGuard, IrHook, IrViews, IrListView,
  IrDetailView, IrLayoutItem, IrDefaultSort, IrSequence, IrEnumOption,
} from '../types/ir.js'
import { RawMerged } from './merge.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_EVAL: IrEval = { required: false, hidden: false, readonly: false }

function parseEval(raw: Record<string, unknown> | undefined): IrEval {
  if (!raw) return { ...DEFAULT_EVAL }
  return {
    required: (raw.required as boolean | string) ?? false,
    hidden:   (raw.hidden   as boolean | string) ?? false,
    readonly: (raw.readonly as boolean | string) ?? false,
  }
}

/**
 * Parse field type shorthand string into components.
 * e.g. "string(50)!" -> { type: 'string', maxLength: 50, array: false, required: true }
 *      "decimal(12,2)" -> { type: 'decimal', precision: 12, scale: 2, array: false, required: false }
 *      "string[]!" -> { type: 'string', array: true, required: true }
 */
function parseShorthand(raw: string) {
  const required = raw.endsWith('!')
  const s = required ? raw.slice(0, -1) : raw
  const array = s.endsWith('[]')
  const base = array ? s.slice(0, -2) : s

  // decimal(precision,scale)
  const decimalMatch = base.match(/^decimal\((\d+),(\d+)\)$/)
  if (decimalMatch) {
    return { type: 'decimal' as const, precision: Number(decimalMatch[1]), scale: Number(decimalMatch[2]), maxLength: null, array, required }
  }
  // string(maxLength)
  const stringMatch = base.match(/^string\((\d+)\)$/)
  if (stringMatch) {
    return { type: 'string' as const, maxLength: Number(stringMatch[1]), precision: null, scale: null, array, required }
  }
  // plain type
  return { type: base as IrBaseField['type'], maxLength: null, precision: null, scale: null, array, required }
}

/**
 * Infer sequence reset cycle from pattern.
 * Contains {DD} -> daily, {MM} -> monthly, {YYYY} -> yearly, else -> never
 */
function inferResetCycle(pattern: string): IrSequence['resetCycle'] {
  if (pattern.includes('{DD}')) return 'daily'
  if (pattern.includes('{MM}')) return 'monthly'
  if (pattern.includes('{YYYY}')) return 'yearly'
  return 'never'
}

function desugarSequence(raw: string): IrSequence {
  return { pattern: raw, resetCycle: inferResetCycle(raw) }
}

// ---------------------------------------------------------------------------
// Field desugaring
// ---------------------------------------------------------------------------

function desugarField(key: string, raw: unknown): IrField {
  // Shorthand string form
  if (typeof raw === 'string') {
    const { type, maxLength, precision, scale, array, required } = parseShorthand(raw)
    const field: IrBaseField = {
      type, virtual: false, array,
      maxLength: maxLength ?? null,
      precision: precision ?? null,
      scale: scale ?? null,
      default: null,
      unique: false,
      sequence: null,
      computed: null,
      eval: { ...DEFAULT_EVAL, required },
    }
    return field
  }

  const obj = raw as Record<string, unknown>

  // lookup
  if (obj.type === 'lookup') {
    const field: IrLookupField = {
      type: 'lookup',
      virtual: true,
      relation: obj.relation as string,
      field: obj.field as string,
    }
    return field
  }

  // enum
  if (obj.type === 'enum') {
    const rawOptions = obj.options as Array<string | { value: string | number; label: string }>
    const options: IrEnumOption[] = rawOptions.map(o =>
      typeof o === 'string' ? { value: o, label: o } : o
    )
    const field: IrEnumField = {
      type: 'enum',
      virtual: false,
      options,
      default: (obj.default as string | number | null) ?? null,
      unique: (obj.unique as boolean) ?? false,
      eval: parseEval(obj.eval as Record<string, unknown> | undefined),
    }
    return field
  }

  // base types
  const evalRaw = obj.eval as Record<string, unknown> | undefined
  const evalObj = parseEval(evalRaw)

  // ! shorthand on type string is already handled; here handle explicit required
  const field: IrBaseField = {
    type: obj.type as IrBaseField['type'],
    virtual: false,
    array: (obj.array as boolean) ?? false,
    maxLength: (obj.maxLength as number | null) ?? null,
    precision: (obj.precision as number | null) ?? null,
    scale: (obj.scale as number | null) ?? null,
    default: obj.default ?? null,
    unique: (obj.unique as boolean) ?? false,
    sequence: obj.sequence ? desugarSequence(obj.sequence as string) : null,
    computed: (obj.computed as string | null) ?? null,
    eval: evalObj,
  }
  return field
}

// ---------------------------------------------------------------------------
// Relations desugaring
// ---------------------------------------------------------------------------

function desugarRelations(raw: Record<string, unknown>): Record<string, IrRelation> {
  const result: Record<string, IrRelation> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      // hasMany: [EntityName]
      result[key] = { type: 'hasMany', target: value[0] as string }
    } else {
      // belongsTo: EntityName
      const target = value as string
      result[key] = { type: 'belongsTo', target, foreignKey: `${key}Id` }
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Index desugaring
// ---------------------------------------------------------------------------

function desugarIndexes(raw: Array<Record<string, unknown>>): IrIndex[] {
  return raw.map(idx => ({
    fields: idx.fields as string[],
    unique: (idx.unique as boolean) ?? false,
    name:   (idx.name as string) ?? (idx.fields as string[]).join('_'),
  }))
}

// ---------------------------------------------------------------------------
// Flow desugaring
// ---------------------------------------------------------------------------

function desugarValidations(raw: Array<Record<string, unknown>> | undefined): IrValidation[] {
  if (!raw) return []
  return raw.map(v => ({ rule: v.rule as string, message: (v.message as string | null) ?? null }))
}

function desugarGuard(raw: Record<string, unknown> | undefined | null): IrGuard | null {
  if (!raw) return null
  return {
    validations:   desugarValidations(raw.validations as Array<Record<string, unknown>> | undefined),
    requireParams: (raw.requireParams as string[]) ?? [],
  }
}

function desugarTransitions(raw: Array<Record<string, unknown>>): IrTransition[] {
  return raw.map(t => ({
    action: t.action as string,
    label:  (t.label as string | null) ?? null,
    from:   t.from as string[],
    to:     t.to as string,
    guard:  desugarGuard(t.guard as Record<string, unknown> | undefined | null),
  }))
}

function desugarWorkflow(raw: Record<string, unknown> | undefined): IrWorkflow | null {
  if (!raw) return null
  return {
    statusField: raw.statusField as string,
    initial:     raw.initial as string,
    terminal:    (raw.terminal as string[]) ?? [],
    transitions: desugarTransitions(raw.transitions as Array<Record<string, unknown>>),
  }
}

function desugarHooks(raw: Array<Record<string, unknown>> | undefined): IrHook[] {
  if (!raw) return []
  return raw.map(h => ({
    event:   h.event as string,
    type:    'webhook' as const,
    url:     h.url as string,
    method:  (h.method as IrHook['method']) ?? 'POST',
    async:   (h.async as boolean) ?? false,
    headers: (h.headers as Record<string, string>) ?? {},
    payload: (h.payload as Record<string, string>) ?? {},
    retry:   h.retry
      ? { attempts: (h.retry as any).attempts as number, backoff: (h.retry as any).backoff as 'fixed' | 'exponential' }
      : null,
  }))
}

// ---------------------------------------------------------------------------
// Views desugaring
// ---------------------------------------------------------------------------

function desugarDefaultSort(raw: string | undefined): IrDefaultSort | null {
  if (!raw) return null
  if (raw.startsWith('-')) {
    return { field: raw.slice(1), direction: 'DESC' }
  }
  return { field: raw, direction: 'ASC' }
}

function desugarListView(raw: Record<string, unknown> | undefined): IrListView | null {
  if (!raw) return null
  return {
    columns:     (raw.columns as string[]) ?? [],
    defaultSort: desugarDefaultSort(raw.defaultSort as string | undefined),
    filterBy:    (raw.filterBy as string[]) ?? [],
  }
}

function desugarLayout(raw: Array<Record<string, unknown>> | undefined): IrLayoutItem[] {
  if (!raw) return []
  return raw.map(item => {
    if (item.type === 'group') {
      return {
        type:   'group' as const,
        label:  (item.label as string | null) ?? null,
        fields: item.fields as string[],
      }
    }
    // tabs
    const children = (item.children as Array<Record<string, unknown>>).map(c => ({
      label:  c.label as string,
      fields: c.fields as string[],
    }))
    return { type: 'tabs' as const, children }
  })
}

function desugarDetailView(raw: Record<string, unknown> | undefined): IrDetailView | null {
  if (!raw) return null
  const actionsRaw = raw.actions as Record<string, unknown> | undefined
  return {
    actions: {
      placement: (actionsRaw?.placement as 'top' | 'bottom' | 'both') ?? 'top',
      include:   (actionsRaw?.include as string[] | null) ?? null,
    },
    layout: desugarLayout(raw.layout as Array<Record<string, unknown>> | undefined),
  }
}

function desugarViews(raw: Record<string, unknown> | undefined): IrViews {
  if (!raw) return { list: null, detail: null }
  return {
    list:   desugarListView(raw.list as Record<string, unknown> | undefined),
    detail: desugarDetailView(raw.detail as Record<string, unknown> | undefined),
  }
}

// ---------------------------------------------------------------------------
// Main desugar entry
// ---------------------------------------------------------------------------

export function desugar(merged: RawMerged): IrEntity {
  const { module, entityName, raw } = merged

  const fieldsRaw = (raw.fields as Record<string, unknown>) ?? {}
  const fields: Record<string, IrField> = {}
  for (const [key, value] of Object.entries(fieldsRaw)) {
    fields[key] = desugarField(key, value)
  }

  const relationsRaw = (raw.relations as Record<string, unknown>) ?? {}
  const relations = desugarRelations(relationsRaw)

  const indexesRaw = (raw.indexes as Array<Record<string, unknown>>) ?? []
  // Also generate indexes for field-level unique: true
  const fieldUniqueIndexes: IrIndex[] = Object.entries(fields)
    .filter(([, f]) => f.type !== 'lookup' && (f as IrBaseField | IrEnumField).unique)
    .map(([key]) => ({ fields: [key], unique: true, name: `uq_${key}` }))

  const indexes = [...desugarIndexes(indexesRaw), ...fieldUniqueIndexes]

  return {
    module,
    name:        entityName,
    label:       (raw.label as string | null) ?? null,
    fields,
    relations,
    indexes,
    validations: desugarValidations(raw.validations as Array<Record<string, unknown>> | undefined),
    workflow:    desugarWorkflow(raw.workflow as Record<string, unknown> | undefined),
    hooks:       desugarHooks(raw.hooks as Array<Record<string, unknown>> | undefined),
    views:       desugarViews(raw.views as Record<string, unknown> | undefined),
  }
}
