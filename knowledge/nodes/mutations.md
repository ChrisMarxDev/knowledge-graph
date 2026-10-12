---
id: a13ffb89-5455-41de-b0dc-b6fb8c0097d3
title: Predictable edits and conservative repairs
type: constraint
description: Preserve unrelated authored content and only automate unambiguous repairs.
dimensions:
  area:
    - core
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: governed_by
    target: 77f2fba5-7c18-4abc-8a56-51062e13f8de
files:
  - src/core.ts
  - src/cli.ts
sources:
  - kind: file
    target: README.md
  - kind: file
    target: skills/use-kw/references/cli.md
---

# Predictable edits and conservative repairs

## Mutations
CLI metadata edits preserve Markdown bodies and unrelated top-level YAML pairs; changed fields may be reformatted. Writes use temporary replacement, cooperating locks, and content-change checks. External editors can still race the last check. Flow-style frontmatter editing is unsupported.

Create and rename refuse overwrites and stay inside configured roots. Preserve existing IDs and reread after lock or changed-file errors.

## Diagnostics
Doctor reports structural, reference, vocabulary, and advisory schema findings. Exit 1 means findings including warnings; exit 2 means usage or operational errors. Other readable files remain available despite parse errors.

fix previews by default. fix --safe only assigns missing IDs and wraps scalar dimension strings in lists. It does not infer classifications, resolve ambiguous links, delete knowledge, or satisfy schemas. meta sync --apply explicitly registers vocabulary. Dry-run takes precedence over apply flags.
