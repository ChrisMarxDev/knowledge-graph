---
id: e6e2c384-c78e-4be1-a71b-7db18333a74e
title: Keep public behavior and usage guidance synchronized
type: rule
description: "Public changes must update the repository usage skill, relevant
  references, and matching README guidance."
dimensions:
  feature:
    - tooling
    - authoring
  component:
    - cli
    - api
    - ui
    - files
  status:
    - accepted
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
files: []
sources:
  - kind: file
    target: AGENTS.md
---

# Keep public behavior and usage guidance synchronized

## Requirement

Every public CLI/API behavior change must update skills/use-kw/SKILL.md and relevant references in the same change. This includes configuration, filters, output, identity/link semantics, diagnostics, repairs, and storage behavior. Check actual implementation and command help; do not publish planned features as available.

Verify affected examples against temporary collections for write examples, preserving demo data. Update README where the same behavior is described; it does not replace the usage-skill update. Internal changes require checking accuracy but no cosmetic documentation edits.

## Skill boundaries

The baseline use-kw skill describes supported primitives without imposing this project's vocabulary. Opinionated workflows belong in separate implemented, requested skills. Local knowledge guides summarize this rule, while AGENTS.md remains its primary source.
