---
id: coding-intent-template
title: Intent and alternatives template
type: project-template
description: Reusable guide for a decision or dismissed concept, its evidence, and reconsideration conditions.
links:
  - relation: relates_to
    target: coding-project-template
---

# Intent and alternatives template

This guide supplies structure; it is not a decision. Create a separate node with
its own ID, appropriate type, evidence dimension, and `uses_template` link here.
Use only the sections that explain something substantive.

## Intent and outcome {#intent}

What problem was being solved? What choice settled, or what attempted change
was abandoned? State the actual outcome separately from a possible future one.

## Alternatives and reasons {#alternatives}

Describe meaningful alternatives and the reason for the outcome. A rejected
approach may be a `dismissed-concept` linked by `alternative_to` to another
concept and by `dismissed_because` to a constraint, decision, or incident.
Reuse existing nodes. Not every alternative needs a separate node.

## Evidence and sources {#evidence}

Use `confirmed` for directly established rationale, `inferred` for a supported
reconstruction, and `unknown` when the reason cannot be established. Identify
sources and conflicting evidence in prose. Evidence describes support, while
status describes current applicability; they are independent.

## Revisit when {#revisit}

Name a concrete condition that could change the conclusion, such as an upstream
fix or changed requirement. Age alone does not invalidate it. Preserve old
reasoning and connect its replacement through `superseded_by` when appropriate.
