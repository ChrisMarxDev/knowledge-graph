<img src="assets/icon.svg" width="64" height="64" alt="">

# Agent knowledge wiki

A local Markdown knowledge graph with a CLI for reading, linking, editing, and
checking project knowledge. QMD's SDK supplies keyword search. The file format
and ordinary CLI commands work without an index or model downloads.

The CLI includes a read-only local knowledge explorer. Embedding generation and
vector search are deferred. Types, dimensions, and relationship names are
project-defined.

Agents can use the repository-owned [use-kw skill](skills/use-kw/SKILL.md).
[AGENTS.md](AGENTS.md) requires its instructions and references to stay in sync
with the CLI/API. Optional templates bundle vocabulary, guide nodes, and separate
workflow skills.
The `coding` starter includes `capture-intent` and a vocabulary-neutral `retro`
skill. Automatic knowledge injection is not implemented.

## Install the agent skill from Git

The [`skills` CLI](https://github.com/vercel-labs/skills#source-formats) supports
Git repositories directly; no release or npm publication of this project is needed.
The command is `npx skills add` (plural):

```sh
npx skills add ChrisMarxDev/knowledge-graph --skill use-kw
```

Run it in the project where you want the skill. Add `--global` for user-wide
installation, or `--agent codex` to target Codex. For SSH access:

```sh
npx skills add git@github.com:ChrisMarxDev/knowledge-graph.git --skill use-kw
```

The skill files must first be committed and pushed. From a local checkout, use
`npx skills add ./skills --skill use-kw` to include local changes immediately.
This installs agent instructions; install the `kw` executable separately below.

## Install or reinstall from Git

Requires Git, Node.js 22.12+, and npm on macOS or Linux. No release or sudo is
needed. From a checkout, run:

```sh
sh install.sh
export PATH="$HOME/.local/bin:$PATH"  # Add to your shell profile if needed
kw --help
```

Rerun `sh install.sh` after changes are pushed. It fetches the remote default
branch into a fresh directory, installs locked dependencies, builds the CLI and
UI, and atomically replaces `~/.local/bin/kw` only after the build succeeds.
Failed reinstalls retain the working version. Successful reinstalls remove the
previous managed build. Restart any running `kw view` server after updating.
This installs committed Git state, not uncommitted files in your checkout.

For a branch, SSH authentication, or a different prefix:

```sh
sh install.sh --ref main
sh install.sh --repo git@github.com:ChrisMarxDev/knowledge-graph.git
sh install.sh --repo /path/to/local/git/repo --ref my-branch --prefix "$HOME/tools"
```

The default repository is `https://github.com/ChrisMarxDev/knowledge-graph.git`.
`--ref` accepts a branch, tag, or commit (default `HEAD`). `--prefix` defaults to
`~/.local`, with the executable in `bin/kw` and managed builds in `share/kw`.
`KW_REPO`, `KW_REF`, and `KW_PREFIX` supply environment defaults. Existing Git
credentials or an SSH agent can authenticate private repositories. An unrelated
existing `bin/kw` is never overwritten. The installer leaves shell profiles and
project knowledge untouched. QMD's native dependencies may require a build
toolchain; build dependencies are retained with this initial source installer.

For local development and testing, install the current checkout with Task:

```sh
task install
export PATH="$HOME/.local/bin:$PATH"
command -v kw
```

This installs dependencies, builds the CLI and UI including uncommitted changes,
and links `~/.local/bin/kw` to this checkout for use from any project. Keep the
checkout in place and rerun `task install` after edits. Restart running `kw view`
servers. It can replace this checkout's link or a managed `install.sh` install;
unrelated executables are refused. Previous managed builds are retained.
Use `KW_PREFIX=/path/to/prefix task install` for a different destination.
To return to the Git installer, remove the checkout's `kw` symlink first.

Once `install.sh` is pushed, it can also be downloaded without a checkout:

```sh
curl -fsSL https://raw.githubusercontent.com/ChrisMarxDev/knowledge-graph/HEAD/install.sh -o install-kw.sh
sh install-kw.sh
# Later, download the script again and rerun it to get installer changes too.
```

For a private repository, use an authenticated checkout and run its script.

## Run

Requires Node.js 22.12 or newer and npm. QMD includes native dependencies;
installation may use platform binaries or require a native build toolchain.

```sh
npm ci
npm run build
node bin/kw.js --help
node bin/kw.js --project examples/demo map
node bin/kw.js --project examples/demo related refunds
node bin/kw.js --project examples/demo read refund-idempotency#retry-behavior
node bin/kw.js --project examples/demo search idempotency
node bin/kw.js --project examples/demo doctor
```

`npm run dev -- <arguments>` runs from TypeScript. `npm link` optionally installs
`kw` on your PATH after building. Commands below use that shorter name.

## Explore the graph

```sh
npm run build
node bin/kw.js --project examples/explorer view
# Open http://127.0.0.1:4317
# From your project directory with kw installed:
# kw view --port 4400
# Or: kw --project /path/to/project view --port 4318
```

`view` serves the built React interface and a read-only API on `127.0.0.1`.
`--port` defaults to `4317`; `0` chooses an available port. The command prints
its URL, opens your default browser, and stays running until Ctrl+C. Use
`--no-open` for headless or remote sessions. If opening fails, the server stays
available at the printed URL and a warning is written to stderr.
Build first, including when running `view` through `npm run dev`.

To give visual feedback, click **Annotate UI** at the bottom of the left sidebar.
Open the Agentation toolbar, select an element, add a note, then **Copy** and paste
the feedback into your coding-agent chat. The feedback text is also selectable
in the help panel if clipboard access fails. **Done** exits annotation mode.
This works in installed builds, loads on demand, and requires no account or MCP
server. Notes remain in browser-local storage, scoped by project and origin;
Agentation retains them for seven days. Copy them elsewhere to keep them.
Graph nodes are drawn on one canvas: include node names in graph-related notes.
DOM controls and reader elements can be targeted individually. No automatic
agent delivery, model training, or repository edits are performed.

The reader spans the full right edge and stays hidden without a selected node,
file, or diagnostics. Its top bar switches between **Details** and **Connections**.
Type and dimensions share compact colored chips; the section index is collapsed
by default so the document starts immediately below the introduction. Neighborhood
focus is an icon in the reader header. Old saved pin flags are ignored.

Both sidebars overlay the central workspace at every screen size, including the
search toolbar. Opening, closing, or resizing them leaves the graph viewport,
node positions, and search-bar geometry unchanged. Their widths are independent;
narrow screens still show at most one sidebar at a time.

The explorer provides:

- A single compact filter/color toolbar above the graph. Both sidebars can
  collapse using the panel icons at the top of the screen and resize by dragging
  their inner edges (or focusing a divider and using arrow keys). Widths and open/closed state
  persist locally. Extra dimension/relation filters live in the left sidebar.
- A connection-driven Cytoscape.js/fCoSE network and persistent Markdown reader.
  Each document appears once. Click a node to read and emphasize its immediate
  neighbors; click empty canvas to clear the emphasis. The neighborhood icon
  explicitly narrows the graph. Sections and file references remain in the reader.
- **Color by** type or any existing dimension. Legend chips highlight memberships
  without moving nodes. Multi-value nodes have a double border; their full set
  appears on hover and selection. Color uses the first sorted value. No types
  are built in.
- **Overview** aggregates nodes with identical complete membership sets, with
  directed relationship counts (including internal self-loops). Click a group
  to expand it; click Overview again to collapse all. **Network** shows individuals.
- Drag a node to move it. **Arrange** runs fCoSE in a cancellable background
  worker and can reposition every node. Positions are saved locally per
  project and origin. Metadata/color changes retain positions; newly added nodes
  can trigger arrangement. **Fit** adjusts the camera without rearranging nodes.
- A searchable filter combobox with removable text/type/dimension chips and
  **Include / Exclude** modes. Values within a field match with OR; fields combine
  with AND; exclusions always subtract matching nodes, including multi-value
  nodes. Toggle a chip's sign or remove it. Arrow keys/Enter select suggestions;
  Escape closes the menu; Backspace on an empty input removes the last facet.
  Enter commits plain text as a title/description filter. Chips narrow the current
  graph without editing view YAML. Saved views open from the sidebar in the same
  explorer, with their description and breadcrumb; no duplicate page headline. The combobox and graph
  tools work identically; clearing filters keeps the view selected. The Knowledge
  map breadcrumb returns to the full collection.
- **Search document contents** in the dropdown uses QMD keyword search and
  respects the active view, metadata filters, and neighborhood/relation filters.
  It searches bodies rather than requiring the text to match a title. The **Nodes**
  menu provides keyboard access even with the left sidebar closed.
- Compact wrapped node titles with canvas-colored backgrounds. Hover cards show the full
  title, description, dimensions, section/file/connection counts, and file path.
  Automatic Fit caps magnification at 135%; manual zoom can still reach 300%.
  Small dots inside nodes encode dimension values independently of the main
  fill. Colors match the hover card and **Dimension dots** legend. Up to four
  values are shown; for more, three dots and a + marker indicate additional values.
- Directed relationships, zoom-dependent labels, diagnostics, unresolved-link
  counts, and bounded previews of referenced project files. Missing/ambiguous
  targets remain in diagnostics and reader connections; missing-section edges
  to known documents are dashed. Clicking a resolved individual edge opens its
  target/section. File previews include backlinks.
- Automatic graph refresh roughly every 2.5 seconds, preserving selection and
  camera. Changed nodes briefly highlight; removed/unparseable selections show
  a notice. Light/dark theme and dimension choice persist locally. The UI never
  writes authored knowledge.

The old 160-card/1,200-edge truncation is removed. All filtered nodes and resolved
endpoints participate; use Overview, filters, and neighborhood focus for large
maps. Layout runs off the UI thread, with lower iteration budgets for larger
networks; this is not a guarantee of interactive rendering at arbitrary scale.
Bodies load on demand in 48,000-character pages and referenced files in up to
48,000-byte pages.
Images and raw HTML in Markdown are not rendered; external links open separately.
Source-file previews are refreshed when opened or when the knowledge graph changes.

`examples/explorer` is a separate 20-node example with four project-defined types,
multi-value dimensions, section links, and an illustrative source file. The
original small `examples/demo` remains useful for CLI examples.

## Initialize a collection

When the `use-kw` skill encounters an uninitialized repository, it inventories
project Markdown and concept/design documents, including local files referenced
by the agent setup, and asks whether to initialize repo-wide knowledge from that
concrete scope. After approval, it creates the collection and incorporates the
agreed sources, preserving original documents by default. External knowledge is
not included automatically. See the skill's
[initialization workflow](skills/use-kw/references/initialization.md).

The CLI command itself creates an empty collection; it does not import documents:

```sh
kw --project /path/to/project init
```

This creates `.knowledge/config.yaml`, `knowledge/meta.yaml`, and an empty
`knowledge/nodes/` directory, without overwriting existing files. Subsequent
commands find configuration from the current directory or `--project`, walking
up through parents. Paths in the manifest resolve against the project directory
containing `.knowledge/`, not against the current shell directory.

```yaml
# .knowledge/config.yaml
version: 1
roots: [knowledge/nodes]
meta: knowledge/meta.yaml
guidance: []
```

Add other knowledge directories only by explicitly editing `roots`. File writes
are restricted to those roots. Symlinks are not followed by the graph scanner.

## Node format

```yaml
---
id: refunds
title: Refunds
type: capability
description: How refund requests behave when retried.
dimensions:
  module: [server, web]
  discipline: [engineering, design]
links:
  - relation: governed_by
    target: refund-idempotency#retry-behavior
files:
  - src/refunds.ts
---
```

The body is normal Markdown. The `id` is stable across edits and filenames;
`kw id generate` produces a UUID, and `kw id assign <file>` fills a missing ID
in an existing frontmatter mapping. Existing IDs are never silently replaced.

Dimensions have freely chosen keys and lists of text values. Use one key with
multiple values rather than repeated YAML keys. Optional vocabulary schemas let
`doctor` analyze allowed dimension values and type-specific required fields.
These rules are advisory, not write restrictions. `files` contains paths relative
to the project root. Unlike node links, file paths do not survive renames automatically.

Section targets use explicit IDs in headings:

```markdown
## Retry behavior {#retry-behavior}
```

A link to `refund-idempotency#retry-behavior` remains valid when the heading text
changes, provided the explicit ID remains. Heading IDs must be unique within a
file. These are authored sections, not QMD embedding chunks. The annotation is
readable Markdown text; not every Markdown renderer renders it as an HTML anchor.

## Cite source material

Nodes can cite supporting evidence without importing it into the graph:

```yaml
sources:
  - kind: url
    target: https://example.com/api#rate-limits
    title: API documentation
    note: Explains the retry constraint.
  - kind: file
    target: docs/design.md
    locator: Retry behavior
  - kind: reference
    target: Maintainer discussion
    locator: 2026-10-11
```

```sh
kw source add NODE_ID url https://example.com/api --title 'API documentation'
kw source add NODE_ID file docs/design.md --locator 'Retry behavior'
kw source list NODE_ID
kw source remove NODE_ID file docs/design.md --locator 'Retry behavior'
```

Source references are separate from conceptual `links` and existing `files`
associations. Optional titles, locators, and notes explain the evidence. Doctor
checks reference structure and local file paths without fetching URLs. The
explorer shows citations, opens web links, and previews referenced text files.
File sources also participate in `context --file` with reason `source-file`.
No source ingestion, indexing, automatic revision tracking, or remote fetching
is involved. See the [source reference contract](skills/use-kw/references/sources.md)
for update identity, JSON, validation, and supported targets.

## Vocabulary map

A complete `knowledge/meta.yaml` example (no vocabulary is built into the application):

```yaml
types:
  capability:
    description: A feature or system provided by the project.
dimensions:
  module:
    description: Modules to which this knowledge relates.
relations:
  governed_by:
    description: Connects a subject to its implementation guidance.
```

Unknown vocabulary stays readable and queryable. `doctor` reports it.

```sh
kw meta show
kw meta sync                    # Preview newly observed names
kw meta sync --apply            # Register them with empty descriptions
```

Sync preserves existing definitions. It does not decide whether new spellings
are typos; inspect the proposed names before applying or have an agent reconcile
them. Optional descriptions can be edited directly in YAML.

## Optional schemas and templates

Keep project conventions in the vocabulary map. Definitions may add a `schema`
parameter; collections without one behave as before:

```yaml
types:
  concept:
    description: An approach or mechanism.
    schema:
      required: [description]
  dismissed-concept:
    description: An approach considered and rejected.
dimensions:
  evidence:
    description: Support for a claim's origin.
    schema:
      values: [confirmed, inferred, unknown]
relations:
  depends_on:
    description: An implementation dependency.
    schema:
      from: [concept, dismissed-concept]
      to: [concept, dismissed-concept]
      forbidden:
        - from: concept
          to: dismissed-concept
      allowSelf: false
      maxOutgoing: 3
```

`doctor` reports schema violations and malformed schema rules as warnings.
`create`, `set`, and `link` remain available even when they produce violations;
`fix --safe` never changes knowledge to satisfy schemas. Existing structural
checks still apply. No type or relationship has built-in domain meaning.

Templates add vocabulary, skills, and predefined nodes to an initialized
collection. Inspect and preview before applying when useful:

```sh
kw template list
kw template show coding
kw --project /path/to/project init  # Only if no collection exists
kw --project /path/to/project template apply coding
kw --project /path/to/project template apply coding --apply
kw --project /path/to/project doctor
```

`coding` supplies project, concept, dismissed-concept, decision, constraint,
incident, question, and project-template types; area/evidence/status dimensions;
and relationships for alternatives, rejection reasons, implementation,
dependencies, and replacement. Its three predefined nodes are reusable project,
intent, and retro guides, not invented facts about your project.

The template copies [`capture-intent`](skills/capture-intent/SKILL.md),
[`retro`](skills/retro/SKILL.md), and `use-kw` into the project's `skills/` folder.
Capture-intent supplies coding conventions; retro uses the collection's own
vocabulary. Skills can be referenced or installed through the agent's normal
mechanism. Template application does not edit agent configuration or add hooks.

Application previews by default; `--apply` writes and `--dry-run` takes
precedence. Existing definitions and files are reused only when identical;
conflicts prevent all writes and return exit code 1. New nodes go into the first
configured knowledge root, with their stable IDs retained. Vocabulary is merged
additively, preserving unrelated YAML. Reapplying an unchanged bundle is a no-op;
there is no automatic template upgrade or overwrite operation.

Local template directories and Git folders are also supported. A folder with
`meta.yaml` and `nodes/` can be copied without a template manifest:

```sh
kw template show https://github.com/ChrisMarxDev/knowledge-graph/tree/main/examples/demo/knowledge
kw --project /path/to/project template apply https://github.com/ChrisMarxDev/knowledge-graph/tree/main/examples/demo/knowledge --apply
# Explicit repository, ref, and folder (also supports SSH):
kw template show https://github.com/ChrisMarxDev/knowledge-graph.git --ref main --folder templates/coding
```

Git sources use temporary shallow checkouts and report their resolved commit.
Use `--ref COMMIT` to pin a reviewed version. Copies preserve IDs and references;
source code is not imported, so check file links and missing targets with
`doctor`. This adds no live cross-collection references or automatic updates.
Local working folders still work with `kw template apply ./my-template --apply`.
See the
[schemas and templates reference](skills/use-kw/references/schema-templates.md)
for bundle layout, exact rule semantics, diagnostics, and JSON results.

## Read and query

```sh
kw map --limit 20 --offset 0
kw query --type capability --dimension module=web
kw query --dimension module=web --dimension module=server
kw query --missing description
kw query --filter '{"op":"or","filters":[{"field":"type","op":"eq","value":"rule"},{"field":"dimensions.module","op":"in","value":["server","cli"]}]}'
kw read refunds --detail overview
kw read refunds --section user-experience
kw read refunds --from-line 1 --lines 30 --max-bytes 4000
kw related refunds --direction both --depth 2 --limit 30
kw related refunds --relation governed_by
```

Repeated dimension flags combine with AND; each matches membership in a node's
list. Filter operators are `eq`, `in`, `exists`, `and`, `or`, and `not`. Use
`dimensions.NAME` to select a dimension. Missing fields never match equality or
membership. `exists` requires a boolean; `not` takes exactly one child filter.
Matching is exact and case-sensitive. No classification model runs.

Query and map return `nextOffset`; map pages vocabulary and nodes independently
with the same offset. Reads return `nextLine`, relative to the selected section
if a section was requested. The byte budget applies to the returned body, not
JSON metadata. A line larger than the budget is omitted with a continuation
notice; increase the budget to read it. Overview mode lists metadata and sections.

## Author and repair

```sh
kw create knowledge/nodes/refunds.md --title Refunds --type capability \
  --dimension module=server --dimension module=web
kw set refunds description '"Refund request behavior"'
kw set refunds dimensions.module '["server","web"]'
kw set refunds files '["src/refunds.ts"]'
kw link refunds governed_by refund-idempotency#retry-behavior
kw unlink refunds governed_by refund-idempotency#retry-behavior
kw rename refunds knowledge/nodes/customer-refunds.md
kw doctor
kw fix --dry-run
kw fix --safe
kw history refunds --limit 10
```

`create` generates and returns an ID; use that ID in subsequent commands, or use
the file path. The short IDs above correspond to the checked-in demo.

Metadata edits preserve the body and unrelated top-level YAML pairs, including
unknown fields. Modified fields are serialized again; comments or formatting
inside those changed fields may change. Flow-style frontmatter editing is not
supported. Writes use a temporary file, atomic replacement, a cooperating CLI
lock, and content-change checks. An external editor that ignores the lock can
still race the final replacement; this is not a filesystem transaction.

`doctor` analyzes optional vocabulary schemas and detects missing/duplicate IDs,
malformed frontmatter and field shapes, dangling node/section references,
duplicate section IDs, broken file paths, and
undeclared vocabulary. It does not infer meaning, repair prose, or enforce a
fixed set of knowledge types. Parse errors do not hide the other readable files.

`fix` previews by default. `fix --safe` assigns missing IDs and converts scalar
text dimensions into one-element lists. It never guesses an ambiguous target,
changes an existing ID, or deletes knowledge. `--dry-run` wins over apply flags.
Renaming preserves ID links; raw file-path references may need manual updates.

History uses `git log --follow`. The CLI never commits automatically and does not
preserve uncommitted intermediate revisions beyond what Git already retains.

## Explicit scope and context cards

Optional manifest entries select required guidance through file patterns:

```yaml
guidance:
  - files: [src/refunds/**]
    nodes: [refund-idempotency]
```

```sh
kw context "refund retries" --file src/refunds/service.ts --max-bytes 8000
kw context --file src/refunds/service.ts
```

Context combines matching file links, explicitly configured guidance, QMD text
hits if a query was supplied, and outgoing one-hop dependencies. It returns
cards with inclusion reasons and pointers for `read`, not synthesized answers.
Required cards are prioritized. Omitted required cards produce `budgetConflict`;
unresolved references are reported. The byte budget applies to serialized cards,
not the complete response envelope. No claim of complete coverage is made.

## QMD and storage

The adapter pins the published `@tobilu/qmd` 2.8.3 SDK. Its published metadata API
is smaller than the newer repository revision researched during planning, so
our exact filters use frontmatter directly instead of undocumented SDK methods.

```sh
kw index
kw search "idempotency" --limit 10 --json
```

Search refreshes configured roots before querying to reflect direct file edits.
Keyword search uses QMD's BM25 API, without query expansion, reranking, embedding
generation, or model downloads. Search output maps matches to our stable IDs.
No query-time model is needed. The future embedding interface is not exposed yet.

- Authored data: Markdown nodes, vocabulary map, and manifest, all Git-friendly.
- Derived data: `.knowledge/cache/qmd.sqlite` and possible SQLite sidecars,
  ignored by `.knowledge/.gitignore`.
- Future downloaded models: QMD's shared local model cache unless configured
  otherwise; changing the database path alone does not move model files.

Collection configuration is constructed from the manifest. There are no shell
update hooks and no authoritative settings stored only in the database. The
cache can be removed and rebuilt. Direct `read`, `query`, and graph commands do
not require QMD's database. A separate vector database has not been introduced.

The installed QMD dependency tree currently has npm audit advisories involving
`braces` and `simple-git` (including transitive high/critical reports). No
compatible automatic fix was available when this milestone was built. This
version exposes neither QMD shell update hooks nor model download/build commands;
those features need a dependency review before enabling them. See `npm audit`
for the current report.

## Agent output and validation

Use `--json` for one result envelope on stdout. Operational errors use
`{ "ok": false, "error": { "code": "COMMAND_FAILED", "message": "..." } }`.
Diagnostic findings are data in a successful `doctor` envelope.

Exit codes: `0` success, `1` doctor findings or template conflicts, `2` operational
or usage errors.
Usage errors also print command help/diagnostics to stderr.
Text output uses indented JSON for records and raw text for read bodies.

```sh
npm run check
npm test
npm run build
```

Tests cover graph integrity, section boundaries, dimension queries, preservation
of unrelated text, concurrent edits, path boundaries, CLI mutation/repair, Git
history, and real QMD search across edits and deletions. No model downloads are
part of the tests.

## Saved graph views

Named views use the same nested Boolean filters as `kw query`. Define them
inline under `views` in `.knowledge/config.yaml`, or set
`viewFiles: [.knowledge/views.yaml]` and put `version: 1` plus a `views` mapping
in that file. Paths resolve from the project root and duplicate names fail.

```yaml
views:
  mobile-rules:
    title: Mobile rules
    filter:
      op: and
      filters:
        - { field: dimensions.module, op: eq, value: mobile }
        - { field: type, op: eq, value: rule }
        - op: not
          filters:
            - { field: id, op: eq, value: weird-rule }
```

Use `or` with an ID predicate for additional inclusions; use `not` for exclusions.
Nesting determines precedence. Empty `and` matches everything; empty `or` matches
nothing. Vocabulary is project-defined. There are no separate include/exclude
fields or automatic relationship expansion.

```sh
kw views list
kw views show mobile-rules
kw query --view mobile-rules
kw map
```

`map` includes a paginated view catalog. Additional query flags narrow a saved
view. The explorer's Views section displays the selected nodes and their
internal edges. Definition edits refresh automatically. Views do not restrict
access to the underlying collection. See the
[view contract](skills/use-kw/references/cli.md#named-boolean-views) for API output,
validation, and configuration details.
