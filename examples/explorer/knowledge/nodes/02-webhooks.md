---
id: webhooks
title: Webhook delivery
type: capability
description: Receive external events and reconcile them without duplicating effects.
dimensions:
  module:
    - payments
    - platform
  audience:
    - agent
    - developer
links:
  - relation: governed_by
    target: idempotency
  - relation: governed_by
    target: webhook-signatures
  - relation: explained_by
    target: webhook-guide
files: []

---

## Purpose {#purpose}

Receive external events and reconcile them without duplicating effects.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
