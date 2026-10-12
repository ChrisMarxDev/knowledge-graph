---
id: fcb6e989-fa8b-4af1-b7f9-3c747268764a
title: Repository knowledge maintenance workflow
type: constraint
description: Keep the usage skill synchronized with public behavior and
  reconcile sourced knowledge deliberately.
dimensions:
  area:
    - workflow
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: a13ffb89-5455-41de-b0dc-b6fb8c0097d3
files: []
sources:
  - kind: file
    target: AGENTS.md
  - kind: file
    target: skills/use-kw/SKILL.md
  - kind: file
    target: skills/use-kw/references/initialization.md
  - kind: file
    target: skills/capture-intent/SKILL.md
  - kind: file
    target: skills/retro/SKILL.md
---

# Repository knowledge maintenance workflow

## Contract maintenance
AGENTS.md requires public CLI/API changes to update skills/use-kw/SKILL.md and relevant references in the same change. Check implementation and help, verify affected examples in temporary collections, and update README where it describes the same behavior. README edits do not substitute for the skill. Internal-only changes require an accuracy check without cosmetic edits.

Keep use-kw focused on tool primitives. Opinionated workflows and future injection belong in separate requested skills.

## Knowledge workflows
First-use onboarding discovers documents and local references, establishes authorized scope, initializes, imports meaningful sourced knowledge, and validates the result. Empty init alone is incomplete onboarding. Original documents remain available.

capture-intent records settled reasoning, constraints, and rejected approaches with evidence. retro reconciles findings from a bounded session or change using existing vocabulary. Neither silently expands scope or installs a template. This setup adds no automatic hooks.

Use this collection to locate relevant knowledge, then read cited contracts. When a source changes, reconcile its affected nodes deliberately; citations do not automatically synchronize. Run doctor after structural edits.
