import { IrEntity, IrBaseField, IrEnumField } from '../types/ir.js'
import { desugar } from './desugar.js'
import { merge } from './merge.js'
import { discover } from './discovery.js'

// ---------------------------------------------------------------------------
// Semantic validation
// ---------------------------------------------------------------------------

type CompileError = { entity: string; message: string }

function validateWorkflow(entity: IrEntity): CompileError[] {
  const errors: CompileError[] = []
  const { workflow, fields, name } = entity
  if (!workflow) return errors

  const statusField = fields[workflow.statusField]
  if (!statusField) {
    errors.push({ entity: name, message: `workflow.statusField "${workflow.statusField}" does not exist in fields` })
    return errors
  }
  if (statusField.type !== 'enum') {
    errors.push({ entity: name, message: `workflow.statusField "${workflow.statusField}" must be type: enum` })
    return errors
  }

  const validStates = new Set((statusField as IrEnumField).options.map(o => String(o.value)))
  const checkState = (state: string, location: string) => {
    if (!validStates.has(state)) {
      errors.push({ entity: name, message: `${location} state "${state}" is not in enum options [${[...validStates].join(', ')}]` })
    }
  }

  checkState(workflow.initial, 'workflow.initial')
  for (const terminal of workflow.terminal) {
    checkState(terminal, 'workflow.terminal')
  }
  for (const t of workflow.transitions) {
    for (const from of t.from) {
      checkState(from, `transitions[${t.action}].from`)
    }
    checkState(t.to, `transitions[${t.action}].to`)
  }

  // check for duplicate action names
  const actionNames = workflow.transitions.map(t => t.action)
  const seen = new Set<string>()
  for (const action of actionNames) {
    if (seen.has(action)) {
      errors.push({ entity: name, message: `Duplicate transition action name "${action}"` })
    }
    seen.add(action)
  }

  return errors
}

function validateLookups(entity: IrEntity): CompileError[] {
  const errors: CompileError[] = []
  for (const [key, field] of Object.entries(entity.fields)) {
    if (field.type !== 'lookup') continue
    if (!entity.relations[field.relation]) {
      errors.push({
        entity: entity.name,
        message: `fields.${key}: lookup.relation "${field.relation}" does not exist in relations`,
      })
    }
  }
  return errors
}

function validateExpressions(entity: IrEntity): CompileError[] {
  const errors: CompileError[] = []
  // Valid identifiers = field names + relation keys (count/sum take relation keys as args)
  const fieldNames = new Set([
    ...Object.keys(entity.fields),
    ...Object.keys(entity.relations),
  ])
  const BUILTIN_FNS = new Set(['count', 'sum', 'length', 'now', 'today'])

  // Simple identifier extraction: tokenize expression and check identifiers
  function checkExpr(expr: string, location: string) {
    // Strip string literals, numbers, operators, brackets, function calls
    const tokens = expr
      .replace(/'[^']*'/g, '')            // remove string literals
      .replace(/\d+(\.\d+)?/g, '')        // remove numbers
      .replace(/==|!=|>=|<=|>|<|&&|\|\||not\s+in\b|in\b|!|\+|-|\*|\//g, ' ')
      .replace(/[\[\]()',\s]+/g, ' ')
      .split(' ')
      .filter(t => t.length > 0 && !/^(true|false|null)$/.test(t))

    for (const token of tokens) {
      if (!fieldNames.has(token) && !BUILTIN_FNS.has(token)) {
        errors.push({ entity: entity.name, message: `${location}: unknown identifier "${token}" in expression "${expr}"` })
      }
    }
  }

  // Check computed fields
  for (const [key, field] of Object.entries(entity.fields)) {
    if (field.type === 'lookup') continue
    const f = field as IrBaseField | IrEnumField
    if ('computed' in f && f.computed) checkExpr(f.computed, `fields.${key}.computed`)
    if ('eval' in f) {
      for (const [prop, val] of Object.entries(f.eval)) {
        if (typeof val === 'string') checkExpr(val, `fields.${key}.eval.${prop}`)
      }
    }
  }

  // Check root validations
  for (const [i, v] of entity.validations.entries()) {
    checkExpr(v.rule, `validations[${i}].rule`)
  }

  // Check guard validations
  if (entity.workflow) {
    for (const t of entity.workflow.transitions) {
      if (!t.guard) continue
      for (const [i, v] of t.guard.validations.entries()) {
        checkExpr(v.rule, `transitions[${t.action}].guard.validations[${i}].rule`)
      }
    }
  }

  return errors
}

function validateReservedWords(entity: IrEntity): CompileError[] {
  const errors: CompileError[] = []
  const ROOT_RESERVED = new Set([
    'name', 'label', 'fields', 'relations', 'indexes',
    'validations', 'workflow', 'hooks', 'views',
  ])
  const FIELD_RESERVED = new Set([
    'type', 'computed', 'sequence', 'options', 'default',
    'unique', 'eval', 'relation', 'field', 'array',
  ])

  for (const key of Object.keys(entity.fields)) {
    if (ROOT_RESERVED.has(key)) {
      errors.push({ entity: entity.name, message: `fields key "${key}" conflicts with a root reserved word` })
    }
    if (FIELD_RESERVED.has(key)) {
      errors.push({ entity: entity.name, message: `fields key "${key}" conflicts with a field-level reserved word` })
    }
  }

  for (const key of Object.keys(entity.relations)) {
    if (ROOT_RESERVED.has(key)) {
      errors.push({ entity: entity.name, message: `relations key "${key}" conflicts with a root reserved word` })
    }
  }

  return errors
}

function semanticValidate(entity: IrEntity): void {
  const errors = [
    ...validateWorkflow(entity),
    ...validateLookups(entity),
    ...validateExpressions(entity),
    ...validateReservedWords(entity),
  ]

  if (errors.length > 0) {
    const msg = errors.map(e => `  [${e.entity}] ${e.message}`).join('\n')
    throw new Error(`[Compile] Semantic validation failed:\n${msg}`)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile a single directory of BizYAML files into IR entities.
 */
export function compile(rootDir: string): IrEntity[] {
  const groups = discover(rootDir)
  const entities: IrEntity[] = []

  for (const group of groups) {
    const merged = merge(group)
    const ir = desugar(merged)
    semanticValidate(ir)
    entities.push(ir)
  }

  return entities
}
