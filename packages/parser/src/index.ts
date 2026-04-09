// Schemas (Zod)
export * from './schemas/common.js'
export * from './schemas/field.schema.js'
export * from './schemas/flow.schema.js'
export * from './schemas/views.schema.js'
export * from './schemas/entity.schema.js'

// IR types
export * from './types/ir.js'

// Pipeline
export { discover } from './pipeline/discovery.js'
export type { EntityGroup, DiscoveredFile, FileRole } from './pipeline/discovery.js'
export { merge } from './pipeline/merge.js'
export type { RawMerged } from './pipeline/merge.js'
export { desugar } from './pipeline/desugar.js'
export { compile } from './pipeline/compile.js'
