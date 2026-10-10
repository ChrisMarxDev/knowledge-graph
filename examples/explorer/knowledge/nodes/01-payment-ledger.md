---
id: payment-ledger
title: Payment ledger
type: capability
description: An append-only record of payment movements and reversals.
dimensions:
  module:
    - payments
  audience:
    - agent
    - developer
links:
  - relation: governed_by
    target: audit-trail
  - relation: explained_by
    target: ledger-guide
files: []

---

## Purpose {#purpose}

An append-only record of payment movements and reversals.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
