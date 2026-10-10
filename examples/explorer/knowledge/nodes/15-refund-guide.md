---
id: refund-guide
title: Implementing refunds
type: guide
description: A practical path from a refund request to a reconciled ledger entry.
dimensions:
  module:
    - payments
  audience:
    - agent
    - developer
links:
  - relation: governed_by
    target: idempotency
  - relation: governed_by
    target: money-precision
  - relation: depends_on
    target: payment-ledger
files:
  - src/refunds.ts

---

## Purpose {#purpose}

A practical path from a refund request to a reconciled ledger entry.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
