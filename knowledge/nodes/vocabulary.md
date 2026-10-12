---
id: f9f23b8e-cb57-4286-98ed-1424828f5477
title: Configurable vocabulary and advisory schemas
type: concept
description: Projects define vocabulary; templates copy reusable content without
  imposing workflows.
dimensions:
  area:
    - schema
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
files:
  - src/schema.ts
  - src/templates.ts
  - src/git-source.ts
sources:
  - kind: file
    target: README.md
  - kind: file
    target: skills/use-kw/references/schema-templates.md
---

# Configurable vocabulary and advisory schemas

## Vocabulary
Types, dimensions, and relations are project-defined. Metadata supplies descriptions and orientation; unknown vocabulary stays readable and receives diagnostics. Core code does not impose a domain ontology.

Optional schemas check required fields, dimension values, relation endpoints, forbidden pairs, self-links, and outgoing cardinality. These are advisory doctor checks, not mutation gates; safe repair never fabricates content to satisfy them.

## Templates
Templates copy vocabulary, reusable nodes, and optional skills. They do not invent project facts, enable injection, or edit agent configuration. Apply previews by default; --apply writes and conflicts stop all writes. Reapplying identical content is a no-op, not an upgrade mechanism.

Git imports copy committed content and expose the resolved commit. They are not live cross-collection links. Preserved file references resolve in the destination and need doctor checks. This collection uses its own small vocabulary without implicitly installing the coding template.
