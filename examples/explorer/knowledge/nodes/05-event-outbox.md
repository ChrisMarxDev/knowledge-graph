---
id: event-outbox
title: Event outbox
type: capability
description: Publish committed business events without a dual-write gap.
dimensions:
  module:
    - platform
  audience:
    - agent
    - developer
links:
  - relation: explained_by
    target: outbox-decision
  - relation: governed_by
    target: audit-trail
files: []

---

## Purpose {#purpose}

Publish committed business events without a dual-write gap.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
