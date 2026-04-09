# `@bizyaml/cli`

The official Command Line Interface for the [BizYAML](https://github.com/antonylu0826/BizYAML) ecosystem.

## Usage

You can run the CLI directly using `npx`:

```bash
npx @bizyaml/cli validate ./my-bizyaml-project
```

### Commands

* `bizyaml validate <dir>`: Discover, merge, and semantically validate all `.entity.yaml`, `.flow.yaml`, and `.views.yaml` files inside the directory.
* `bizyaml compile <dir> [outDir]`: Validate and emit the compiled Intermediate Representation (IR) JSON files.

For full documentation and rules, visit the [BizYAML Repository](https://github.com/antonylu0826/BizYAML).
