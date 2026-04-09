import { z } from 'zod'
import { EntityNameSchema } from './common.js'
import { FieldsSchema, RelationsSchema, IndexesSchema } from './field.schema.js'
import { ValidationsSchema, WorkflowSchema, HooksSchema } from './flow.schema.js'
import { ViewsSchema } from './views.schema.js'

// ---------------------------------------------------------------------------
// .entity.yaml 根 schema
// ---------------------------------------------------------------------------

export const EntityFileSchema = z.object({
  name:        EntityNameSchema,
  label:       z.string().optional(),
  description: z.string().optional(),
  fields:      FieldsSchema,
  relations:   RelationsSchema.optional(),
  indexes:     IndexesSchema.optional(),
})
export type EntityFile = z.infer<typeof EntityFileSchema>

// ---------------------------------------------------------------------------
// .flow.yaml 根 schema（重新匯出，保持 entity.schema 作為統一入口）
// ---------------------------------------------------------------------------

export { FlowFileSchema } from './flow.schema.js'
export type { FlowFile } from './flow.schema.js'

// ---------------------------------------------------------------------------
// .views.yaml 根 schema
// ---------------------------------------------------------------------------

export { ViewsFileSchema } from './views.schema.js'
export type { ViewsFile } from './views.schema.js'

// ---------------------------------------------------------------------------
// 單檔模式（Single-file）：所有根節點可合併在一個 .entity.yaml 中
// ---------------------------------------------------------------------------

export const SingleFileSchema = z.object({
  name:        EntityNameSchema,
  label:       z.string().optional(),
  description: z.string().optional(),
  // entity 層
  fields:      FieldsSchema,
  relations:   RelationsSchema.optional(),
  indexes:     IndexesSchema.optional(),
  // flow 層
  validations: ValidationsSchema.optional(),
  workflow:    WorkflowSchema.optional(),
  hooks:       HooksSchema.optional(),
  // views 層
  views:       ViewsSchema.optional(),
})
export type SingleFile = z.infer<typeof SingleFileSchema>

// ---------------------------------------------------------------------------
// 通用 YAML 文件 schema：自動判斷應套用哪個 schema
// 解析器在 Discovery 階段後決定要用哪個，此聯集供 Linter 的「不知道副檔名時」使用
// ---------------------------------------------------------------------------

export const AnyBizYamlFileSchema = z.union([
  SingleFileSchema,
  EntityFileSchema,
])
