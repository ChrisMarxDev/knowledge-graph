---
id: ledger-decision
title: Append-only accounting
type: decision
description: Record corrections as new entries so previous facts remain inspectable.
dimensions:
  module:
    - payments
  audience:
    - agent
    - developer
links:
  - relation: governed_by
    target: audit-trail
  - relation: informs
    target: payment-ledger
files: []

---

## Purpose {#purpose}

Record corrections as new entries so previous facts remain inspectable.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
