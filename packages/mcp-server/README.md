# `@bizyaml/mcp-server`

The official **Model Context Protocol (MCP)** server for the [BizYAML](https://github.com/antonylu0826/BizYAML) ecosystem.

This package empowers your favorite AI IDEs (like Cursor and Claude Desktop) with native understanding of BizYAML architecture, enabling AI assistants to read the official BizYAML specification and strictly validate their own generated YAML configurations against the compiler before returning results to you.

## Quickstart

### Claude Desktop Integration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bizyaml": {
      "command": "npx",
      "args": ["-y", "@bizyaml/mcp-server"]
    }
  }
}
```

### Try it locally via Inspector

```bash
npx @modelcontextprotocol/inspector npx -y @bizyaml/mcp-server
```

## Features
- **Resources**: Exposes complete `bizyaml://docs/` to the connected LLM.
- **Tools**: Adds the `bizyaml_validate` tool, piping the AI's `.entity.yaml` creations directly into `@bizyaml/parser` semantics checker.
- **Prompts**: Provides pre-made scaffold personas (`bizyaml_scaffold`) to kickstart generation tasks.

For full documentation and rules, visit the [BizYAML Repository](https://github.com/antonylu0826/BizYAML).
