---
id: audit-trail
title: Audit trail
type: rule
description: Every durable state transition must have an attributable record.
dimensions:
  module:
    - payments
    - platform
  audience:
    - agent
    - developer
links:
  - relation: informs
    target: ledger-decision
files: []

---

## Purpose {#purpose}

Every durable state transition must have an attributable record.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
