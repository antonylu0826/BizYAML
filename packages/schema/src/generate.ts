import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { SingleFileSchema, EntityFileSchema, FlowFileSchema, ViewsFileSchema } from '@bizyaml/parser'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'dist')

mkdirSync(outDir, { recursive: true })

const schemas = [
  { name: 'bizyaml-single',  schema: SingleFileSchema,  description: 'BizYAML 單檔模式（所有根節點合併）' },
  { name: 'bizyaml-entity',  schema: EntityFileSchema,  description: 'BizYAML .entity.yaml schema' },
  { name: 'bizyaml-flow',    schema: FlowFileSchema,    description: 'BizYAML .flow.yaml schema' },
  { name: 'bizyaml-views',   schema: ViewsFileSchema,   description: 'BizYAML .views.yaml schema' },
]

for (const { name, schema, description } of schemas) {
  const jsonSchema = zodToJsonSchema(schema, {
    name,
    $refStrategy: 'none',
  })

  const output = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: name,
    description,
    ...jsonSchema,
  }

  const outPath = join(outDir, `${name}.json`)
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`✓ Generated ${outPath}`)
}

console.log('\nAll JSON Schemas generated successfully.')
