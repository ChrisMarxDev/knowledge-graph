# Agent wiki goals and discussion

This record tracks the goals, constraints, decisions, and open considerations from the agent wiki conversation, beginning 10 October 2026. The concept is exploratory. User commitments are distinguished from the original concept document and assistant proposals.

## Confirmed direction

- Explore an agent wiki based on knowledge graphs, using the supplied Developer Knowledge System document as the starting point.
- Establish first-level goals and constraints before deciding what to build. Earlier implementation suggestions remain unaccepted proposals.
- Keep the system file based so agents can work with it even when unfamiliar with the system.
- Avoid growth in required context reading directly proportional to accumulated source data. Retrieval should remain selective as history grows.
- Record the decisions and contemplations of this chat as the discussion continues.
- The primary job is supplying understanding to agents: the complete project knowledge backbone from which they efficiently obtain correct context and information.
- Agents may change all knowledge. Their changes should be deliberate; human approval is not a universal prerequisite for editing.
- Remember as much as feasible, rather than limiting capture to a predefined category of core knowledge. Future agent context windows and retrieval capability are practical limits to consider.
- Preserve history unless knowledge is explicitly removed. Routine compression or maintenance must not silently forget history.
- Establish levels of source authority. When governing knowledge says A and code does B, the intended response is to identify the mismatch and bring code into alignment.
- Users choose the knowledge scope and amount, including whether company knowledge belongs alongside project knowledge. The system must not independently choose these boundaries.
- Encourage human curation without requiring it. Reducing the burden of unwieldy Markdown management is a central motivation.
- Everything must be local or in the repository. This is a core requirement, with the same practical ownership and working model as Markdown libraries.
- Judge success first by the user's felt improvement over pure Markdown skills in actual work. Pursue measurement if that experience succeeds.
- The proposed file format, shared engine, retrieval, CLI, visualization, and history components are accepted as the overall direction, with types and dimensions freely configurable rather than hardcoded.
- Maintain a metadata file listing the types and dimensions as an orientation map for agents.
- Include CLI diagnostics and repair functions for dimensions that are incorrectly set or used without being mentioned in the metadata file.

## Current user proposals

- Introduce a review-state dimension on nodes, with possible states `unapproved`, `edited`, and `approved`. Exact semantics, transitions, and who records approval remain open. Review state is intended to make unrestricted agent editing accountable, not to impose required human curation.
- A first version could extend Markdown with proper frontmatter, possibly adding a CLI that opens a knowledge graph UI showing dependencies and different zoom levels. This is a tentative starting direction, not an instruction to implement it yet.

Subsequent discussion accepted this component direction. Review flow is deferred. Initial examples of node types are examples only; no fixed vocabulary is selected.

The scaling requirement concerns reading, not necessarily storage. A proposed clarification is to evaluate comparable tasks at comparable quality as the corpus grows. A broader task or genuinely increased relevant complexity can reasonably require more context. This interpretation has not yet been explicitly confirmed.

## Goals in the original concept document

These are inherited exploration goals, not individually ratified decisions in this chat.

| Goal | Desired outcome |
|---|---|
| Reliable retrieval | Surface governing rules, relevant decisions, dependencies, and implementation knowledge. |
| Context efficiency | Load a small orientation map and targeted evidence instead of the whole history. |
| Human readability | Make purpose, systems, decisions, and unresolved issues easy to understand and explore. |
| Developer traceability | Connect code changes to concepts, decisions, rules, and verification requirements. |
| Trustworthy guidance | Distinguish current accepted intent from proposals, stale knowledge, observations, and inferences. |
| Contextual verification | Check applicable rules using appropriate evidence and implementation context. |
| Local and portable operation | Keep canonical knowledge readable and exportable; support local retrieval. |
| Manageable upkeep | Update affected knowledge and derived material without repeatedly processing the whole collection. |

The original overall goal is the smallest sufficient, trustworthy context for humans and development agents, with knowledge that is readable, explorable, maintainable, and verifiable.

## Candidate constraints

These are proposed implications and additional considerations, not yet accepted requirements.

1. **Files contain the durable knowledge.** Meaning, sources, and essential relationships should survive the loss of a database or hosted service. Derived indexes should be reconstructable.
2. **An unfamiliar agent has a usable entry point.** Ordinary file reading and text search should support orientation and useful work without a special API or prior knowledge of the schema. Advanced tooling can improve efficiency.
3. **Reading scales with task needs.** For comparable tasks, adding irrelevant or redundant history should not produce proportional growth in required reading. Include orientation, tool results, and repeated lookups when measuring reading cost.
4. **Efficiency preserves retrieval quality.** A fixed context limit is insufficient if important constraints disappear. Evaluate omissions and irrelevant material alongside token usage.
5. **Compression preserves access to evidence.** Summaries may omit detail; source material should remain independently reachable. The user has confirmed history persists unless knowledge is explicitly removed; deletion semantics remain open.
6. **Knowledge carries authority and scope.** Proposals, accepted intent, observed implementation, and inferred claims must remain distinguishable. Missing classification should not silently establish an exemption.
7. **Uncertainty and conflicts remain visible.** Stale evidence, contradictory guidance, and incomplete coverage should be representable without manufacturing a single confident answer.
8. **Maintenance remains affordable.** Routine additions should normally require work on affected knowledge rather than a model reread of the whole corpus. Global migrations may still be necessary occasionally.
9. **The system tolerates incomplete structure.** Useful work should be possible before all records are classified or linked; gaps should not make otherwise searchable knowledge inaccessible.
10. **Edits are recoverable and attributable.** Human and agent changes should preserve provenance and allow correction. Concurrent contributions must not silently overwrite each other.
11. **Human and agent use share the same knowledge.** Their preferred views may differ, but authoritative content should not drift into separate versions.
12. **Budgets do not silently erase obligations.** When required guidance exceeds a reading budget, expose the conflict and support additional retrieval or task decomposition.

## Open questions to explore before architecture

- **File-based boundary:** Must full functionality work with files alone, or must files preserve a useful fallback while richer retrieval uses optional indexes?
- **Scaling:** Do we bound only agent context, or also latency, model calls, indexing cost, and maintenance effort? What quality must be preserved?
- **Retention:** Does explicit removal mean removal from current knowledge, deletion of historical versions, or both? Can retained history be archived while remaining accessible?
- **Review state:** What do unapproved, edited, and approved mean for retrieval and subsequent edits? Who may approve, and how is the reviewed revision identified?
- **Source levels:** What is the authority ordering, and does it differ between descriptions of actual behavior and statements of intended behavior?
- **Scope:** How do users declare project and company knowledge boundaries? How are branch, release, environment, and personal preferences distinguished within those boundaries?
- **Freshness:** What constitutes stale knowledge, and when must it be rechecked? How does the system communicate that no one has checked it recently?
- **Capture:** Within user-selected scope, how can agents remember as much as feasible while keeping repetition out of routine context?
- **Local operation:** What must be committed versus stored locally and rebuilt? Does the local requirement also exclude any optional external processing?
- **Human effort:** How does the knowledge remain useful without mandatory human review, while making optional curation effective?
- **Success:** What felt improvements matter first: fewer repeated explanations, better adherence to intent, faster orientation, or less maintenance? Formal measurement follows a successful experience.

## Implications proposed after the latest clarification

These are assistant interpretations to discuss, not additional user commitments.

- Define the product as a locally owned project knowledge backbone that preserves knowledge broadly and presents only the context needed for the current task.
- Treat retention, retrieval, and presentation as separate concerns. Preserving more history need not put more history in every agent context, but it still creates indexing and maintenance costs.
- Keep review state distinct from authority and knowledge lifecycle. An unreviewed statement of intended behavior, an approved observation of existing code, and a superseded decision have different meanings.
- Attach approval to a revision. Editing approved content should visibly indicate that the current revision differs from the reviewed one; retain the prior reviewed version in history. Whether unchanged parts retain review status remains open.
- Avoid interpreting unapproved as unusable or false. Without required human curation, the system must remain useful when much of its knowledge has not been human reviewed.
- Source priority should resolve intended behavior without hiding actual behavior. If a governing requirement says A and code does B, retain evidence that code currently does B while treating A as the target. An inaccurate descriptive node may instead need correction.
- Zoom levels should help agents as well as humans: orientation, subject overview, specific knowledge, then supporting evidence. Exact representations remain undecided.
- Ordinary Markdown editing should remain a first-class workflow; richer structure should reduce manual management instead of introducing a new mandatory maintenance burden.

## Earlier assistant proposals still under consideration

The first response proposed a wiki that agents can consult, contribute to, and question, connecting intent, implementation, and evidence. The user subsequently asked to focus on goals and constraints before build choices. None of the following should be treated as an accepted design.

- Use independently maintainable knowledge units; split content when it needs its own scope, authority, lifecycle, or relationships, rather than making every fact a page.
- Distinguish subject pages for orientation, knowledge records for obligations and rationale, and evidence records for support. A Refunds page and a separate refund idempotency rule illustrated this distinction.
- Maintain subject overviews without creating duplicate authoritative copies of underlying rules.
- Introduce a small typed graph early, organized around questions: what governs this work, why it is this way, what dependencies matter, what supports a claim, and what changes could affect.
- Distinguish inferred relationships from documented or mechanically extracted relationships. A discovery hint should not automatically establish an obligation.
- Treat agent contributions as changes to shared understanding, distinguishing new observations, clarifications, proposed intent changes, and unresolved conflicts.
- Record deviations between implementation and accepted intent rather than silently rewriting intent to match code.
- Return uncertainty and coverage limits with retrieved context, including incomplete classifications and outdated verification.
- Expose a conflict when mandatory context exceeds the requested budget rather than silently dropping constraints.
- Evaluate one complete development loop: retrieve context, inspect rationale, change code, contribute discoveries, and identify affected knowledge and checks.
- Consider allowing agents to maintain descriptive knowledge while reserving changes to accepted rules and decisions for human approval or explicitly delegated authority. The user subsequently chose unrestricted agent editing with a proposed review-state dimension instead; this earlier suggestion is not the current direction.

## Source context

Starting document: Developer Knowledge System, consolidated concept document dated 10 October 2026, supplied as `developer-knowledge-system.md` in this conversation. Its architecture, tools, rankings, and sequencing are exploratory inputs rather than commitments made here.

## Component planning

The user has now asked to select concepts and define buildable components. Review flow is deferred, not rejected. A CLI for data management and efficient reading, also able to launch visualization views, is the user's proposed entry point. No implementation has been requested in this step.

The user endorsed the overall component direction, subsequently specifying freely configurable types and dimensions, a metadata map, and CLI repair functions. Detailed boundaries and command syntax remain proposals. `kw` is a placeholder executable name.

| Component | Responsibility | Initial boundary |
|---|---|---|
| Knowledge files and configuration | Store canonical Markdown, frontmatter, explicit relationships, sources, user-selected knowledge roots, and a metadata vocabulary map. | Stable structural fields with freely settable types and dimensions. The metadata file describes the project's vocabulary; application code does not enumerate permitted knowledge types. Ordinary file editing remains supported. |
| Shared knowledge engine | Parse, resolve identities and links, validate, track changed files, and build a local queryable index. | CLI and UI use the same semantics. Indexes are disposable; knowledge and relationships are reconstructable from files. Missing links and invalid metadata produce visible diagnostics. |
| Retrieval and context assembly | Provide orientation, search, focused reading, relationship expansion, and task-specific context selection. | Begin with exact/text search, metadata, file links, and bounded graph traversal. Return IDs, paths, inclusion reasons, and limits. Optional semantic retrieval can follow experience with real material. |
| Management CLI | Expose the engine to agents and humans for setup, creation, linking, validation, repair, indexing, and reading. | Diagnose malformed dimension values and vocabulary absent from the metadata file. Offer concise text and structured JSON. Commands are conveniences; knowledge remains editable without them. Respect configured roots and avoid unsolicited expansion of scope. |
| Local visualization app | Browse and read the same knowledge through outline, graph, and detail views. | CLI launches a local app. Start with grouping by explicit dimensions and focused node neighborhoods; visual zoom and semantic detail are separate controls. |
| History and change tracking | Preserve revisions and sources across updates and distinguish current knowledge from historical versions. | Choose a history mechanism before implementing managed writes. Git is a candidate only with a defined capture policy; uncommitted edits are not automatically retained. Observe external edits, while acknowledging unseen intermediate saves cannot be reconstructed. Explicit deletion semantics remain open. |

Suggested CLI surface:

```sh
kw init
kw create --type decision --title "Refund retries"
kw link <source-id> <relationship> <target-id>
kw check
kw index
kw map --budget 1500
kw search "refund retries"
kw read <id> --detail overview
kw related <id> --hops 1
kw context "Implement refund retries" --files src/refunds.ts --budget 6000
kw history <id>
kw view --view outline
kw view --view graph --focus <id>
```

Budgets are illustrative token targets, not established defaults. The tokenizer and overflow behavior need definition. A context command should report omissions and unresolved scope rather than promise completeness. Full records and original sources remain separately reachable. Search results must not include every matching document in full by default.

Proposed views:

- Outline or library: grouped titles and descriptions, filters, and readable navigation.
- Relationship graph: labeled, directed connections around a selected node, with bounded expansion.
- Reader and inspector: full Markdown, metadata, incoming and outgoing relationships, sources, and history.
- Progressive detail: project map, area overview, node detail, and source evidence. Initial grouping can use explicit dimensions and curated entry points; automatic clustering is deferred.

Proposed first build slice: canonical files, shared indexing and validation, search/read/map/related CLI operations, and a local outline plus focused graph with a reader. Establish revision preservation before enabling managed mutations. Add task-context assembly using those same primitives rather than designing an opaque retrieval system independently.

Deferred from the first slice: review workflow, automatic code compliance checking, automatic semantic reconciliation, automatic clustering, and chronological summary trees. These remain possible later features. Efficient retrieval is required from the beginning; whether embeddings materially improve it should be assessed on actual project knowledge.

## Metadata map and repair behavior

The user requires a metadata file listing all dimensions and types, with freely settable vocabulary. Proposed filename: `knowledge.meta.yaml`; the filename and exact schema remain undecided.

Proposed contents include names and descriptions of types and dimensions. Dimension definitions may optionally describe value shape, multiplicity, known values, aliases, and explicit requiredness within a scope. Known values need not form a closed enum. Arbitrary new vocabulary remains representable; undeclared vocabulary is reported as a map inconsistency rather than discarded or made unreadable. No dimension is automatically mandatory for every node.

Proposed commands:

```sh
kw doctor
kw fix --dry-run
kw fix --safe
kw meta sync --dry-run
kw meta sync
```

`doctor` reports undeclared types, dimensions, and values where tracking is configured; malformed value shapes; missing explicitly required metadata; alias or spelling inconsistencies; and unused declarations. An unused declaration is informational, not automatically an error. Open-text dimensions cannot be checked against a closed value list unless configured that way.

`fix --safe` applies only unambiguous structural corrections or explicitly declared alias mappings. Semantic classification and ambiguous renames remain unresolved diagnostics for an agent to investigate. `meta sync` can register observed vocabulary while preserving authored descriptions and constraints, but should expose possible typos instead of treating every new spelling as an intentional category. Dry-run output makes changes inspectable without adding a mandatory human review workflow. Automated fixes preserve history.

The map may grow as vocabulary grows; a bounded `kw map` view should expose a compact orientation with pointers to the full metadata file rather than force every agent to load the complete registry.

## Concepts ranked for the current setup

This is an assistant judgment of expected contribution to agent understanding and manageable upkeep, not benchmark results or implementation order. Closely related concepts from the original inventory are grouped. The canonical Markdown foundation and local ownership are already required; low incremental ranking does not make a requirement optional. Review workflow remains deferred. Measurement follows a successful subjective experience as requested.

| Rank | Concept or grouped concepts | Expected improvement |
|---|---|---|
| 1 | Vocabulary map with freely defined types and sparse dimensions | Agents can discover how this project organizes knowledge without a hardcoded ontology. |
| 2 | Progressive detail with titles, descriptions, and use-when hints | Agents scan cheaply and expand only relevant content. |
| 3 | Budgeted task-context retrieval and deduplication | Compose complementary evidence without reading every candidate in full. |
| 4 | CLI diagnostics and repair | Keep freely edited metadata and the map consistent with low maintenance effort. |
| 5 | Exact and keyword search | Reliably find identifiers, paths, phrases, and technical terms. |
| 6 | Typed relationships and bounded traversal | Reach dependencies and rationale without loading the whole graph. |
| 7 | Compact project map and retrieval instructions | Give unfamiliar agents a small, usable starting point. |
| 8 | Explicit code links and subject entities | Turn affected files and systems into precise retrieval entry points. |
| 9 | Scope-based guidance with unknowns and explicit exemptions | Surface governing knowledge even when similarity search misses it. |
| 10 | Deterministic metadata filtering | Narrow retrieval using known task properties while preserving unknown coverage. |
| 11 | Sources, provenance, and intended versus observed knowledge | Establish authority without erasing implementation discrepancies or inferred status. |
| 12 | Current versus historical knowledge and explicit supersession | Preserve history without making obsolete guidance govern current tasks. |
| 13 | Incremental indexing and cached judgments | Keep changes cheap enough to support a growing collection. |
| 14 | Maintained area and topic overviews | Provide compact understanding across many related records. |
| 15 | Direct search across raw documents and history | Keep knowledge reachable when summaries and graph links miss it. |
| 16 | Local hybrid search with embeddings, vector search, and rank fusion | Find conceptual matches that use different wording. |
| 17 | Section-level indexing with parent context | Retrieve precise passages without losing scope or meaning. |
| 18 | Local reconciliation and deliberate deduplication, extension, or replacement | Reduce repeated and contradictory knowledge during ingestion. |
| 19 | Stable identities, alias resolution, and rename-aware references | Preserve connections while names and files evolve. |
| 20 | Dynamic grouping, outline views, and curated entry points | Reorganize the same records for different tasks without duplication. |
| 21 | Task-specific policies, classification, and routing | Adapt context to implementation, explanation, review, or architecture work. |
| 22 | Batched classification and gradual metadata backfilling | Maintain useful organization without mandatory human tagging. |
| 23 | Candidate reranking with separate applicability and usefulness judgments | Improve the final selection from an already adequate candidate set. |
| 24 | Knowledge health checks | Identify contradictions, stale claims, broken links, and orphans. |
| 25 | Configurable templates and schema validation | Make new records useful and structurally consistent without fixed types. |
| 26 | Retained history, recent-activity summaries, and source access | Support continuity and reconstruction without loading all historical material. |
| 27 | Focused graph visualization with collapsed groups | Help humans inspect dependencies and identify missing connections. |
| 28 | Selective reuse of generated answers as sourced knowledge | Avoid repeatedly reconstructing valuable explanations. |
| 29 | Mechanically extracted code relationships | Keep imports, routes, schemas, and other discoverable connections grounded in code. |
| 30 | Branch, release, environment, and time-aware scope | Prevent valid knowledge from being applied in the wrong context. |
| 31 | Query decomposition and multiple navigation paths | Improve discovery when one query or route misses relevant evidence. |
| 32 | Revision-aware evidence and bidirectional change impact | Identify knowledge and checks that may need attention after changes. |
| 33 | Entity inventories and capability-based applicability | Determine coverage and find applicable guidance across implementations. |
| 34 | Verification recipes, states, and applicability separate from compliance | Explain what has actually been checked and what remains unknown. |
| 35 | Deterministic, behavioral, semantic, and visual verification | Establish implementation alignment using suitable evidence. |
| 36 | Goal-to-decision-to-rule-to-code-to-test traceability | Explain the chain from purpose through implementation and evidence. |
| 37 | Promote useful tags into configured dimensions | Add stronger semantics when repeated usage justifies it. |
| 38 | Representative retrieval evaluations | Diagnose quality and cost after the subjective experience succeeds. |
| 39 | Chronological summary trees and historical zoom | Offer compact historical navigation beyond ordinary history search. |
| 40 | Automatic clustering and graph-wide synthesis | Support broad exploration once the collection justifies the added maintenance. |

## Current concept selection

The user accepted concepts 1–10 from the ranked list for the current scope. Concepts 11–13 are under discussion and require explanation before selection. Concepts 14–40 are set aside for now, not permanently rejected. Existing core constraints, including preserving history, remain in effect even where a deferred concept would add sophistication to them.

Selected concepts:

1. Metadata map with freely defined types and dimensions.
2. Progressive detail and useful descriptions.
3. Budgeted task-context retrieval.
4. CLI diagnostics and repair.
5. Exact and keyword search.
6. Typed relationships and bounded traversal.
7. Compact project map and retrieval instructions.
8. Explicit code links and subject entities.
9. Scope-based guidance.
10. Deterministic metadata filtering.

Explanations of the three candidates:

- **11 Sources, provenance, and intent versus observation:** Retain where a statement came from and whether it states desired behavior or reports current behavior. For example, a requirement may say refunds must be idempotent while code observation shows duplicate refunds are possible. Preserve both, identify the discrepancy, and use governing intent as the target for the code. A stale description of code is instead a candidate for correction. Proposed minimum: source references plus a configurable distinction between intent and observation; no review workflow or automated verification is implied. A source reference alone does not establish authority; source-level precedence remains to be defined.
- **12 Current versus historical knowledge and supersession:** Distinguish what governs now from what used to govern while retaining history. If a newer decision replaces an older one, default retrieval uses the current decision and exposes a path to the prior decision when relevant. Editing a node creates a prior revision; replacing a separate decision can use an explicit supersedes relationship. Most recent timestamp alone must not determine authority, since a new proposal may not replace an existing decision. Proposed minimum: an explicit way to mark replacement and retrieve current or historical material; exact representation remains open.
- **13 Incremental indexing and caching:** Maintain a derived local index and refresh only changed files and affected links under ordinary edits. For example, editing one file in a collection of 2,000 should normally reparse that file and update its affected index entries rather than reprocess all document bodies. Cached results can be reused only while their inputs remain valid. File additions, deletions, renames, and metadata-map changes require appropriate invalidation; some global changes can require a full rebuild. Proposed minimum: change detection, incremental index updates, and rebuild support. Model-judgment caching is unnecessary for the currently selected scope. Indexing efficiency reduces processing and latency; it does not by itself reduce agent reading.

Assistant recommendation: include small versions of 11–13 because they support correct context and an efficient CLI, while retaining configurable vocabulary and deferring review flow. This is a recommendation, not a user decision.

## Primitive implementation clarification

The user challenged 11 as too semantic for the initial version, requested explicit technical mechanisms for 12, and asked which index 13 assumes given filesystem storage. These concepts remain unaccepted. The earlier recommendation to include all three is revised below; it was broader than the desired primitive scope.

- **11:** Defer automatic interpretation of intent, observations, and source authority. Optional source paths or URLs are ordinary data and may remain useful, but the CLI need not interpret them or resolve disagreements. Configurable dimensions can carry such distinctions if an agent or user chooses to write them.
- **12:** A minimal current-state mechanism could use explicitly authored links such as `supersedes: <id>` or a corresponding typed edge, resolved by deterministic CLI code. A configured query can exclude targets of such edges from its default results and include them on request. This requires explicit convention/configuration, not a hardcoded node type. The tool does not infer replacement from prose or timestamps. The primitive is graph traversal/filtering, which is already covered by selected concepts 6 and 10; automatic semantic supersession is deferred. Historical file revisions are a separate storage problem. Git can retain committed revisions, but it does not retain every direct edit automatically, and automatic commits to the user's repository are not assumed. The revision-capture policy remains undecided.
- **13:** Markdown remains canonical on the filesystem. An optional local SQLite database can contain a rebuildable index of IDs and paths, file fingerprints, parsed metadata, edges, and an FTS5 text-search index. This is a technical proposal, not an existing implementation or accepted storage choice. The engine would parse files into the index, query it for candidates and relationships, and read canonical files for full content. A small initial version can instead enumerate and parse the files per command, build an in-memory map, and search directly with no persistent database. This costs more local processing as the collection grows but does not force the agent to read every file. Persistent indexing should be selected for latency and scale, not treated as necessary to achieve bounded agent context. Filesystem discovery, invalidation, schema changes, deletions, and renames must be handled if a persistent index is introduced.

Revised assistant recommendation: defer semantic features in 11; express any explicit replacement convention in existing link/filter primitives for 12 without making it a separate subsystem; start 13 with an in-memory map if sufficient, leaving a rebuildable persistent index as an optimization. Keep history preservation as an existing requirement whose exact mechanism remains to be chosen.

## Git history and next technical primitives

The user accepts Git-based history for now and defers concept 13, persistent indexing/caching. Git preserves committed revisions; no automatic commit policy is selected. Semantic supersession is not implied by selecting Git history. The user requests a next batch of explicit technical concepts rather than semantic features.

Grep searches text directly. A parsed in-memory map can additionally resolve frontmatter fields, node IDs, and links; it need not be persistent. A persistent index stores precomputed lookup structures between commands to accelerate repeated structured queries and text searches, at the cost of synchronization and invalidation. Direct text search plus on-demand parsing is the proposed initial approach. Scanning files locally does not require returning all scanned content to the agent.

The following are new assistant proposals refining the selected components, not additional accepted requirements. Command syntax and filenames are illustrative.

| Primitive | Concrete behavior |
|---|---|
| Explicit collection manifest | Configure included knowledge directories and the metadata-map location. Resolve relative paths against the manifest and scan only configured roots. |
| Stable node IDs and a frontmatter envelope | Reserve structural fields such as id, title, type, description, dimensions, and links while leaving domain type and dimension vocabularies freely settable. Generate IDs, diagnose duplicates, and resolve IDs on demand. |
| Metadata registry with shape definitions | Define dimension value shape, single versus multiple values, descriptions, optional aliases, and optional closed value sets in the metadata file. Keep unknown vocabulary readable and report inconsistencies. |
| Explicit relationship records | Represent each edge as a relationship name and target ID. Support outgoing links, incoming links, and bounded traversal through on-demand parsing. Relation names and explanations can also live in the registry. |
| Deterministic query operators | Support exact dimension matching, membership in list values, explicit AND/OR, missing-field queries, text search, and file-path matching. Define null/missing behavior without semantic inference. |
| Declared excerpts and bounded output | Return metadata cards or named Markdown sections on demand, with result limits and continuation information. Report omitted material and avoid cutting a record invisibly. Byte/character limits can be exact initially; token budgets require a declared tokenizer or explicitly approximate counts. |
| Structured CLI protocol | Provide stable JSON envelopes for results, warnings, errors, and continuation; useful exit codes; and human-readable text output. Avoid requiring agents to parse display tables. |
| Predictable file mutations | Provide explicit create, metadata-set, link, unlink, and rename operations. Preserve unrelated frontmatter and body text, write through a temporary file and atomic replacement where supported, and detect concurrent changes before replacing content. |
| Diagnostics and explicit repair plans | Produce machine-readable issue codes and exact proposed edits for undeclared vocabulary, malformed values, duplicate IDs, and broken links. Auto-apply only unambiguous transformations; leave ambiguous meaning for agents to resolve. |
| CLI-launched local UI | Start a loopback HTTP server serving a reader, outline, and bounded graph from the same parsing/query code. No separate authoritative UI datastore or persistent index is required. |

Suggested implementation order: first agree on a worked example consisting of the collection manifest, metadata registry, and two linked Markdown nodes; then specify query/output contracts and implement direct-file reads; add mutation/repair and the local UI on top. This is a proposal for the next design step, not an instruction to start implementation.

## Accepted primitives and technology discussion

The user is ready to begin development and asks which technology fits a fast CLI that can later serve local web pages. The repository currently has no implementation stack. Both Go and Rust toolchains are available. Technology selection is under discussion; no language has yet been accepted.

Updated primitive decisions:

- T1 collection manifest: accepted.
- T2 stable IDs: accepted, including commands for generating/assigning IDs and doctor checks for dangling ID references. Duplicate-ID checks remain included.
- T3 frontmatter: established foundation. Add explicit file links. Dimensions are freely chosen; nodes may have multiple dimensions and multiple values within each dimension. Proposed representation is one YAML key per dimension with a list of values, rather than duplicate mapping keys.
- T4 dimension shape declarations: undecided. Do not require a typed domain schema in the first version. Basic frontmatter structure and ID/link integrity can still be checked.
- T5 explicit edges and backlinks: accepted.
- T6 deterministic query operators: accepted.
- T7 section reading and bounded output: accepted.
- T8 structured CLI output: accepted.
- T9 precise mutations: accepted.
- T10 diagnostics and repair plans: accepted.
- T11 local web UI: accepted for later; delay implementation.

Illustrative ID command proposals: `kw id generate` prints a new ID; `kw id assign <path>` assigns an ID to a file without one; `kw doctor` diagnoses missing IDs, duplicates, and unresolved relationship targets. Broken file links should be diagnosed separately from broken node IDs. Existing IDs must not be silently regenerated.

Assistant technology recommendation: Go for the CLI and shared core, with Cobra for subcommands, a YAML parser for structured frontmatter, standard-library file/JSON operations, and a Markdown parser when section extraction needs Markdown syntax awareness. Files remain canonical; use direct scans and on-demand parsing with no persistent database or index. Use the installed Git executable for history operations without automatic commits. Later use `net/http` for the local server and `embed` for compiled frontend assets. Select the frontend framework when UI work starts.

Rationale is a workload-specific judgment, not a performance benchmark: this application primarily scans files, parses metadata, performs explicit graph/filter operations, and produces bounded output. Go offers a straightforward implementation path and standard-library HTTP/asset support. Rust is also suitable, with clap for CLI parsing and axum for HTTP; prefer it if its type-system guarantees, allocation control, or team familiarity are stronger priorities. No claim of measured startup or throughput advantage is made.

Implementation concern independent of language: writing frontmatter must preserve unrelated keys and Markdown body bytes. A generic parse-and-serialize cycle may change formatting or comments; the mutation strategy needs tests for preservation and concurrent edits.

Documentation checked for the comparison:

- [Go executable builds](https://go.dev/doc/tutorial/compile-install)
- [Go embedded files and HTTP integration](https://pkg.go.dev/embed)
- [Go HTTP server support](https://pkg.go.dev/net/http)
- [Cobra CLI framework](https://github.com/spf13/cobra)
- [Rust clap CLI framework](https://docs.rs/clap/latest/clap/)
- [Rust axum web framework](https://docs.rs/axum/latest/axum/)

## Future performance and vector search

The user raised future performance as a reason to prefer Rust. The assistant revised its recommendation toward Rust given the long-term knowledge-backbone goal, while noting that filesystem access, parsing strategy, and data structures may matter more than language for the initial version. No benchmark has established a Rust advantage for this project, and the user has not yet explicitly finalized the language.

The user now confirms vector embeddings and vector search will definitely be added, preferably file based. This supersedes their earlier deferral as optional capabilities: they are firm future requirements, not necessarily part of the first milestone. General persistent indexing remains deferred for the primitive CLI.

Proposed interpretation: canonical knowledge remains Markdown and YAML; embeddings and vector-search structures can be generated local files that are rebuildable from the selected embedding model and source files. They need no hosted database. Local SQLite with a vector extension is also filesystem-backed, but whether a database file fits the user's meaning of file based has not yet been decided. A plain serialized vector collection or a saved vector index is another option.

Separate technical concerns:

- Embedding generation: run a selected model locally, either in process or through a local runtime. Model compatibility, hardware, loading latency, and packaging need evaluation before choosing the inference library.
- Vector persistence: store vectors with node/section IDs, source content hashes, model and tokenizer identity/revision, and preprocessing configuration. Keep generated artifacts separate from authored knowledge; ignoring them in Git is a proposal, not a settled rule.
- Search: begin with exact similarity comparisons over stored vectors if collection size permits; add an approximate nearest-neighbor index only when warranted. Reusing vectors does not require an ANN index.
- Freshness: update changed chunks and remove deleted ones; do not mix incompatible embedding spaces. Query embeddings must use a compatible model and its prescribed query preprocessing. Basic text search remains available without model files.

The requirement strengthens the case for Rust modestly if embedding inference runs inside the application: Candle offers a Rust ML framework with embedding-capable model implementations. It does not establish a decisive vector-search performance advantage because engines such as USearch expose both Go and Rust bindings to the same native implementation. Model inference, model loading, and the search engine may dominate costs independently of the CLI language.

Revised assistant recommendation remains Rust for CLI/shared core and later HTTP serving; design an optional embedding/search component and local derived-file storage boundary now, while deferring model and backend selection until a small real-data experiment. An embedded SQLite database and a saved vector index are candidates, not selected dependencies.

Sources checked:

- [USearch persistence and language bindings](https://github.com/unum-cloud/usearch)
- [sqlite-vec local vector extension](https://github.com/asg017/sqlite-vec)
- [Candle Rust ML framework and model implementations](https://github.com/huggingface/candle)

## Concrete embedding packages and QMD implementation

The user requested an explicit vector-generation package and an inspection of how QMD implements embeddings. QMD source was inspected at commit `93d211f9ef4a869a9aed0d075ca767dda552627f` in a temporary checkout outside this project. This was source inspection, not a runtime benchmark or model test.

QMD implementation findings:

- TypeScript uses `node-llama-cpp` (3.20.0 in the inspected package manifest) for local inference through llama.cpp.
- Default embedding model is `hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf`.
- Documents are split into approximately 900-token chunks with 15 percent overlap and boundary-aware splitting. QMD applies model-specific document and query formatting.
- The inference path creates an embedding context and calls `getEmbeddingFor`, returning its vector. Batch generation and context reuse are also implemented.
- SQLite stores derived content and vector data; `sqlite-vec` supplies vector queries. The README's default index path is `~/.cache/qmd/index.sqlite`.
- Content hashes and embedding fingerprints identify missing or incompatible embeddings. Search embeds the query with the matching model before vector lookup.

Concrete Rust candidates:

1. `fastembed` from `anush008/fastembed-rs`: high-level local embedding API with tokenization, batching, model retrieval/cache, and supported model definitions. Standard text inference uses ONNX Runtime through `ort`; selected model families have optional Candle backends. The supported models include EmbeddingGemma 300M. A cached model can run without a model-hosting service. Embedding output is separate from vector persistence/search. This is the assistant's first candidate for a prototype, rather than implementing model inference directly in Candle.
2. `llama-cpp-2` from `utilityai/llama-cpp-rs`: lower-level Rust bindings to llama.cpp with embedding APIs. This is the closer architectural match to QMD's GGUF path. Matching the particular GGUF model, pooling/normalization, runtime build, and hardware support needs a smoke test before selection.

Native inference libraries and model files affect packaging even with a Rust CLI; do not assume a dependency-free single executable for the embedding feature. Ordinary commands can avoid loading the inference backend. Neither candidate has been installed or benchmarked for this project, and no model, runtime, or vector-store choice is accepted yet.

Source links:

- [QMD inference implementation at inspected revision](https://github.com/tobi/qmd/blob/93d211f9ef4a869a9aed0d075ca767dda552627f/src/llm.ts)
- [QMD storage and chunking implementation at inspected revision](https://github.com/tobi/qmd/blob/93d211f9ef4a869a9aed0d075ca767dda552627f/src/store.ts)
- [QMD README](https://github.com/tobi/qmd)
- [FastEmbed Rust documentation](https://docs.rs/fastembed/latest/fastembed/)
- [FastEmbed models and runtime details](https://github.com/Anush008/fastembed-rs)
- [llama-cpp-2 embedding context APIs](https://docs.rs/llama-cpp-2/latest/llama_cpp_2/context/struct.LlamaContext.html)

## Comparison with QMD

The user asked how closely the current concept matches QMD. Comparison uses the inspected QMD revision above and our planned features; our repository does not yet implement those features. No numeric overlap percentage is claimed because feature counts do not measure effort or product equivalence.

Substantial overlap exists in local Markdown collections, CLI/structured output, keyword and future vector retrieval, bounded document reads, and configurable metadata filtering. QMD already provides namespaced YAML frontmatter metadata under `qmd.metadata`, user-defined keys, multi-value arrays, logical and presence filters, and discovery of indexed keys and values. Freely named dimensions and an agent-friendly metadata inventory alone therefore do not distinguish our proposal.

Partial overlap:

- QMD discovers observed metadata from its index; our proposal maintains an authored, repo-resident vocabulary map with descriptions and consistency/repair tooling.
- QMD supplies path/collection context descriptions and bounded reads; our proposal includes graph-based orientation, declared detail levels, and scope-based guidance. These are related goals, not equivalent mechanisms.
- QMD uses content-derived short document references; our proposed stable frontmatter IDs survive content edits and support maintained relationships.
- QMD doctor diagnoses installation, runtime, vector backend, and embedding state; our doctor is intended to check authored knowledge structure, including dangling IDs, broken file links, and metadata-map inconsistencies.

The inspected CLI and source did not expose equivalents of our planned typed-edge authoring/traversal, backlink operations, frontmatter mutation/repair workflow, or graph/outline visualization UI. QMD's existing HTTP/MCP endpoints are not a graph visualization UI. This is a finding about the inspected revision, not a guarantee about all extensions or future versions.

QMD is ahead of our immediate scope in search infrastructure: embeddings, hybrid retrieval, reranking, model handling, and persisted indexes are implemented there. Our primitive phase intentionally defers much of this. Git history is compatible with both and is not a differentiator. Rust versus TypeScript is an implementation decision, not a unique user capability.

Assistant assessment: our strongest distinctive work is the file-native knowledge management and graph layer: stable identity, explicit connections, declared vocabulary, reliable edits, integrity checks, and navigation. Building only search plus metadata would substantially recreate QMD. Consider focusing the first milestone on these distinctive primitives and using QMD as a retrieval baseline or optional backend later. An integration would require mapping our IDs and metadata to QMD's fields and keeping its index fresh; it is not a drop-in dependency. No integration, fork, or scope change is selected.

Additional source references:

- [QMD metadata filtering and discovery](https://github.com/tobi/qmd#metadata-filtering)
- [QMD metadata parser at inspected revision](https://github.com/tobi/qmd/blob/93d211f9ef4a869a9aed0d075ca767dda552627f/src/metadata.ts)
- [QMD CLI at inspected revision](https://github.com/tobi/qmd/blob/93d211f9ef4a869a9aed0d075ca767dda552627f/src/cli/qmd.ts)

## Human navigation priorities and fork assessment

The user emphasizes two priorities: human glanceability/readability as knowledge grows, and explicit relationships between files and sections so humans and agents can traverse the project. The user asks whether these priorities favor forking QMD. No fork or integration is authorized or selected by that question.

Additional inspection confirms QMD exposes an importable TypeScript SDK through `@tobilu/qmd`, including `createStore`, search, indexing, and document retrieval. This makes composition possible without beginning with a fork. QMD's inspected package is TypeScript/Node with native inference and SQLite dependencies; a fork would inherit this stack rather than produce the proposed standalone Rust implementation.

Assistant recommendation: reuse QMD retrieval behind a small adapter and develop the knowledge graph/reader as our own layer before deciding to fork. A fork becomes justified if a concrete required capability demands changes to QMD internals, such as unsupported metadata extraction or precise stable-section retrieval. These needs should be demonstrated in a small integration experiment, not assumed. Upstream fixes may also be possible; no outreach is authorized.

The graph representation should distinguish authored nodes and sections from derived embedding chunks. Chunk boundaries can move after edits or preprocessing changes, so embedding chunk positions/hashes should not be canonical graph identities. Proposed persistent section IDs or explicit anchors live in Markdown, with graph links targeting file/node IDs plus section IDs. Exact anchor syntax remains undecided. Search results would be mapped to authored sections using paths and offsets where available; mapping capabilities need testing.

Human readability proposal: a reader/outline as the primary surface, with selected-node graph neighborhoods, collapsed groups, and progressive expansion. Showing the whole graph is not sufficient evidence of glanceability. These are proposals refining the user's stated priority, not new accepted UI details. The earlier delay of UI implementation remains in place unless explicitly changed.

Options considered:

- Fork QMD: reuse retrieval and have full internal control, but maintain a divergence and inherit its runtime/storage/model stack; graph authoring and views still need implementation.
- Compose with QMD SDK: keep upstream retrieval reusable and graph semantics independently owned; native TypeScript integration is simplest, while a Rust layer would need a process/HTTP boundary.
- Build standalone Rust: retain packaging and implementation control but take on retrieval/model work QMD already implements.

Proposed next proof: a small set of linked Markdown files with stable section references, a basic reader plus focused graph, and QMD search results that navigate to the corresponding sections. This is a recommendation for assessing integration, not an executed implementation or a change to the deferred UI scope.

Source: [QMD public SDK at inspected revision](https://github.com/tobi/qmd/blob/93d211f9ef4a869a9aed0d075ca767dda552627f/src/index.ts), [package exports and runtime dependencies](https://github.com/tobi/qmd/blob/93d211f9ef4a869a9aed0d075ca767dda552627f/package.json).

## SDK direction and storage layout

The user favors the QMD SDK approach and asks where its data is saved. SDK reuse is now the preferred integration direction; this is not a decision to fork. The earlier Rust recommendation is no longer a settled implementation plan; language and adapter boundaries must account for the TypeScript SDK.

Source inspection confirms the public SDK requires an explicit `dbPath`. The CLI default `~/.cache/qmd/index.sqlite` is not an unavoidable SDK destination. Original files stay in configured collection directories. SQLite stores indexed document content/metadata, text and vector search structures, embedding records, cached model outputs, and collection/context state. Collection configuration can come from an explicit YAML `configPath` or an inline object; DB-only reopen is supported. Inline config is not automatically an authored manifest on disk, so our app should retain canonical collection configuration separately.

Models default to `$XDG_CACHE_HOME/qmd/models` or `~/.cache/qmd/models`. This cache is separate from `dbPath`. The public `createStore` options do not expose a `modelCacheDir`; lower-level LlamaCpp configuration has one, and XDG_CACHE_HOME influences the default at module initialization. Do not imply changing `dbPath` also moves models or that an unsupported SDK option exists.

Proposed app layout: authored Markdown nodes, metadata map, and collection config inside the repository; a Git-ignored `.knowledge/cache/qmd.sqlite` and SQLite sidecars for derived data; shared model cache outside each repository to avoid duplicated model weights. The exact directory names remain proposals. Deleting the cache should preserve authored knowledge and allow rebuilding, provided collection config and any curated context descriptions are also retained in files instead of existing only in QMD's database. A QMD-backed search requires its database even though direct file reads and our primitive file operations can remain independent.

## First implementation milestone

The user authorized implementation. The first milestone uses TypeScript on Node.js to integrate the published QMD SDK directly. Rust and a QMD fork are not part of this implementation. `kw` remains the working CLI name.

Implemented source layout:

- `src/core.ts`: manifest/vocabulary loading, Markdown frontmatter parsing, stable-ID lookup, authored section anchors, graph traversal, deterministic filters, structural diagnostics, and file mutations.
- `src/cli.ts`: init, id generate/assign, create, map, query, read, related, link/unlink, set, rename, doctor, fix, meta show/sync, search, index, context, and Git history commands.
- `src/qmd.ts`: lazy SDK integration for keyword indexing/search, with project-local cache storage and mapping back to authored node IDs.
- `examples/demo`: a two-node knowledge graph with explicit section references and file-pattern guidance, runnable without modifying the user's project knowledge.
- `test`: core and subprocess CLI tests, including real QMD indexing/search across edits, deletions, and removed collection roots.

The actual manifest is `.knowledge/config.yaml`; it declares roots, the vocabulary file path, and optional explicit guidance rules. The QMD collection object is generated from that manifest rather than saved as a second independently maintained config. Derived QMD data lives in `.knowledge/cache/qmd.sqlite`. Metadata defaults to `knowledge/meta.yaml`; nodes default to `knowledge/nodes`. Init creates a cache ignore rule. No commands download embedding models or create Git commits.

The published npm `@tobilu/qmd` 2.8.3 artifact differs from the newer repository revision inspected during planning: its SDK exposes fewer metadata APIs. The adapter uses only verified published APIs. Dimension filtering/discovery is implemented directly over our frontmatter. SDK configuration synchronization can retain old indexed documents after a collection is removed, so every search is explicitly restricted to the currently configured roots; collection identifiers derive from root paths to avoid reassignment when roots are reordered.

The current output budget uses bytes and result/line limits rather than pretending to know model-specific token counts. Context returns discovery cards with inclusion reasons, explicit omissions, and required-guidance budget conflicts; agents must read the actual nodes for full guidance. No semantic classification or synthesis is implemented. Section references use readable `{#section-id}` annotations on headings, parsed with a Markdown syntax tree so headings inside code fences do not become sections.

File mutation preserves Markdown bodies and unrelated top-level YAML pairs. Modified fields may be reformatted. Cooperating CLI locks, content-change checks, and temporary-file replacement reduce write conflicts, but external editors can still race the last check. Flow-style frontmatter editing is rejected. Safe repair only assigns missing IDs and converts scalar text dimensions to lists. Vocabulary registration is explicit and previews by default.

UI and embedding/vector commands remain deferred. The existing dependency tree reports npm audit high/critical advisories through QMD's transitive packages; no compatible automatic fix was available. Shell update hooks and model download/build commands are not exposed by this CLI. The README documents this limitation and the supported interfaces.

## Repository skills and maintenance rule

The user requests a repository skill folder containing the skill for using the tool, with an agent rule requiring it to stay current with the API. Later additions may include opinionated use-case workflows and automatic knowledge-injection skills; those are future work, not authorization to implement injection now.

Implemented `skills/use-kw/SKILL.md` as the baseline tool-usage skill with a linked `references/cli.md` for the current command, file-format, and output contract. Root `AGENTS.md` requires synchronizing the skill and relevant references in the same change as observable CLI/API changes, verifying affected examples, and updating the README where applicable. Internal changes require checking accuracy but not cosmetic documentation edits. Future opinionated and injection skills belong in separate folders under `skills/`; the baseline does not impose those workflows. The skill is repository-owned and has not been installed globally.

## Knowledge map UI interview

The user requests the first knowledge-map exploration UI and explicitly invokes the grilling interview skill. Implementation is held until the design tree is resolved and the user confirms shared understanding, as required by that skill. A read-only subagent is checking existing code and data constraints; no UI code is being changed during the interview.

The initial decision frontier covers opening experience, visible graph units, read-only versus editing scope, target collection size, and device support. Proposed defaults are a map-led workspace with a persistent reader, nodes first with expandable sections and file references, read-only exploration, useful browsing up to roughly 1,000 nodes through bounded views, and desktop-first operation. These are questions/recommendations, not accepted decisions. Later questions about grouping, filtering, relationship visibility, navigation, layout persistence, live updates, and implementation depend on these answers and the code inspection.

### UI interview round one accepted

The user answered yes to all five recommendations: map-first with a persistent reader; knowledge nodes initially with expandable sections/file references; read-only exploration (visual dragging does not change knowledge); useful navigation around 1,000 nodes through bounded/grouped views; desktop-first.

Read-only code inspection confirms reusable graph/file primitives exist, while pagination/read orchestration remains CLI-specific. The demo contains only two nodes. Section-qualified targets need resolving to parent nodes for collapsed graph display. File references currently have no content-serving API. Missing/duplicate IDs and parse failures are representable and must not silently disappear from the UI.

The next frontier asks about grouping control, selection versus refocusing, edge visibility, search/filter interaction, external file refresh, referenced-file behavior, diagnostics, and visual direction. Proposed defaults are user-selectable grouping by an existing dimension with type fallback; click to read and an explicit neighborhood focus action; selected-neighborhood edge emphasis; live title/description search with separate full-text search and dimension/type/relation filters; automatic refresh preserving navigation; referenced-file text previews; visible diagnostics with identifiable unresolved references; and a restrained light/dark interface with color assigned to the selected grouping. None of these round-two defaults is accepted yet.


### First explorer implementation authorized

The user asks whether remaining questions affect the CLI core or only the UI,
and delegates UI choices to the recommended defaults to get the first version
out. This resolves the interview hold: implementation is authorized without
further UI preference questions.

Core additions are reusable read projections of the existing graph, resolution
of section-qualified targets, bounded referenced-file previews, and a loopback
HTTP server started by `kw view`. Existing frontmatter, IDs, freely chosen
vocabulary, mutation rules, and QMD keyword-search semantics remain in place.
No review workflow, embeddings, automatic classification, or new persistent
knowledge format is introduced.

Implemented UI decisions:

- React and Vite build the local UI; Node's HTTP server shares the CLI project
  loader. `kw view --port 4317` prints the URL, serves locally, and stays running.
  No hosting/deployment or automatic browser launch.
- A map-first workspace with a persistent reader and desktop-first responsive
  layout. A restrained light/dark theme, distinct category colors, and details
  that expose UUIDs only under source/identity.
- Group by type or existing dimensions; a multi-value node appears in every
  matching group while retaining one canonical identity. This is a display
  choice, not a new classification or a duplicated knowledge file.
- Selection leaves the camera alone. Explicit neighborhood focus and reset
  change the view. Pan/zoom/fit are visual only; no node-position authoring or
  force-layout dependency is introduced for this first version.
- Initially three cards per group, with expansion bounded to 160 visible cards
  and 1,200 drawn connections. Hidden members' links terminate at their group
  header; diagnostics and the reader retain unresolved link information.
- Live title/description filtering is separate from an explicit QMD full-text
  request. Full-text results locate nodes; filters use authored type, dimension,
  and relation values.
- The reader follows node and anchored-section links, exposes connections,
  expands section/file lists, and previews explicitly referenced UTF-8 files
  within the project. Markdown HTML/images are not rendered or executed.
- Poll graph changes every 2.5 seconds and preserve camera/selection/groups;
  briefly highlight changed nodes, retain an unavailable-selection notice when
  a document disappears, and keep good files readable amid diagnostics.
  Source-file contents refresh when opened or when the graph changes; they are
  not independently watched in this first version.
- Theme/grouping preferences are browser-local. Parsed graph state is a
  disposable in-memory stat-keyed cache; bodies/file pages load on demand.
  Full-text search uses the existing rebuildable local SQLite cache.

A separate 20-node explorer example exercises grouping, multi-membership,
section links, source previews, and cross-type relationships. Testing includes
malformed/ambiguous/dangling data, file boundaries, HTTP read-only/origin behavior,
and a synthetic 1,000-node graph. The existing CLI suite remains applicable.
Browser checks use a temporary copy so interaction tests do not mutate the demo.

The product's primary success criterion remains the user's qualitative sense
that this supplies better understanding than unwieldy Markdown alone. A working
map is an initial probe of glanceability and traversal, not proof that retrieval
or agent understanding has improved. Later choices about force layouts, richer
file/section visualization, source precedence, and vector retrieval remain open.

Validation of the first explorer passed: existing CLI/core tests plus explorer
projection, file-preview boundary, HTTP boundary, cache invalidation, and
1,000-node snapshot tests. Headless browser checks exercised group expansion,
anchored relationship navigation, neighborhood focus, file preview/backlinks,
QMD search, multi-value dimension filtering, direct edits/deletions, preserved
camera state, diagnostics, light/dark themes, and a narrow viewport. They also
checked freely named dimensions such as `constructor` and `type` to ensure UI
implementation keys do not constrain the authored vocabulary.

A synthetic 1,000-node browser check confirmed the 160-card expansion cap and
three-node neighborhood for a ring graph; a warm graph request took about 27 ms
in this environment. Cold scan/projection tests were approximately 0.7–0.9 s.
These are local observations, not performance guarantees or evidence of improved
agent understanding. The shared T3 preview host was unavailable, so visual and
interaction checks used a temporary headless browser after its explicit
unavailable response. No public site was created.


## Git-based installation and skill request

The user chooses direct installation from Git for now, with a shell script they
can run locally and rerun after changes. Versioned release archives and a GitHub
Actions release pipeline were considered but are deferred; neither is needed
for this approach.

Implemented `install.sh` for macOS/Linux with existing Git, Node.js 22.12+, and
npm. It fetches the remote default branch (or an explicit repo/ref), installs
locked dependencies, builds CLI/UI in a fresh managed directory, and atomically
switches the command only after successful validation. Defaults are
`~/.local/bin/kw` and `~/.local/share/kw`. Failed reinstalls preserve the working
version; successful ones remove the previous managed build. No sudo or shell
profile modifications. Reinstallation consumes committed Git state, so remote
installs require changes to be pushed. Existing explorer processes should be
restarted after an update. The usage skill and README document this contract.

The user also explicitly requests installation of
`https://github.com/ChrisMarxDev/chris-skills/tree/main/.skills/git-sync`.
Installed through the system skill-installer into `/root/.codex/skills/git-sync`;
it is available on the next turn. Installing this skill does not itself request
running a Git synchronization, committing changes, or pushing this workspace.

Installer validation: shell syntax and formatting checks passed. Regression tests
cover install/reinstall from a temporary Git repository, paths with spaces,
explicit commit selection, failed fetch/build rollback, unrelated executable
protection, and overlapping install rejection. A separate real source snapshot
completed dependency installation and the CLI/UI build, ran the installed
`kw doctor` against the unchanged explorer demo, and served its UI/graph through
the installed `kw view`. Temporary installations were removed after verification.
The current workspace changes have not been committed or pushed by this task.


## First-use skill onboarding

The user requests that the knowledge-tool skill, when the repository is not
initialized, ask to initialize the whole repository using its other Markdown
and concept files referenced in the agent setup. This updates the repository-owned
`use-kw` skill; it does not request executing `git-sync` or initializing this
workspace immediately.

The skill now discovers a concrete repo-wide source scope before asking, including
local documentation references from agent instructions/configuration. Upon approval,
it initializes at the repository root and incorporates the agreed knowledge,
keeping originals in place by default. Missing/out-of-repository references are
reported rather than silently imported. Existing, invalid, and partially created
collections are distinguished from absent setup; existing scope is not expanded
automatically. The user can decline. The CLI `init` primitive remains an empty
collection initializer; discovery/import is explicitly an agent-assisted workflow.
No new opinionated skill or automatic injection hook was added.


## Install the usage skill through npx

Verified the official Vercel `skills` CLI documentation: `npx skills add`
(plural) accepts GitHub shorthand and SSH Git URLs. Added a README command
selecting this repository's `use-kw` skill, scope/agent options, and a local-path
alternative. This installs instructions separately from the executable.
Local `--list` discovery successfully found `use-kw` without installing it.
Source: https://github.com/vercel-labs/skills#source-formats

## Publish the implementation to main

The user explicitly requests pushing all current work to `main`. This authorizes
committing the implementation, explorer, installer, usage skill, examples, tests,
and accumulated documentation together, integrating upstream changes and pushing
the current `main` branch. No release or release pipeline is part of this action.


## Graph-first UI simplification

The user requests replacing the large header with a single search-height row
containing search and grouping, making both sidebars collapsible and resizable,
and matching T3-style panel icons. Implemented a 52px toolbar with search,
grouping, and outlined left/right panel toggle icons. Removed breadcrumbs,
intro/title/status banners, and the header filter/count row. Dimension/relation
filters and counts remain available in the left sidebar; reset is also available
on the graph when narrowed.

Both panels independently collapse and resize using pointer drags or keyboard
arrows (Home/End reach the limits). Visibility and preferred widths persist in
browser-local storage. Widths are bounded to retain graph space; narrow screens
use one overlay panel at a time, with panels closed by default on first use.
Selecting a node/file or opening diagnostics reveals the reader. Resizing keeps
the graph's current zoom and center rather than repeatedly fitting it.

Validation: TypeScript checks and production build pass. The shared browser
could reach the user's pre-existing localhost server but not the workspace's
new server, so layout checks loaded the exact compiled UI with demo API responses
in an isolated preview. Checks covered the 52px toolbar, independent collapse,
both pointer resize handlers, keyboard resizing, full-width graph, stable zoom,
reader navigation, a storage-fixture remount, and a 390px mobile layout. No UI
errors were observed. No changes were made to the user's running project data.
