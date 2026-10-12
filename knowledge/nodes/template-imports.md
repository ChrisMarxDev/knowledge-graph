---
id: 49ff8319-e7b9-4a81-890a-ce6ddec24c9b
title: Optional templates and Git knowledge imports
type: concept
description: "Preview and copy vocabulary, knowledge nodes, and skills from
  local or pinned Git sources."
dimensions:
  feature:
    - schema
    - tooling
  component:
    - cli
    - files
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: f9f23b8e-cb57-4286-98ed-1424828f5477
files:
  - src/templates.ts
  - src/git-source.ts
sources:
  - kind: file
    target: skills/use-kw/references/schema-templates.md
---

# Optional templates and Git knowledge imports

## Supported behavior

kw template list/show/apply inspects and installs optional bundles. Sources can be bundled names, local templates, plain knowledge folders, Git repositories, or GitHub folder URLs. Apply requires an initialized collection, previews by default, and writes only with --apply; --dry-run overrides it. Git imports report a resolved commit; pin --ref to reproduce an inspected version.

Vocabulary names merge only when absent or structurally identical. Existing files must be byte-identical, and duplicate node IDs or other conflicts prevent all planned writes. Nodes retain IDs and authored links; complete skill folders are copied without installing hooks or changing agent setup. Reapplying identical content is a no-op, not an upgrade mechanism.

## Boundaries

Imports are copies, not live synchronization. Source file references are preserved and resolve against the destination, so run doctor after import. Knowledge folders require meta.yaml and nodes/; this does not convert arbitrary Markdown. Git fetching reads committed state, executes no imported scripts, and removes temporary checkouts. The bundled coding template has its own vocabulary; it does not define this project's taxonomy.
