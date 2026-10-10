---
id: retry-policy
title: Bounded retries
type: decision
description: Use bounded exponential backoff while preserving request identity.
dimensions:
  module:
    - platform
    - payments
  audience:
    - agent
    - developer
links:
  - relation: governed_by
    target: idempotency
  - relation: informs
    target: webhook-guide
files: []

---

## Purpose {#purpose}

Use bounded exponential backoff while preserving request identity.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
