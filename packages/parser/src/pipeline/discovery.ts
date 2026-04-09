import { readdirSync, statSync } from 'fs'
import { join, relative, basename, extname } from 'path'

export type FileRole = 'entity' | 'flow' | 'views'

export type DiscoveredFile = {
  absolutePath: string
  role:         FileRole
}

export type EntityGroup = {
  /** e.g. "Procurement" */
  module: string
  /** e.g. "PurchaseOrder" */
  entityName: string
  files: Partial<Record<FileRole, string>>  // role -> absolutePath
}

const SUFFIX_TO_ROLE: Record<string, FileRole> = {
  '.entity.yaml': 'entity',
  '.flow.yaml':   'flow',
  '.views.yaml':  'views',
}

function getRoleFromFilename(filename: string): FileRole | null {
  for (const [suffix, role] of Object.entries(SUFFIX_TO_ROLE)) {
    if (filename.endsWith(suffix)) return role
  }
  return null
}

function getEntityName(filename: string): string | null {
  for (const suffix of Object.keys(SUFFIX_TO_ROLE)) {
    if (filename.endsWith(suffix)) {
      return filename.slice(0, -suffix.length)
    }
  }
  return null
}

function getModuleName(rootDir: string, fileDir: string): string {
  const rel = relative(rootDir, fileDir)
  // root-level files have no module folder -> use empty string or a convention
  return rel === '' ? '' : rel.replace(/\\/g, '/')
}

/**
 * Recursively scan rootDir for BizYAML files.
 * Groups them by (module, entityName) and returns EntityGroup[].
 */
export function discover(rootDir: string): EntityGroup[] {
  const groupMap = new Map<string, EntityGroup>()

  function walk(dir: string) {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        walk(fullPath)
        continue
      }

      const role = getRoleFromFilename(entry)
      if (!role) continue

      const entityName = getEntityName(entry)!
      const module = getModuleName(rootDir, dir)
      const key = `${module}::${entityName}`

      if (!groupMap.has(key)) {
        groupMap.set(key, { module, entityName, files: {} })
      }
      groupMap.get(key)!.files[role] = fullPath
    }
  }

  walk(rootDir)

  // validate: every group must have at least an entity file
  const groups: EntityGroup[] = []
  for (const [key, group] of groupMap) {
    if (!group.files.entity) {
      throw new Error(
        `[Discovery] No .entity.yaml found for "${key}". ` +
        `A .flow.yaml or .views.yaml without a matching .entity.yaml is invalid.`
      )
    }
    groups.push(group)
  }

  return groups
}
