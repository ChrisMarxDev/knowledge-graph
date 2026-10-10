---
id: session-decision
title: Short-lived sessions
type: decision
description: Keep credentials short-lived and renewal explicit.
dimensions:
  module:
    - identity
    - web
  audience:
    - agent
    - developer
links:
  - relation: governed_by
    target: least-privilege
  - relation: informs
    target: identity
files: []

---

## Purpose {#purpose}

Keep credentials short-lived and renewal explicit.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
