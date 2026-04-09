# `@bizyaml/schema`

Auto-generated JSON Schemas for the [BizYAML](https://github.com/antonylu0826/BizYAML) ecosystem.

These schemas are programmatically derived from the `@bizyaml/parser` Zod definitions. They are used to grant IDEs (like VSCode) the ability to provide intellisense (autocomplete) and structural pre-validation before the compiler even kicks in.

## Usage (VSCode)

In your `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "node_modules/@bizyaml/schema/dist/bizyaml-entity.json": ["*.entity.yaml"],
    "node_modules/@bizyaml/schema/dist/bizyaml-flow.json": ["*.flow.yaml"],
    "node_modules/@bizyaml/schema/dist/bizyaml-views.json": ["*.views.yaml"]
  }
}
```

For full documentation and rules, visit the [BizYAML Repository](https://github.com/antonylu0826/BizYAML).
