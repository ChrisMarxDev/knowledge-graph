---
title: Getting started
description: Install kw, initialize a local collection, and create a connected document.
---

## Install the CLI

On macOS, run this single command (requires Git, Node.js **22.12+**, and npm):

```sh
curl -fsSL https://raw.githubusercontent.com/ChrisMarxDev/knowledge-graph/HEAD/install.sh | sh
```

The script installs kw and configures your shell automatically. Open a new
terminal if prompted. Run the same command again to update; restart any running
`kw view` servers afterward. You can check the installed version with `kw --version`.

## Give your agent the usage skill

From your project directory:

```sh
kw skill install
```

This copies the bundled skill into `skills/use-kw` at the Git repository root.
Point your agent's instructions or skill configuration at that file. The command
copies files; it does not configure agent-specific discovery.

Use `kw skill install --force` to update differing bundled skill files after
updating kw. `--dry-run` previews changes. Additional local files are retained.

## Initialize knowledge

For a new, empty collection:

```sh
kw init
```

This creates `.knowledge/config.yaml`, `knowledge/meta.yaml`, and
`knowledge/nodes/`. It refuses to overwrite an existing setup. It does not import
existing documentation automatically.

For an existing project, your agent can inspect its Markdown and design files,
propose a scope, and populate the collection while preserving source documents.
The usage skill describes that workflow.

## Create a document

```sh
kw create knowledge/nodes/project.md --title "Project overview"
```

The document starts with these fields and a title heading:

```yaml
---
id: GENERATED_UUID
title: Project overview
type: ""
description: ""
dimensions: {}
links: []
files: []
sources: []
---
```

Write the body and fill in useful metadata directly. Declare any types, dimension
names, and relationship names you choose in `knowledge/meta.yaml`; there is no
required ontology.

## Read and explore

```sh
kw query --fields id,title,description
kw read knowledge/nodes/project.md
kw doctor
kw view
```

`view` opens your browser. To use a different port, run `kw view --port 4400`.
Use `kw --project /path/to/project ...` when running commands from elsewhere.

Next: [CLI workflows](/knowledge-graph/guides/workflows/) or the
[complete CLI reference](/knowledge-graph/reference/cli/).
