import { z } from 'zod'
import { EvalValueSchema, EntityNameSchema, FieldShorthandSchema } from './common.js'

// ---------------------------------------------------------------------------
// eval container (field level)
// ---------------------------------------------------------------------------

export const FieldEvalSchema = z.object({
  required: EvalValueSchema.optional(),
  hidden:   EvalValueSchema.optional(),
  readonly: EvalValueSchema.optional(),
})
export type FieldEval = z.infer<typeof FieldEvalSchema>

// ---------------------------------------------------------------------------
// enum options: supports shorthand array and separated value/label formats
// ---------------------------------------------------------------------------

const EnumOptionSimpleSchema = z.string()
const EnumOptionFullSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
})
export const EnumOptionSchema = z.union([EnumOptionSimpleSchema, EnumOptionFullSchema])
export type EnumOption = z.infer<typeof EnumOptionSchema>

// ---------------------------------------------------------------------------
// Complete object format for each field type
// ---------------------------------------------------------------------------

/** Base type field (string, integer, decimal, boolean, date, datetime, json) */
const BaseFieldSchema = z.object({
  type:        z.enum(['string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'json']),
  description: z.string().optional(),
  default:     z.unknown().optional(),
  unique:      z.boolean().optional(),
  eval:        FieldEvalSchema.optional(),
  // specific to string
  maxLength: z.number().int().positive().optional(),
  // specific to decimal
  precision: z.number().int().positive().optional(),
  scale:     z.number().int().min(0).optional(),
  // Auto-increment sequence
  sequence: z.string().optional(),
  // Computed field
  computed: z.string().optional(),
  // Array type
  array: z.boolean().optional(),
})

/** enum field */
const EnumFieldSchema = z.object({
  type:        z.literal('enum'),
  description: z.string().optional(),
  options:     z.array(EnumOptionSchema).min(1),
  default:     z.union([z.string(), z.number()]).optional(),
  unique:      z.boolean().optional(),
  eval:        FieldEvalSchema.optional(),
})

/** lookup virtual table field */
const LookupFieldSchema = z.object({
  type:        z.literal('lookup'),
  description: z.string().optional(),
  relation:    z.string().min(1),
  field:       z.string().min(1),
})

/** Field complete object format (union of three types) */
export const FieldObjectSchema = z.union([
  BaseFieldSchema,
  EnumFieldSchema,
  LookupFieldSchema,
])
export type FieldObject = z.infer<typeof FieldObjectSchema>

/**
 * Declaration value of a single field:
 *   - Shorthand string: `string(50)!`, `decimal(12,2)`, `boolean`, `string[]`
 *   - Complete object format
 */
export const FieldValueSchema = z.union([FieldShorthandSchema, FieldObjectSchema])
export type FieldValue = z.infer<typeof FieldValueSchema>

/** `fields` node: key is field name, value is field definition */
export const FieldsSchema = z.record(z.string().min(1), FieldValueSchema)
export type Fields = z.infer<typeof FieldsSchema>

// ---------------------------------------------------------------------------
// relations node
// ---------------------------------------------------------------------------

/**
 * Declaration value of a single relation:
 *   - `Supplier`          -> belongsTo
 *   - `[PurchaseOrderItem]` -> hasMany (declared as single-element array in YAML)
 */
export const RelationValueSchema = z.union([
  EntityNameSchema,                        // belongsTo: direct entity name
  z.tuple([EntityNameSchema]),             // hasMany: single-element array
])
export type RelationValue = z.infer<typeof RelationValueSchema>

/** `relations` node: key is relation name, value is relation target */
export const RelationsSchema = z.record(z.string().min(1), RelationValueSchema)
export type Relations = z.infer<typeof RelationsSchema>

// ---------------------------------------------------------------------------
// indexes node
// ---------------------------------------------------------------------------

export const IndexSchema = z.object({
  fields: z.array(z.string().min(1)).min(1),
  unique: z.boolean().optional(),
  name:   z.string().optional(),
})
export type Index = z.infer<typeof IndexSchema>

export const IndexesSchema = z.array(IndexSchema)
