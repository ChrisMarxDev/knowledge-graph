---
id: least-privilege
title: Least privilege
type: rule
description: Access is explicit, project-scoped, and limited to the requested task.
dimensions:
  module:
    - identity
  audience:
    - agent
    - developer
links:
  - relation: informs
    target: session-decision
files: []

---

## Purpose {#purpose}

Access is explicit, project-scoped, and limited to the requested task.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
