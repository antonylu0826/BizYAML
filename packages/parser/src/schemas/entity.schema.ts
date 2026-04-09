import { z } from 'zod'
import { EntityNameSchema } from './common.js'
import { FieldsSchema, RelationsSchema, IndexesSchema } from './field.schema.js'
import { ValidationsSchema, WorkflowSchema, HooksSchema } from './flow.schema.js'
import { ViewsSchema } from './views.schema.js'

// ---------------------------------------------------------------------------
// .entity.yaml root schema
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
// .flow.yaml root schema (re-exported, keeping entity.schema as unified entry point)
// ---------------------------------------------------------------------------

export { FlowFileSchema } from './flow.schema.js'
export type { FlowFile } from './flow.schema.js'

// ---------------------------------------------------------------------------
// .views.yaml root schema
// ---------------------------------------------------------------------------

export { ViewsFileSchema } from './views.schema.js'
export type { ViewsFile } from './views.schema.js'

// ---------------------------------------------------------------------------
// Single-file mode: all root nodes can be combined in one .entity.yaml
// ---------------------------------------------------------------------------

export const SingleFileSchema = z.object({
  name:        EntityNameSchema,
  label:       z.string().optional(),
  description: z.string().optional(),
  // entity layer
  fields:      FieldsSchema,
  relations:   RelationsSchema.optional(),
  indexes:     IndexesSchema.optional(),
  // flow layer
  validations: ValidationsSchema.optional(),
  workflow:    WorkflowSchema.optional(),
  hooks:       HooksSchema.optional(),
  // views layer
  views:       ViewsSchema.optional(),
})
export type SingleFile = z.infer<typeof SingleFileSchema>

// ---------------------------------------------------------------------------
// Universal YAML file schema: auto-determine which schema to apply
// Parser decides which one to use after Discovery phase, this union is for Linter "when extension is unknown"
// ---------------------------------------------------------------------------

export const AnyBizYamlFileSchema = z.union([
  SingleFileSchema,
  EntityFileSchema,
])
