import { defineConfig } from 'tsup'
import { cpSync } from 'fs'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  target: 'node18',
  onSuccess: async () => {
    // Copy the docs directory into dist so it's packaged with the NPM module
    cpSync('../../docs', 'dist/docs', { recursive: true })
    console.log('✓ Copied docs to dist/docs/')
  }
})
