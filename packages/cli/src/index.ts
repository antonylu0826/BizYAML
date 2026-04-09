import { cac } from 'cac'
import { resolve, join } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { compile } from '@bizyaml/parser'
import pc from 'picocolors'

const cli = cac('bizyaml')

cli
  .command('compile <dir>', 'Compile a directory of BizYAML files into IR JSON')
  .option('-o, --out <dir>', 'Output directory (default: <dir>/.bizyaml)')
  .option('--pretty', 'Pretty-print JSON output', { default: true })
  .action((dir: string, options: { out?: string; pretty: boolean }) => {
    const rootDir = resolve(dir)
    const outDir = options.out ? resolve(options.out) : join(rootDir, '.bizyaml')

    console.log(pc.cyan(`Compiling: ${rootDir}`))

    let entities
    try {
      entities = compile(rootDir)
    } catch (err) {
      console.error(pc.red((err as Error).message))
      process.exit(1)
    }

    mkdirSync(outDir, { recursive: true })

    for (const entity of entities) {
      const filename = entity.module
        ? `${entity.module}.${entity.name}.json`
        : `${entity.name}.json`
      const outPath = join(outDir, filename)
      const json = options.pretty
        ? JSON.stringify(entity, null, 2)
        : JSON.stringify(entity)
      writeFileSync(outPath, json, 'utf-8')
      console.log(`  ${pc.green('✓')} ${pc.dim(filename)}`)
    }

    console.log(`\n${pc.bold(entities.length)} entity/entities compiled → ${pc.dim(outDir)}`)
  })

cli
  .command('validate <dir>', 'Validate BizYAML files without emitting output')
  .action((dir: string) => {
    const rootDir = resolve(dir)
    console.log(pc.cyan(`Validating: ${rootDir}`))

    try {
      const entities = compile(rootDir)
      console.log(`${pc.green('✓')} ${pc.bold(entities.length)} entity/entities valid`)
    } catch (err) {
      // Split multi-line errors (from compile) and print them cleanly
      const lines = (err as Error).message.split('\n')
      for (const line of lines) {
        console.error(`${pc.red('✗')} ${line}`)
      }
      process.exit(1)
    }
  })

cli.help()
cli.version('1.0.1')
cli.parse()
