---
id: notifications
title: Notifications
type: capability
description: Deliver user-visible updates after durable state changes.
dimensions:
  module:
    - platform
    - web
  audience:
    - agent
    - developer
links:
  - relation: depends_on
    target: event-outbox
  - relation: explained_by
    target: notification-guide
files: []

---

## Purpose {#purpose}

Deliver user-visible updates after durable state changes.

This example represents one independently readable piece of project knowledge. Its frontmatter connects the rationale, constraints, and implementation guidance.

## Working with this knowledge {#working-with-this-knowledge}

Read the related nodes before changing the implementation. Each relationship is explicitly declared; the map does not infer dependencies from prose.

## Verification {#verification}

Check the affected behavior and update the knowledge when the contract changes. Preserve historical context in Git.
