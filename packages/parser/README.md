# `@bizyaml/parser`

The core AST Parser and Compiler for the [BizYAML](https://github.com/antonylu0826/BizYAML) ecosystem.

This zero-dependency package acts as the **Single Source of Truth** for BizYAML. It parses raw YAML files, merges modular configurations, desugars shorthands, performs rigorous cross-reference validations (Semantic AST Validation), and finally outputs strict Intermediate Representation (IR) JSON.

## Usage

```typescript
import { compile } from '@bizyaml/parser';

// Analyzes the directory, throwing precise errors if the YAML breaks specifications
const results = compile('./path/to/my-domain');

console.log(results); // Array of IrEntity
```

For full documentation and rules, visit the [BizYAML Repository](https://github.com/antonylu0826/BizYAML).
