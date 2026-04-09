#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  ListResourcesRequestSchema, 
  ReadResourceRequestSchema, 
  ListPromptsRequestSchema, 
  GetPromptRequestSchema 
} from '@modelcontextprotocol/sdk/types.js'
import { compile } from '@bizyaml/parser'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const docsDir = path.join(__dirname, 'docs')

// Setup MCP Server
const server = new Server({
  name: 'bizyaml-mcp-server',
  version: '1.0.0'
}, {
  capabilities: {
    resources: {},
    tools: {},
    prompts: {}
  }
})

// -------------------------------------------------------------------------
// 1. Resources: Provide BizYAML Docs
// -------------------------------------------------------------------------
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  if (!fs.existsSync(docsDir)) {
    return { resources: [] }
  }
  
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'))
  const resources = files.map(file => ({
    uri: `bizyaml://docs/${file}`,
    name: `BizYAML Specification: ${file}`,
    mimeType: 'text/markdown',
    description: `Official documentation and specification rules for ${file}`
  }))
  
  return { resources }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri
  if (uri.startsWith('bizyaml://docs/')) {
    const filename = uri.replace('bizyaml://docs/', '')
    const filepath = path.join(docsDir, filename)
    
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8')
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: 'text/markdown',
          text: content
        }]
      }
    }
  }
  
  throw new Error(`Resource non-existent: ${uri}`)
})

// -------------------------------------------------------------------------
// 2. Tools: Validation
// -------------------------------------------------------------------------
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'bizyaml_validate',
        description: 'Compiles and semantically validates BizYAML definitions. Pass in the raw yaml contents to instantly see if your proposed structure is valid against the BizYAML parser rules.',
        inputSchema: {
          type: 'object',
          properties: {
            entityYaml: { type: 'string', description: 'Contents of the .entity.yaml file' },
            flowYaml: { type: 'string', description: 'Contents of the .flow.yaml file' },
            viewsYaml: { type: 'string', description: 'Contents of the .views.yaml file' }
          },
          required: ['entityYaml']
        }
      }
    ]
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'bizyaml_validate') {
    const { entityYaml, flowYaml, viewsYaml } = request.params.arguments as any
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bizyaml-mcp-'))
    
    try {
      if (entityYaml) fs.writeFileSync(path.join(tmpDir, 'Model.entity.yaml'), entityYaml)
      if (flowYaml) fs.writeFileSync(path.join(tmpDir, 'Model.flow.yaml'), flowYaml)
      if (viewsYaml) fs.writeFileSync(path.join(tmpDir, 'Model.views.yaml'), viewsYaml)
      
      const ir = compile(tmpDir)
      return {
        content: [{
          type: 'text',
          text: `✅ Success! The BizYAML code is perfectly valid. Generates ${ir.length} entity model(s).`
        }]
      }
    } catch (e: any) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `❌ BizYAML Parser Error:\n\n${e.message}\n\nPlease revise your YAML according to the specifications.`
        }]
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }
  
  throw new Error(`Tool not found: ${request.params.name}`)
})

// -------------------------------------------------------------------------
// 3. Prompts: Standard Workflow
// -------------------------------------------------------------------------
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'bizyaml_scaffold',
        description: 'Initialize a prompt to create a new BizYAML entity setup based on user requirements',
        arguments: [
          { name: 'requirement', description: 'Business requirements for the new entity', required: true }
        ]
      }
    ]
  }
})

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === 'bizyaml_scaffold') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an expert BizYAML Architect. Provide the complete BizYAML code (.entity.yaml, .flow.yaml, .views.yaml) for the following requirement: "${request.params.arguments?.requirement}". 

Rules: 
1. Use the read_resource tool to study bizyaml://docs/02_Data_Modeling.md and bizyaml://docs/05_Reserved_Words.md if you are unsure of the syntax.
2. After writing the YAML blocks, ALWAYS use the bizyaml_validate tool to verify your yaml contents before concluding your response. If it fails, fix the errors and try again.
3. Only use the approved BizYAML operators and reserved keywords.`
          }
        }
      ]
    }
  }
  
  throw new Error(`Prompt not found: ${request.params.name}`)
})

// Start Server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[BizYAML MCP Server] Running on stdio')
}

main().catch((err) => {
  console.error("Fatal Error", err)
  process.exit(1)
})
