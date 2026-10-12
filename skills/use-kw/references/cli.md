# CLI and file contract

This reference describes the current `kw` implementation. Global flags are
`--project <directory>`, `--json`, `--help`, and `--version`.

## Commands

| Command | Options and behavior |
|---|---|
| `init` | Creates an empty collection at `--project`; refuses existing config/map files. Existing-document onboarding is an agent workflow, not an automatic import by this command; see [repository initialization](initialization.md). |
| `template list` | Lists bundled names/descriptions; no collection required. |
| `template show <source>` | Shows a bundled name, local template/knowledge directory, Git repository, or GitHub folder URL; includes vocabulary and contents. Git sources support `--ref` and `--folder`. |
| `template apply <source>` | Same sources and Git flags as show; previews additions/conflicts for an initialized collection; `--apply` writes, `--dry-run` forces preview. Conflicts prevent all writes and return exit 1. |
| `view` | Local read-only map/reader; `--port 4317` (default), `--port 0` selects an available port. Requires built UI assets. Prints URL and opens the default browser; `--no-open` disables opening. Runs until interrupted. |
| `id generate` | Prints a UUID v4 without modifying files. |
| `id assign <file>` | Adds a UUID to existing frontmatter without an ID; supports `--dry-run`. |
| `create <file>` | Requires `--title`; optional `--type`, `--description`, repeated `--dimension name=value`. Generates an ID; never overwrites a file. |
| `map` | `--limit 20`, `--offset 0`; pages vocabulary and node cards independently using the same offset. |
| `query` | `--type`, repeated `--dimension name=value`, `--missing field`, `--filter JSON`, `--limit 20`, `--offset 0`. |
| `read <id>` | `--detail full\|overview` (default full), `--section ID_OR_HEADING`, `--from-line 1`, `--lines 200`, `--max-bytes 16000`. Also accepts `ID#SECTION_ID`. |
| `related <id>` | `--direction incoming\|outgoing\|both` (default both), `--depth 1`, optional `--relation`, `--limit 50` neighboring nodes. |
| `link <source> <relation> <target>` | Target is a node ID or `ID#SECTION_ID`; checks it exists. Supports `--dry-run`. |
| `unlink <source> <relation> <target>` | Removes the exact stored relation/target pair; supports `--dry-run`. Can remove dangling targets. |
| `source list <id>` | Returns valid sources and source-specific diagnostics; see [source references](sources.md). |
| `source add <id> <kind> <target>` | `url`, `file`, or `reference`; optional `--title`, `--locator`, `--note`, `--dry-run`. Updates an exact kind/target/locator match. |
| `source remove <id> <kind> <target>` | Removes exact kind/target/locator matches; optional `--locator`, `--dry-run`. |
| `set <id> <field> <json-value>` | Replaces a top-level field or `dimensions.NAME`; refuses changing `id`; supports `--dry-run`. |
| `rename <id> <file>` | Moves the node inside configured roots without changing its ID; refuses existing destination; supports `--dry-run`. |
| `doctor` | Reports structural problems, undeclared vocabulary, and optional advisory schema findings. Any finding produces exit code 1. |
| `fix` | Preview by default; `--safe` applies missing-ID and scalar-dimension repairs; `--dry-run` forces preview. |
| `meta show` | Returns the full authored vocabulary map. |
| `meta sync` | Preview by default; `--apply` registers observed undeclared names; `--dry-run` forces preview. |
| `index` | Refreshes QMD's keyword index; no embedding generation. |
| `search <text>` | QMD keyword search; `--limit 20`; refreshes the configured roots before searching. |
| `context [text]` | Repeated `--file`, `--max-bytes 12000`, `--limit 20` text candidates. Returns cards, reasons, omitted cards, and unresolved references. |
| `history <id>` | `--limit 10`; reads `git log --follow` for the node's current path. |

Most node lookup arguments also accept a project-relative node path. Prefer the
returned stable ID. File creation/rename/assignment paths resolve against the
project root and must fall inside configured knowledge roots.

Read line numbers are 1-based and relative to the selected body or section.
Sections include subordinate headings until the next heading of equal or lesser
depth. An ambiguous heading name requires an explicit section ID. A line too
large for the byte budget is omitted; increase the budget to make progress.

## Filters

```json
{
  "op": "and",
  "filters": [
    { "field": "dimensions.module", "op": "in", "value": ["server", "cli"] },
    { "field": "description", "op": "exists", "value": true }
  ]
}
```

`eq` matches an exact scalar or any element in a list; `in` takes an array of
acceptable values. `exists` takes a boolean. `and` and `or` take `filters`;
`not` takes exactly one child in `filters`. Top-level fields and
`dimensions.NAME` are supported; arbitrary nested paths are not. Matching is
case-sensitive with no coercion. Missing fields do not match `eq` or `in`.

## Files and configuration

The project root is the directory containing `.knowledge/config.yaml`:

```yaml
version: 1
roots: [knowledge/nodes]
meta: knowledge/meta.yaml
guidance:
  - files: [src/refunds/**]
    nodes: [refund-idempotency]
```

Roots and meta paths resolve from that project root. Guidance patterns match
affected project-relative paths supplied to `context --file`. File-kind sources
also select cards with reason `source-file`. `nodes` explicitly
identifies required guidance; no model infers applicability. An optional query
adds QMD keyword hits. Outgoing links add one-hop neighbors. A required card
omitted from the budget sets `budgetConflict: true`; follow up with `read`.

The metadata file contains `types`, `dimensions`, and `relations` mappings:

```yaml
types:
  rule:
    description: Implementation guidance for this project.
dimensions:
  module:
    description: Relevant project modules.
relations:
  governed_by:
    description: Connects a subject to guidance.
```

Node frontmatter:

```yaml
---
id: refund-idempotency
title: Refund idempotency
type: rule
description: How to retry refunds without duplicating them.
dimensions:
  module: [server, web]
links:
  - relation: governed_by
    target: payment-policy#retries
files:
  - src/refunds.ts
---
```

`id` uses letters, digits, underscores, and hyphens, beginning with a letter or
digit. It must be unique. `title` is nonempty text. Other illustrated fields are
optional. Dimension values are lists of strings. Optional `sources` cite URL/file/text evidence; see [source references](sources.md).
Unknown vocabulary is reported but remains readable/queryable. Optional schemas in vocabulary definitions analyze
required fields, dimension values, and relationship restrictions. See
[schemas and templates](schema-templates.md) for the exact rules and diagnostics;
these rules never gate node writes or trigger semantic repair.

Section syntax: `## Retry behavior {#retries}`. The explicit section ID is unique
within its node and independent of the heading text. Links originate from nodes,
not individual sections. `files` references have no relation label, symbol, or
line target; `doctor` checks path existence. Renaming a file requires updating
raw file references separately. Symlinks are not followed by the graph scanner.

## Results and diagnostics

`--json` emits one result object on stdout with `ok: true`, or `ok: false` and
`error: {code, message}`. Exit codes: 0 success; 1 doctor findings or template
conflicts; 2 usage or operational error. Usage errors can also print diagnostics
to stderr. Help and
version use normal CLI text output.

Queries return `results`, `total`, `nextOffset`, and parse `warnings`. Map wraps
separate paginated `vocabulary` and `nodes`. Reads return a node card and body
`content`, `totalLines`, `nextLine`, `truncated`; overview returns sections/links.
Node cards additionally contain valid `sources` (an empty list by default).
Related results contain `origin`, `nodes`, `edges`, `truncated`, and warnings.

Doctor issues have `code`, `severity`, `path`, and `message`. Codes include
`PARSE_ERROR`, `INVALID_ID`, `DUPLICATE_ID`, `MISSING_TITLE`, `INVALID_TYPE`,
`INVALID_DESCRIPTION`, `INVALID_DIMENSIONS`, `INVALID_DIMENSION_VALUE`,
`INVALID_LINKS`, `DANGLING_ID`, `AMBIGUOUS_TARGET`, `DANGLING_SECTION`,
`DUPLICATE_SECTION_ID`, `INVALID_FILES`, `BROKEN_FILE_LINK`, `UNDECLARED_TYPE`,
`UNDECLARED_DIMENSION`, and `UNDECLARED_RELATION`. Optional schema warnings
include `INVALID_SCHEMA`, `SCHEMA_REQUIRED`, `SCHEMA_DIMENSION_VALUE`,
`SCHEMA_RELATION_SOURCE`, `SCHEMA_RELATION_TARGET`, `SCHEMA_FORBIDDEN_LINK`,
`SCHEMA_SELF_LINK`, and `SCHEMA_CARDINALITY`; see the
[schema reference](schema-templates.md). Source diagnostics are `INVALID_SOURCES`,
`INVALID_SOURCE`, `BROKEN_SOURCE_FILE`, and `UNSAFE_SOURCE_FILE`; see
[source references](sources.md).

Read budgets cover body bytes; context budgets cover serialized cards. Neither
limits the full JSON envelope. `read` full mode does not return the graph's
parse warnings, so consult `doctor` for collection integrity.

## Storage and current boundaries

The QMD adapter builds collection config from the authored manifest and stores
derived search data in `.knowledge/cache/qmd.sqlite`. Keep that cache and its
SQLite sidecars out of Git. It can be rebuilt with `index`. Direct map/query/read,
graph, and edit commands do not need the database. History is committed Git
history only; no automatic commits or uncommitted-version retention is provided.

The published QMD SDK's metadata capabilities differ from the repository revision
used during early research. `kw` filters its own frontmatter directly. Do not
assume QMD CLI flags or SDK methods are part of the `kw` interface. No
vector-search/embedding commands, automatic injection, or semantic repair is
currently exposed.


## Explorer HTTP read API

`view` binds only to `127.0.0.1`, accepts local Host headers and same-origin GET
requests, and exposes no authoring routes. It serves the assets bundled in
`dist/ui`. Once listening, it opens the default browser unless `--no-open` is
set, including in `--json` mode. A browser-launch failure warns on stderr and
leaves the server running. Stop it with Ctrl+C. The startup JSON is an ordinary CLI envelope;
HTTP responses below are direct JSON objects, not CLI envelopes. HTTP errors
return `{ "error": "message" }` and a non-2xx status.

- `GET /api/graph`: `project`, `projectKey`, `version`, `nodes`, `edges`, `issues`, `meta`.
  `projectKey` is an opaque hash of the local project root for browser preference
  isolation (not a portable project identity; moving the root changes it).
  Supports `ETag` / `If-None-Match` with `304` for unchanged state. Node cards
  include `key` (project-relative path), stable `id`, title/type/description,
  dimensions, files, sources, sections (title/id/depth/start), and a content revision.
  Bodies are omitted. Paths disambiguate duplicate IDs in the read-only view;
  ID-based relationships remain ambiguous until repaired.
- Each edge has `key`, source path, nullable target path, authored `targetId`
  (including its section fragment), relation, nullable anchor, and status:
  `resolved`, `missing`, `ambiguous`, or `missing-section`. A section with
  duplicate explicit anchors is not treated as resolved.
- `GET /api/node?key=PROJECT_RELATIVE_PATH&start=0`: body page, key, start,
  next (nullable). Offsets and 48,000-character pages use JavaScript UTF-16
  code units. The `sections.start` offsets refer to the full body.
- `GET /api/file?path=REFERENCED_PATH&start=0`: content, path, start, next
  (nullable byte offset), size, backlinks (node paths). Reads at most 48,000
  bytes and preserves UTF-8 boundaries. Only regular UTF-8 text files explicitly
  referenced in `files` or file-kind `sources` and resolving inside the project are readable; binary,
  missing, unreferenced, and escaping paths return an error.
- `GET /api/search?q=TEXT`: up to 30 QMD keyword results with key/path/title,
  score/snippet/source. Queries must contain 1–500 characters. Search refreshes
  the project-local QMD cache and is serialized within the server process.

The server caches parsed graph state in memory using filesystem stat signatures
and reloads when config, vocabulary, or knowledge files change. Cache entries
are derived; no new authored format or persistent index is introduced. The UI
polls every 2.5 seconds, loads document bodies on demand, and limits rendered
cards/edges rather than silently truncating the graph API. Referenced source
file content is read on demand, not included in the graph change signature.


## Git installer contract

`sh install.sh [--repo URL_OR_PATH] [--ref BRANCH_TAG_OR_SHA] [--prefix DIR]`
installs or reinstalls the CLI and built UI on macOS/Linux. Defaults:
repository `https://github.com/ChrisMarxDev/knowledge-graph.git`, ref `HEAD`
(remote default branch), prefix `~/.local`. `KW_REPO`, `KW_REF`, `KW_PREFIX`
provide environment defaults; explicit flags override them. `--help` prints
usage without installing. Git, Node 22.12+, and npm must already be installed.

The script fetches a shallow detached checkout into `PREFIX/share/kw/build.*`,
runs `npm ci --include=dev` and the build, verifies CLI startup and UI output,
and atomically points `PREFIX/bin/kw` at the executable. Development dependencies
are retained. It uses existing Git credentials without interactive Git prompts.
Local repository paths also install committed state only. No release, global
npm install, sudo, shell-profile mutation, or project-knowledge changes occur.

A per-prefix lock rejects simultaneous installer runs. Failed builds remove the
staging copy and leave the installed command untouched. An existing unrelated
`bin/kw` is rejected. Successful replacement deletes the previous managed build;
restart running explorer servers afterward. If a process is forcibly killed,
its install lock may need manual removal after confirming no install is running.
Progress/build output is human-readable; the installer has no JSON mode. Errors
exit nonzero. Download the script again (or update the tool checkout) to obtain
changes to the installer itself.

### Explorer panels

The toolbar is a single filter/color row. Independent left/right panel
buttons sit at the top of the screen. Type, dimension, and relation filters are in the left sidebar. Drag a
panel's inner divider to resize, or focus it and use Left/Right (16px steps),
Home, or End. Preferred widths and visibility are stored locally in the browser;
resizing keeps the graph zoom and viewed center. Narrow screens use overlays
and show at most one sidebar at a time. Selecting knowledge reveals the reader.
The reader spans the viewport height and is hidden without a selected node,
file, or open diagnostics; the right toggle is disabled in that empty state.
Details/Connections tabs replace the old Node details heading. Type and dimension
chips share the introduction, the section index starts collapsed, and document
content is always expanded. Neighborhood focus is a header icon button.
The left navigation uses one edge-aligned scrollbar, including its node list.


Both sidebars overlay the central workspace at every screen size, including the
search toolbar. Opening, closing, or resizing them leaves the graph viewport,
node positions, and search-bar geometry unchanged. Their widths are independent;
narrow screens still show at most one sidebar at a time.

### Network layout

The default network renders each filtered document once using Cytoscape.js and
fCoSE. Color by selects type or an arbitrary dimension; changing it does not
move network nodes. Colors use the first sorted membership; double borders mark
multiple values. Hover/selection shows all values and legend chips highlight any
membership. Selecting a node emphasizes its immediate incoming/outgoing neighbors;
clicking empty canvas clears selection. Labels reveal detail with zoom and focus.
The Nodes menu provides keyboard-accessible document selection.

Overview groups by exact complete membership sets, so overlapping memberships
are represented honestly without duplicate visual documents. Aggregated directed
edges retain relation/status and counts, including within-group self-loops.
Click a group to expand; Overview resets expansion, Network shows individuals.
Missing/ambiguous targets have no drawable endpoint but remain in unresolved
counts, diagnostics, and reader connections. Missing-section links to known nodes
are dashed; individual edge clicks open the target and its requested anchor.

Drag to move nodes. Pin controls and automatic drag locking are removed; old
saved pin flags are ignored. Arrange runs fCoSE in a cancellable worker. Grabbing a
node cancels an in-progress layout. New nodes may trigger arrangement; metadata,
selection, or network color changes do not. Fit changes the camera only.
Positions use localStorage keyed by projectKey within the browser origin;
storage failures do not block use. They never modify knowledge files. The prior
160-card and 1,200-edge caps are removed; use filters/Overview for large graphs.
Layout iteration budgets are 1,200 up to 100 nodes, 500 up to 300, and 250 above.

## Named Boolean views

Define `views` inline in `.knowledge/config.yaml`, and/or list YAML files in
`viewFiles`. File paths resolve relative to the project root; each external file
has `version: 1` and a `views` mapping. Names must be unique across all files and
inline definitions. There is no overriding, inheritance, glob expansion, or
separate include/exclude syntax.

```yaml
views:
  mobile-rules:
    title: Mobile rules
    description: Mobile rules except one explicitly omitted node.
    filter:
      op: and
      filters:
        - { field: dimensions.module, op: eq, value: mobile }
        - { field: type, op: eq, value: rule }
        - op: not
          filters:
            - { field: id, op: eq, value: weird-rule }
```

Each definition requires `filter`; `title` defaults to its name and `description`
is optional. Unknown definition/filter properties and malformed filters fail
view loading, even for empty collections. The existing filter semantics apply:
use an `or` branch matching `id` to include untagged nodes, and nested `not` for
exclusions. Nesting controls precedence. Empty `and` matches all nodes; empty
`or` matches none. Fields are frontmatter keys or `dimensions.NAME`, not filesystem
paths. No missing-ID reference diagnostics are inferred from equality predicates;
an unmatched ID simply matches nothing. Views select existing collection nodes.

- `kw views list [--limit 20] [--offset 0]` returns `results`, `total`, `nextOffset`.
- `kw views show NAME` returns `view`.
- `kw map` adds a `views` page, independently paged with its existing limit/offset.
- `kw query --view NAME` applies the saved filter before other query filters;
  additional flags narrow the selection. Its result/pagination shape is unchanged.
- Each returned definition has `name`, `title`, optional `description`, and `filter`.
- Unknown names or invalid view configuration fail the command with exit 2.

The explorer exposes `GET /api/views` as `{ views: [...] }` and
`GET /api/graph?view=NAME` with the usual snapshot fields plus `views` and `view`
(the selected name, or null for the unfiltered graph). Selected graphs contain
only edges with both endpoints selected. Collection diagnostics remain global.
Invalid definitions/names return HTTP 400. Graph ETags incorporate definitions
and the selected view; edits to external view files are detected during polling.
The sidebar's Views section switches selections; existing interactive
filters then narrow that selection. Selecting a view clears temporary filters.
Removing/renaming an active view produces an error until another view or All
knowledge is selected. Views are read-only selections, not access controls: node,
file, and full-text search endpoints still operate on the full collection.


### Explorer filter combobox and hover details

The toolbar combobox offers observed types/dimension values. Saved views are
sidebar navigation destinations, not filter chips or combobox suggestions. Each
uses the same explorer and tools, with an optional description and
project / Knowledge map / view breadcrumb. Knowledge map navigation returns to
the full collection. The browser document title also identifies the current view.
Include/exclude facets are removable chips. Multiple included values in one field
match with OR; distinct fields combine with AND; any matching exclusion removes
the node. Untagged nodes survive exclusions for missing dimensions. Arbitrary
names/values are supported without parsing user-facing labels as filter syntax.
Changing a chip's sign toggles inclusion/exclusion. Sidebar type/dimension choices
also appear as chips. Facets are session-local and never rewrite saved view files.
Choosing a view clears temporary filters, then loads that view's server selection.

Typing searches suggestions. Arrow keys move the active option; Enter selects it
(or commits a text query); Escape closes the menu. Clicking the input reopens it.
Backspace with an empty input removes the last metadata facet. Clear filters
removes text and metadata facets while keeping the current view. Sidebar/map
Clear filters also clears neighborhood and relation constraints. Switching views
clears temporary filters and reader selection; it never modifies saved definitions.
Committed text filters node titles/descriptions. Search document contents is a
separate dropdown action using the existing QMD endpoint. Returned results are
intersected with active view/metadata/neighborhood/relation constraints; body
search does not require a title match. The endpoint's existing result limit still
applies before client filtering. Locate clears temporary filters as before.

Titles use compact 12px wrapped labels on canvas-colored backgrounds without extra
padding. Hovering a node shows
its full title, description (bounded preview), dimensions, counts of connections,
sections/files, up to three section titles, and document path. Overview groups
show membership sets and sample titles. Hover cards are previews; use the reader
for complete content and keyboard access. Automatic Fit caps zoom at 135% to
avoid oversized labels on small results; manual zoom retains its 300% maximum.


Dimension markers supplement the main node fill without adding layout nodes or
edges. Their color is a stable hash of the dimension name/value pair, independent
of filtering, rendering order, type colors, or Color by selection. Up to four
sorted unique values appear as dots within the existing node footprint. Above
four values, three dots and a + marker indicate more; hover shows the full set.
The Dimension dots legend and hover values use the same colors and textual labels.
Collapsed overview groups have no individual-document markers; expand them to
see node dimensions. Existing Color by behavior is unchanged.

### UI annotation feedback

**Annotate UI** in the left sidebar mounts Agentation 3.1.2 on demand, including in
production/installed explorer builds. Its toolbar captures element notes and
copies structured Markdown feedback for manual delivery to a coding agent.
After Copy, the help panel also displays selectable output even if clipboard
access fails. **Done** unmounts the annotation tools without deleting saved notes.
Global SDK keyboard shortcuts are disabled to avoid collisions with explorer
controls; annotation popup Enter/Escape still work.

No endpoint or webhook is configured: no MCP server, account, or outbound sync is
required. Notes live in browser localStorage, not the repository or QMD cache.
Agentation filters out notes older than seven days. Annotation mode temporarily
sets `#kw-feedback=PROJECT_KEY` with hash-based SDK scoping so projects sharing a
port do not share notes; it restores the previous hash when closed. Storage is
also origin-scoped, so changing ports or browsers does not carry notes across.
Copied feedback includes the project name. The canvas graph has no individual
node DOM selectors: include node names in graph notes. DOM UI elements can be
targeted directly. Feedback is guidance to review, not executable instructions.
