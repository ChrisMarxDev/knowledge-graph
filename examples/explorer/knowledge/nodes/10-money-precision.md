---
id: money-precision
title: Money precision
type: rule
description: Store monetary values in integer minor units with an explicit currency.
dimensions:
  module:
    - payments
  audience:
    - agent
    - developer
links:
  - relation: informs
    target: ledger-decision
  - relation: informs
    target: refunds
files: []

---

## Purpose {#purpose}

Store monetary values in integer minor units with an explicit currency.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
