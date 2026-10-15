# CLI and file contract

This reference describes the current `kw` implementation. Global flags are
`--project <directory>`, `--json`, `--help`, and `--version`.
`kw --version` / `kw -V` prints the installed package.json version and exits 0
without loading a project. Even with --json, version output is plain text.

## Commands

| Command | Behavior | Options / defaults |
|---|---|---|
| `init` | Create empty config, vocabulary, and knowledge directory; no import or overwrite. | None |
| `skill install` | Copy bundled use-kw and references to repo skills/use-kw. | `--dry-run`, `--force` |
| `id` | Generate a UUID v4, no collection or writes required. | None |
| `create <file>` | Create a node scaffold with generated ID; refuses overwrite. | Required `--title`; `--type` (empty), `--description` (empty), repeated `--dimension name=value` |
| `map` | Discover instructions, vocabulary, saved views, and node cards. | `--limit 20`, `--offset 0` |
| `query [text]` | Combine optional keyword search with metadata, saved view, and file-reference filters. | `--type`, repeated `--dimension name=value`, `--missing`, `--filter JSON`, `--view`, repeated `--file`, `--fields`, `--limit 20`, `--offset 0` |
| `read <id>` | Complete parsed frontmatter plus bounded body, or overview with sections/links. | `--detail full\|overview` (full), `--section`, `--from-line 1`, `--lines 200`, `--max-bytes 16000` |
| `link show <id>` | Incoming and outgoing authored edges, including unresolved targets. | `--direction incoming\|outgoing\|both` (both), `--relation`, `--limit 20`, `--offset 0` |
| `link add <source> <relation> <target>` | Validate and add a node/section edge; exact duplicate is a no-op. | `--dry-run` |
| `link remove <source> <relation> <target>` | Remove exact stored edge, including dangling targets. | `--dry-run` |
| `source add <id> <kind> <target>` | Add/update url, file, or reference evidence citation. | `--title`, `--locator`, `--note`, `--dry-run` |
| `source remove <id> <kind> <target>` | Remove citation by kind + target + optional locator. | `--locator`, `--dry-run` |
| `doctor` | Diagnose graph, vocabulary, file/source references, and optional schemas. | None |
| `fix` | Preview missing-ID and scalar-dimension repairs only. | `--safe` writes; `--dry-run` forces preview |
| `search <text>` | QMD keyword search with scores/snippets; refreshes local cache. | `--limit 20` |
| `index` | Manually refresh derived keyword cache. | None |
| `view` | Serve read-only localhost explorer and open browser. | `--port 4317` (0 chooses free port), `--no-open` |

## Bundled skill installation

```sh
kw skill install
kw --project /path/to/project --json skill install --dry-run
kw skill install --force
```

The source is the skill shipped with the running executable, including its
references. No download or `.knowledge/config.yaml` is needed. The current
directory, or global `--project`, selects the starting directory; Git root
discovery determines the destination. If Git discovery is unavailable, that
directory is the destination root. This command does not modify knowledge,
`AGENTS.md`, or agent configuration; configure agent discovery separately if needed.

Identical files are unchanged. Without `--force`, any differing bundled file
stops the install before writes with exit 2. Additional destination files are
retained, including with `--force`. Symlinks along destination paths and
file/directory conflicts are rejected. Concurrent installs use an exclusive
`skills/.kw-skill-install.lock`, removed on completion.

`--dry-run` always prevents writes, even with `--force`. Previews exit 0 even
when replacement conflicts are listed. JSON success output includes `ok: true`,
absolute `root` and `destination`, `skill: "use-kw"`, `applied`, `files` containing
root-relative `path` and `action` (`create`, `update`, or `unchanged`), and
`conflicts` listing paths requiring `--force`. With `--force`, `conflicts` is
empty but planned updates remain visible. `applied` is false for previews and
no-op installs. Errors use the standard `ok: false` / `COMMAND_FAILED` envelope
and exit 2.

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
```

Roots and meta paths resolve from that project root. `query --file` matches exact
normalized file associations and file-kind sources. Repeated files use OR;
metadata and view filters intersect the result. Legacy nonempty `guidance`
configuration is unused and reported by doctor as `OBSOLETE_GUIDANCE`; review its
intent before replacing it with explicit associations or an agent workflow.

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
[advisory schemas](schema-templates.md) for the exact rules and diagnostics;
these rules never gate node writes or trigger semantic repair.

Section syntax: `## Retry behavior {#retries}`. The explicit section ID is unique
within its node and independent of the heading text. Links originate from nodes,
not individual sections. `files` references have no relation label, symbol, or
line target; `doctor` checks path existence. Renaming a file requires updating
raw file references separately. Symlinks are not followed by the graph scanner.

## Results and diagnostics

`--json` emits one result object on stdout with `ok: true`, or `ok: false` and
`error: {code, message}`. Exit codes: 0 success; 1 doctor findings; 2 usage or operational error. Usage errors can also print diagnostics
to stderr. Help and
version use normal CLI text output.

`query [text]` combines optional QMD keyword search with filters before pagination.
Without text it needs no index. `--fields` projects comma-separated card fields:
id, path, title, type, description, dimensions, files, sources. It returns exactly
the requested keys, even without IDs. Default is a full card. Unknown/empty fields
fail. Responses retain `results`, `total`, `nextOffset`, and parse `warnings`.
Map wraps separately paginated vocabulary, views, and nodes.

Read returns `node` (card) and `frontmatter` (all parsed authored fields, including
custom fields, links, and unfiltered sources). Full mode adds `content`,
`totalLines`, `nextLine`, `truncated`; overview adds `sections`, `links`, `warnings`.
Plain full output includes serialized YAML frontmatter before body content; use
raw files to preserve YAML comments/formatting. Section reads include all metadata.

`link show` returns `origin`, `results`, `total`, `nextOffset`, `warnings`. Each
result has `source`, `sourcePath`, `relation`, `target`, `direction`, `status`,
and `node` (the other endpoint card or null). Target section suffixes remain.
Status is `resolved`, `missing-node`, `ambiguous-node`, or `missing-section`.
Incoming links include links to any section of the origin. Self-links appear in
both directions when both are requested. Results are direct edges, not recursive
traversal. Relation/direction filters apply before paging; dangling targets remain.
The origin must have a unique ID. Use doctor for malformed authored links.

`create` scaffolds id, title, type, description, dimensions, links, files, sources,
and a title heading. Type and description default to empty strings. No custom
fields or project-specific vocabulary are invented. Edit ordinary frontmatter
and body directly; preserve IDs. Read saved view definitions in their YAML files.

Doctor issues have `code`, `severity`, `path`, and `message`. Codes include
`OBSOLETE_GUIDANCE` (unused legacy configuration), `PARSE_ERROR`, `INVALID_ID`, `DUPLICATE_ID`, `MISSING_TITLE`, `INVALID_TYPE`,
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

Read budgets cover body bytes, not full frontmatter or the JSON envelope.
Query/link limits count records; projections are not byte budgets. `read` full mode does not return the graph's
parse warnings, so consult `doctor` for collection integrity.

## Storage and current boundaries

The QMD adapter builds collection config from the authored manifest and stores
derived search data in `.knowledge/cache/qmd.sqlite`. Keep that cache and its
SQLite sidecars out of Git. It can be rebuilt with `index`. Map, metadata-only query, read,
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

`sh install.sh [--repo URL_OR_PATH] [--ref BRANCH_TAG_OR_SHA] [--prefix DIR] [--no-modify-path]`
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
npm install, sudo, or project-knowledge changes occur.

When the install bin directory is absent from PATH, shell setup appends an
idempotent entry to Bash .bashrc plus the first existing .bash_profile,
.bash_login, or .profile (creating .profile otherwise); Zsh uses
$ZDOTDIR/.zshrc or ~/.zshrc; Fish uses $XDG_CONFIG_HOME/fish/conf.d/kw-path.fish
or ~/.config/fish/conf.d/kw-path.fish. Open a new terminal afterward.
--no-modify-path or KW_NO_MODIFY_PATH=1 skips setup. Unknown shells or write
failures print guidance for using the absolute executable path. Shell setup
failure does not undo a successful install. task install uses the same setup
and supports the environment opt-out.

A per-prefix lock rejects simultaneous installer runs. Failed builds remove the
staging copy and leave the installed command untouched. An existing unrelated
`bin/kw` is rejected. Successful replacement deletes the previous managed build;
restart running explorer servers afterward. If a process is forcibly killed,
its install lock may need manual removal after confirming no install is running.
Progress/build output is human-readable; the installer has no JSON mode. Errors
exit nonzero. Download the script again (or update the tool checkout) to obtain
changes to the installer itself.

### Explorer panels

The toolbar is a single filter row. Independent left/right panel
buttons sit at the top of the screen. The sidebar contains contextual views, not node lists or metadata filters. Drag a
panel's inner divider to resize, or focus it and use Left/Right (16px steps),
Home, or End. Preferred widths and visibility are stored locally in the browser;
resizing keeps the graph zoom and viewed center. Narrow screens use overlays
and show at most one sidebar at a time. Selecting knowledge reveals the reader.
The reader spans the viewport height and is hidden without a selected node,
file, or open diagnostics; the right toggle is disabled in that empty state.
Details/Connections tabs replace the old Node details heading. Type and dimension
chips share the introduction; document content is always expanded without a
section index. An opening Markdown heading matching the reader title is omitted
from the rendered body; different headings and the source file stay unchanged. Neighborhood focus is a header icon button.
The left navigation uses one edge-aligned scrollbar, for its saved views.


On desktop, the left navigation occupies layout space beside the central workspace;
opening or resizing it changes the available graph/search width. Its toggle uses
a directional chevron. Only the right reader overlays the graph and search toolbar:
opening, closing, or resizing it leaves their geometry unchanged. Narrow screens
retain sidebar overlays and show at most one sidebar at a time.

Trackpad/mouse-wheel scrolling over the graph pans it in both axes. Hold Command
(⌘) while scrolling to zoom around the pointer; plain scrolling never zooms.
Zoom buttons and dragging to pan remain available. The Views section in the left sidebar is collapsible; its open state persists
locally per project and browser origin. Node browsing now lives in central List mode. Diagnostics sits in the fixed bottom utility area,
alongside Annotate UI and the theme control.

### Network layout

The network renders each filtered document once using Cytoscape.js and
fCoSE. Main colors always identify types; dimension accents identify dimension
names. The legend is passive, and no Color by selector remains. Hover/selection
shows values. Selecting a node emphasizes its immediate incoming/outgoing neighbors;
clicking empty canvas clears selection. Labels reveal detail with zoom and focus.
Central List mode provides keyboard-accessible document selection.

Missing/ambiguous targets have no drawable endpoint but remain in unresolved
counts, diagnostics, and reader connections. Missing-section links to known nodes
are dashed; individual edge clicks open the target and its requested anchor.

Drag to move nodes. Pin controls and automatic drag locking are removed; old
saved pin flags are ignored. Arrange runs fCoSE in a cancellable worker. Grabbing a
node cancels an in-progress layout. New nodes may trigger arrangement; metadata,
selection, or network color changes do not. Fit changes the camera only.
Only individual-node positions are loaded from localStorage, keyed by projectKey
within the browser origin;
storage failures do not block use. They never modify knowledge files. The prior
160-card and 1,200-edge caps are removed; use filters for large graphs.
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

- Inspect saved definitions directly in the configured YAML files.
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

The toolbar combobox accepts individual typed tags: `component:app`,
`NOT component:app`, or `type:guide`. Observed vocabulary supplies autocomplete
only after typing; an empty input shows syntax guidance, not a predefined sheet.
Suggestions/chips use the same syntax without Include/Exclude buttons. `NOT` is
case-insensitive; values/names remain case-sensitive. Quote names and values
containing whitespace or colons with JSON double quotes, including escapes.
`"type":guide` refers to a dimension named type, while `type:guide` matches node
classes. Unknown tags are accepted and may match no nodes. Incomplete tag syntax
stays in the input until completed; full AND/OR expressions are not supported.
Saved views are
sidebar navigation destinations, not filter chips or combobox suggestions. Each
uses the same explorer and tools, with an optional description and
project / Knowledge map / view breadcrumb. Knowledge map navigation returns to
the full collection. The browser document title also identifies the current view.
Include/exclude facets are removable chips. Multiple included values in one field
match with OR; distinct fields combine with AND; any matching exclusion removes
the node. Untagged nodes survive exclusions for missing dimensions. Arbitrary
names/values are supported via quoted tag syntax.
Remove a chip to replace it. Sidebar type/dimension choices
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

Titles use compact 10px wrapped labels on canvas-colored backgrounds without extra
padding. Hovering a node shows
its full title, description (bounded preview), dimensions, counts of connections,
sections/files, up to three section titles, and document path.
Hover cards are previews; use the reader
for complete content and keyboard access. Automatic Fit caps zoom at 135% to
avoid oversized labels on small results; manual zoom retains its 300% maximum.


Dimension markers supplement the main node fill without adding layout nodes or
edges. Their default color is a stable hash of the dimension name, independent
of values, filtering, rendering order, or type colors. Definitions may override it. Up to four
sorted unique values appear as dots within the existing node footprint. Above
four values, three dots and a + marker indicate more; hover shows the full set.
The Dimension dots legend and hover values use the same colors and textual labels.
Dimension dots form a centered horizontal row with even spacing and equal marker
sizes, including the overflow marker.
The Color by control is removed to preserve visual identity.

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

## Contextual Graph/List exploration and Zen reading

A saved view determines the context; Graph and List are two presentations of the
same filtered nodes. Switching presentation keeps filters, search, selection,
and graph camera/layout. All knowledge is the unfiltered starting context.
The sidebar contains one collapsible Views section, plus diagnostics, annotation,
and theme utilities. Duplicate type/dimension filters and both old node lists
are removed. Relationships and neighborhood constraints are visible in the
Filters popover; one Clear filters action resets constraints without leaving
the saved view. Changing saved views still resets temporary filters/selection.

List shows separate name, description, type, and dimension columns, sorts by any column,
and pages 50 rows at a time without dropping the rest. Its document buttons are
keyboard-accessible. Search document contents switches to List with snippets and
narrows both presentations to returned matches, subject to the existing search
endpoint limit (not an exhaustive collection search). Remove Document search to
return to title/description matching. Graph-only layout and legend controls
remain in Graph. Node/file/source reading and neighborhood focus remain available;
empty source/file sections and the permanent graph footer are removed.

Read beside neighborhood focus opens the complete node document in an app-wide
Zen dialog (not native OS fullscreen). Escape or Back to explorer restores the
existing workspace; keyboard focus stays in the modal and returns to the launcher.
Metadata and connections are hidden. Read more loads further body pages. External
links open separately; internal knowledge/file links leave Zen and use the
ordinary reader navigation. A section selection does not limit the Zen document.

### Colors in vocabulary definitions

Add optional quoted `#RRGGBB` colors to the existing metadata file selected by
configuration (normally `knowledge/meta.yaml`):

```yaml
types:
  guide:
    description: How to use the project
    color: "#6f71cb"
dimensions:
  area:
    description: Project area
    color: "#3c9c89"
```

There is no separate colors file. Main node fills use type colors; all values of
a dimension share that dimension's accent. Graph dots, legends, hover values,
list chips, and reader chips use the same definitions. Unconfigured colors are
deterministic by name, unaffected by encounter order, new vocabulary, or filtering.
Text uses the theme's normal foreground rather than custom accent colors.
Metadata polling applies overrides without restarting or rearranging nodes.
Invalid color values produce an INVALID_COLOR doctor warning (exit 1) and an
explorer notice; valid overrides still apply and invalid entries use defaults.
The graph API adds colors: {types, dimensions} and colorWarning: string|null;
metadata/color changes are included in its version/ETag. No vocabulary is fixed.

Pinch-to-zoom is recorded as a separate follow-up; gesture behavior is unchanged.

## Compact table workspace

Breadcrumbs are a small, single-line context indicator. Graph/List is the primary
toggle immediately left of search in one toolbar. The separate presentation and
sorting rows are removed; view descriptions remain in sidebar navigation.
Relationship, neighborhood, and document-search controls are in the Filters
popover, marked when active. Clear filters remains beside search. Counts and
pagination sit below the table.

List is a compact property table with column/row borders: Name, Description, Type,
and one column per observed dimension. Every column header is a sort button;
click again to reverse direction. aria-sort exposes direction to assistive tech.
Text sorting is natural and case-insensitive; dimension values are sorted/joined
for comparison, with missing values treated as empty. Title/path break ties.
Name and description cells truncate with full text on hover; the reader holds
complete content. Dimension chips wrap within their property cell. Tables scroll
horizontally on narrow screens; 50-row pagination remains.

## Optional local CLI counters

Counting is off by default. Set `KW_USAGE=1` to opt in for a command or session;
unset it (or use any other value) to disable counting without touching storage.
Enabled calls use the existing gitignored `.knowledge/cache/qmd.sqlite` database,
in a kw-owned `kw_usage_calls` table. No separate database is created. Counting
does not create a missing database, initialize QMD, or load inference/extensions.
Run `kw index` to create the search cache if wanted; that first call is not
counted when the database does not yet exist.

The table contains `command TEXT`, `argv TEXT` (JSON argument array), `count INTEGER`,
and `last_called TEXT` (UTC ISO timestamp), keyed by `(command, argv)`.
Atomic SQLite upserts aggregate repeated calls rather than appending events.
Command groups use names such as `link show`. Arguments retain their exact order
and global flags, excluding the executable. No results, durations, sessions,
source contents, network reporting, analytics UI, or automatic actions are added.

Enabled invocations count once, including failures and argument errors, but
excluding help/version/generated help. Dry-run counts too. Long-running `view`
counts at startup; browser requests and internal operations do not count.

Root resolution walks upward from `--project` or cwd for a collection, even if
its config is malformed; otherwise it uses the nearest Git root or selected
directory. `init` uses its target directory. Missing roots/databases skip counting.
The driver is loaded lazily from the pinned QMD dependency. Missing native
bindings, corrupt/read-only databases, and lock contention silently skip recording;
SQLite waits at most 50ms per locking operation. Counter failures never change
CLI output or exit status. This is a best-effort counter, not an audit log.

Inspect totals with SQLite, for example:

```sh
sqlite3 .knowledge/cache/qmd.sqlite 'SELECT command, SUM(count) FROM kw_usage_calls GROUP BY command;'
```

Reset only counters with `DELETE FROM kw_usage_calls;`. QMD refresh/reopen retains
the table in the supported version; deleting the cache also deletes counts.
Existing legacy `.knowledge/usage/counts.json` files are left untouched and are
neither updated nor automatically migrated. There is no counter-specific CLI.
