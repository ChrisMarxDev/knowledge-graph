---
id: f9f23b8e-cb57-4286-98ed-1424828f5477
title: Configurable vocabulary and advisory schemas
type: concept
description: Projects define free vocabulary with optional advisory schema checks.
dimensions:
  feature:
    - schema
  component:
    - cli
    - files
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
files:
  - src/schema.ts
sources:
  - kind: file
    target: README.md
  - kind: file
    target: skills/use-kw/references/schema-templates.md
  - kind: reference
    target: Christopher taxonomy decision, 2026-10-12
    note: Approved concept, decision, rule, question, guide; feature and component
      dimensions; status highlight for designated higher-authority source truth.
---

# Configurable vocabulary and advisory schemas

## Vocabulary
Types, dimensions, and relations are project-defined. Metadata supplies descriptions and orientation; unknown vocabulary stays readable and receives diagnostics. Core code does not impose a domain ontology.

Optional schemas check required fields, dimension values, relation endpoints, forbidden pairs, self-links, and outgoing cardinality. These are advisory doctor checks, not mutation gates; safe repair never fabricates content to satisfy them.

## Manual vocabulary maintenance

Doctor reports undeclared names. Agents decide case by case whether to correct a
typo or add a definition to the metadata file. There is no automatic vocabulary
sync or template installer. Reusable files may be adapted by agents explicitly.

## This project's vocabulary

Use concept for explanations (including project purpose), decision for a chosen
approach and its rationale, rule for requirements, question for unresolved issues,
and guide for task instructions. There is no project or constraint type in this
collection. Stable node IDs are unchanged by reclassification.

feature replaces area and describes the subject: product, graph, retrieval,
authoring, schema, explorer, or tooling. component replaces surface and describes
where behavior is exposed: cli, api, ui, or files. Both accept multiple values;
omit component where it does not apply. These are local vocabulary choices, not
built-in kw requirements or classifications imposed on other projects.

status is optional and list-valued: proposed, accepted, implemented, superseded,
and highlight. Lifecycle markers describe the document's subject, not whether an
AI wrote it. Do not label an open question implemented merely because its document
exists. accepted and implemented may coexist for a decision already carried out.

## Highlighted source truth

Christopher requested highlight for documents he considers higher truth than
other material, especially to distinguish direct source truth from automatically
written summaries. Only apply highlight after his explicit designation of the
relevant document; agents must not promote their own summaries or copy the marker
from a cited source. Preserve highlighted documents and their designation during
automated maintenance unless he explicitly requests a change.

Highlight is independent of lifecycle: [implemented, highlight] is valid.
Prefer explicitly highlighted source material when reconciling derived summaries,
and surface contradictions rather than silently rewriting the highlighted source.
It does not make an old statement current, turn a proposal into implemented
behavior, or override newer explicit corrections. Keep supporting citations and
raw wording intact. No existing document was automatically highlighted during
the taxonomy migration.

The Highlighted truth view selects this marker. It is metadata for human/agent
interpretation: kw does not currently rank results, resolve conflicts, or visually
badge authority automatically. The general status dimension and its filters/color
controls expose it like other values once a document carries it.
