import { z } from 'zod'

/**
 * Expression string used in eval.*, validations.rule, computed, etc.
 * Only type-tagged here; semantic validation is handled in the Parser phase.
 */
export const ExprSchema = z.string().min(1)
export type Expr = z.infer<typeof ExprSchema>

/**
 * Valid base type names for fields.
 */
export const BASE_TYPES = [
  'string',
  'integer',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'json',
  'enum',
  'lookup',
] as const
export const BaseTypeSchema = z.enum(BASE_TYPES)
export type BaseType = z.infer<typeof BaseTypeSchema>

/**
 * Regex for field type shorthand syntax.
 * Valid examples: string, string!, string(50), string(50)!,
 *   decimal, decimal(12,2), boolean, integer, date, datetime, json,
 *   string[], string[]!
 */
export const FIELD_SHORTHAND_REGEX =
  /^(string(\(\d+\))?|integer|decimal(\(\d+,\d+\))?|boolean|date|datetime|json)(\[\])?(!)$/

/**
 * Zod schema for field type shorthand (loose form).
 * The Desugar phase expands these into full object form.
 */
export const FieldShorthandSchema = z.string().regex(
  /^(string(\(\d+\))?|integer|decimal(\(\d+,\d+\))?|boolean|date|datetime|json)(\[\])?(!)?$/,
  'Invalid field type shorthand. Example: string, string(50)!, decimal(12,2), boolean, string[]',
)

/**
 * Condition value for eval / guard: accepts a boolean literal or expression string.
 */
export const EvalValueSchema = z.union([z.boolean(), ExprSchema])
export type EvalValue = z.infer<typeof EvalValueSchema>

/**
 * Entity name: must be PascalCase (e.g. PurchaseOrder).
 */
export const EntityNameSchema = z.string().regex(
  /^[A-Z][a-zA-Z0-9]*$/,
  'Entity name must be PascalCase, e.g. PurchaseOrder',
)
