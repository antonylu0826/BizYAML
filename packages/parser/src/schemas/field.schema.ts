import { z } from 'zod'
import { EvalValueSchema, EntityNameSchema, FieldShorthandSchema } from './common.js'

// ---------------------------------------------------------------------------
// eval 容器（欄位層級）
// ---------------------------------------------------------------------------

export const FieldEvalSchema = z.object({
  required: EvalValueSchema.optional(),
  hidden:   EvalValueSchema.optional(),
  readonly: EvalValueSchema.optional(),
})
export type FieldEval = z.infer<typeof FieldEvalSchema>

// ---------------------------------------------------------------------------
// enum options：支援簡寫陣列與值/標籤分離兩種形式
// ---------------------------------------------------------------------------

const EnumOptionSimpleSchema = z.string()
const EnumOptionFullSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
})
export const EnumOptionSchema = z.union([EnumOptionSimpleSchema, EnumOptionFullSchema])
export type EnumOption = z.infer<typeof EnumOptionSchema>

// ---------------------------------------------------------------------------
// 各欄位型別的完整物件形式
// ---------------------------------------------------------------------------

/** 基礎型別欄位（string, integer, decimal, boolean, date, datetime, json） */
const BaseFieldSchema = z.object({
  type:        z.enum(['string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'json']),
  description: z.string().optional(),
  default:     z.unknown().optional(),
  unique:      z.boolean().optional(),
  eval:        FieldEvalSchema.optional(),
  // string 專用
  maxLength: z.number().int().positive().optional(),
  // decimal 專用
  precision: z.number().int().positive().optional(),
  scale:     z.number().int().min(0).optional(),
  // 流水號
  sequence: z.string().optional(),
  // 計算欄位
  computed: z.string().optional(),
  // 陣列型別
  array: z.boolean().optional(),
})

/** enum 欄位 */
const EnumFieldSchema = z.object({
  type:        z.literal('enum'),
  description: z.string().optional(),
  options:     z.array(EnumOptionSchema).min(1),
  default:     z.union([z.string(), z.number()]).optional(),
  unique:      z.boolean().optional(),
  eval:        FieldEvalSchema.optional(),
})

/** lookup 虛擬查表欄位 */
const LookupFieldSchema = z.object({
  type:        z.literal('lookup'),
  description: z.string().optional(),
  relation:    z.string().min(1),
  field:       z.string().min(1),
})

/** 欄位完整物件形式（三種型別的聯集） */
export const FieldObjectSchema = z.union([
  BaseFieldSchema,
  EnumFieldSchema,
  LookupFieldSchema,
])
export type FieldObject = z.infer<typeof FieldObjectSchema>

/**
 * 單一欄位的宣告值：
 *   - 語法糖字串：`string(50)!`、`decimal(12,2)`、`boolean`、`string[]`
 *   - 完整物件形式
 */
export const FieldValueSchema = z.union([FieldShorthandSchema, FieldObjectSchema])
export type FieldValue = z.infer<typeof FieldValueSchema>

/** `fields` 節點：key 為欄位名，value 為欄位定義 */
export const FieldsSchema = z.record(z.string().min(1), FieldValueSchema)
export type Fields = z.infer<typeof FieldsSchema>

// ---------------------------------------------------------------------------
// relations 節點
// ---------------------------------------------------------------------------

/**
 * 單一關聯的宣告值：
 *   - `Supplier`          → belongsTo
 *   - `[PurchaseOrderItem]` → hasMany（YAML 中宣告為包含單一元素的陣列）
 */
export const RelationValueSchema = z.union([
  EntityNameSchema,                        // belongsTo：直接寫實體名稱
  z.tuple([EntityNameSchema]),             // hasMany：單元素陣列
])
export type RelationValue = z.infer<typeof RelationValueSchema>

/** `relations` 節點：key 為關聯名，value 為關聯目標 */
export const RelationsSchema = z.record(z.string().min(1), RelationValueSchema)
export type Relations = z.infer<typeof RelationsSchema>

// ---------------------------------------------------------------------------
// indexes 節點
// ---------------------------------------------------------------------------

export const IndexSchema = z.object({
  fields: z.array(z.string().min(1)).min(1),
  unique: z.boolean().optional(),
  name:   z.string().optional(),
})
export type Index = z.infer<typeof IndexSchema>

export const IndexesSchema = z.array(IndexSchema)
