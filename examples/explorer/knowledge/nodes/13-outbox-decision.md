---
id: outbox-decision
title: Transactional outbox
type: decision
description: Write the business event in the same transaction as the state change.
dimensions:
  module:
    - platform
  audience:
    - agent
    - developer
links:
  - relation: informs
    target: event-outbox
  - relation: informs
    target: notifications
files: []

---

## Purpose {#purpose}

Write the business event in the same transaction as the state change.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
