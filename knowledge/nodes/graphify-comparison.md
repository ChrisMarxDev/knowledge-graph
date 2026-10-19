---
id: 6ba4e324-86a8-44ec-a3dd-210998032c67
title: Graphify comparison and retrieval opportunities
type: concept
description: Source-reviewed comparison of kw's authored knowledge model with Graphify's extracted graphs; candidate improvements, not an approved roadmap.
dimensions:
  feature: [product, retrieval, graph]
  component: [cli, files]
  status: [proposed]
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: governed_by
    target: 8f0e952a-0d52-4d41-92cd-00e32c536ab3
sources:
  - kind: url
    target: https://github.com/Graphify-Labs/graphify/tree/10130e79ed9caf8f60d998073e097531eaa1a395
    note: Source inspection on 2026-10-16; no installation, runtime benchmark, or extraction evaluation.
files: [src/core.ts, src/qmd.ts, src/cli.ts]
---

# Graphify comparison and retrieval opportunities

The user requested a comparison after pulling current main. kw was at 8021c0c;
Graphify's inspected default-branch checkout was 10130e79ed9caf8f60d998073e097531eaa1a395.
This records analysis and proposals, not approval to expand product scope.

## Different knowledge models

kw treats Markdown/frontmatter as authored, authoritative project knowledge:
intent, decisions, constraints, explanations, and explicit relationships. Agents
can author it; human curation is encouraged without being mandatory. Types and
dimensions are project-defined. QMD provides a derived keyword index; embeddings
remain planned, not implemented.

Graphify extracts a derived graph from source materials. Its architecture uses
Python and NetworkX, tree-sitter code extraction, optional semantic extraction,
community detection, reports, and graph exports. The default graph artifact is
graph.json; Markdown reports/wiki exports do not make Markdown its primary
authoring model. Its graph can include rationale and document evidence, so the
distinction is how knowledge is maintained, not that Graphify cannot represent why.

Graphify distinguishes EXTRACTED, INFERRED, and AMBIGUOUS edges. These describe
provenance/uncertainty, not authority over desired project behavior. An extracted
code fact need not override an authored requirement when code and intent diverge.

## Retrieval and scaling

Graphify serve.py selects scored or explicitly supplied seed nodes, expands
through BFS/DFS with depth limits, and renders a budgeted subgraph. It also offers
path/explanation operations. This is useful precedent for exploiting relationships
in agent retrieval.

kw query combines metadata, named Boolean views, file associations, and optional
QMD keyword ranking. link show exposes direct incoming/outgoing edges; agents
perform further traversal. Read has line/byte bounds, but metadata is not bounded
and query projections/page limits do not establish a whole-response token budget.
Core scan still reads/parses the collection, and text query requests all ranked
hits before intersection/paging. Bounded agent output and bounded compute are
different requirements; neither a graph nor a result limit guarantees both.

Graphify has content-based extraction caches and watcher support. That does not
prove its end-to-end queries are sublinear or that its recall exceeds kw's.
No comparative benchmark was run, and marketing token-savings figures should not
be treated as evidence for this project.

## Candidate direction, pending user decision

1. Consider explicit bounded graph expansion within query: seed IDs, direction,
   relation selection, depth, node/output budgets, and visible truncation.
   Preserve the agreed query-centric CLI rather than resurrecting context.
2. Return why a result was included: keyword match, metadata selection, or an
   explicit path from a seed, with source references.
3. Evaluate shortest-path queries on authored links if real tasks need them.
4. Consider derived community suggestions for large graphs, keeping saved views,
   stable type colors, and dimension accents. Do not silently redefine ontology.
5. If code extraction is wanted, evaluate Graphify as an optional evidence
   producer with an explicit adapter. Do not ingest every function as an authored
   wiki node or let regenerated observations overwrite project intent.

Recommendation: preserve kw's file-based knowledge backbone and study Graphify's
bounded retrieval. Automatic extraction, hooks, MCP, cloud services, and a fork
are not approved by this comparison. Future embeddings could rank seeds while
explicit links supply related context; these are complementary mechanisms.
