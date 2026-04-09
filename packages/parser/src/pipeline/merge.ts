import { readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { EntityGroup } from './discovery.js'
import { EntityFileSchema, FlowFileSchema, ViewsFileSchema, SingleFileSchema } from '../schemas/entity.schema.js'
import { ZodError } from 'zod'

export type RawMerged = {
  module:     string
  entityName: string
  // all keys from three files merged, validated by their respective schemas
  raw:        Record<string, unknown>
}

function loadYaml(path: string): Record<string, unknown> {
  const content = readFileSync(path, 'utf-8')
  const parsed = parseYaml(content)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`[Merge] File is not a YAML object: ${path}`)
  }
  return parsed as Record<string, unknown>
}

function formatZodError(err: ZodError, filePath: string): string {
  const issues = err.issues.map(i => {
    const path = i.path.length > 0 ? ` [${i.path.join('.')}]` : ''
    return `${path} ${i.message}`
  }).join('; ')
  return `[Schema] ${filePath}: ${issues}`
}

function assertNamesMatch(
  name: string,
  expected: string,
  filePath: string,
) {
  if (name !== expected) {
    throw new Error(
      `[Merge] "name" mismatch in ${filePath}: ` +
      `expected "${expected}" (from filename), got "${name}"`
    )
  }
}

/**
 * Parse and merge all files in an EntityGroup into a single raw object.
 * Each file is validated against its own Zod schema first.
 */
export function merge(group: EntityGroup): RawMerged {
  const { module, entityName, files } = group

  // Single-file mode: only entity file, may contain all keys
  if (!files.flow && !files.views) {
    const raw = loadYaml(files.entity!)
    const result = SingleFileSchema.safeParse(raw)
    if (!result.success) {
      throw new Error(formatZodError(result.error, files.entity!))
    }
    return { module, entityName, raw: result.data as Record<string, unknown> }
  }

  // Split-file mode: validate each file against its owned schema, then merge
  const entityRaw = loadYaml(files.entity!)
  const entityResult = EntityFileSchema.safeParse(entityRaw)
  if (!entityResult.success) {
    throw new Error(formatZodError(entityResult.error, files.entity!))
  }
  assertNamesMatch(entityResult.data.name, entityName, files.entity!)

  let merged: Record<string, unknown> = { ...entityResult.data }

  if (files.flow) {
    const flowRaw = loadYaml(files.flow)
    const flowResult = FlowFileSchema.safeParse(flowRaw)
    if (!flowResult.success) {
      throw new Error(formatZodError(flowResult.error, files.flow))
    }
    assertNamesMatch(flowResult.data.name, entityName, files.flow)
    // Merge flow-owned keys
    const { validations, workflow, hooks } = flowResult.data
    if (validations) merged.validations = validations
    if (workflow)    merged.workflow    = workflow
    if (hooks)       merged.hooks       = hooks
  }

  if (files.views) {
    const viewsRaw = loadYaml(files.views)
    const viewsResult = ViewsFileSchema.safeParse(viewsRaw)
    if (!viewsResult.success) {
      throw new Error(formatZodError(viewsResult.error, files.views))
    }
    assertNamesMatch(viewsResult.data.name, entityName, files.views)
    merged.views = viewsResult.data.views
  }

  return { module, entityName, raw: merged }
}
