<img src="assets/icon.svg" width="64" height="64" alt="">

# Agent knowledge wiki

A local Markdown knowledge graph with a CLI for reading, linking, editing, and
checking project knowledge. QMD's SDK supplies keyword search. The file format
and ordinary CLI commands work without an index or model downloads.

The CLI includes a read-only local knowledge explorer. Embedding generation and
vector search are deferred. Types, dimensions, and relationship names are
project-defined.

Agents can use the repository-owned [use-kw skill](skills/use-kw/SKILL.md).
The [CLI API surface knowledge node](knowledge/nodes/cli-api-surface.md) is the
top-level truth for the current command surface.
[AGENTS.md](AGENTS.md) requires its instructions and references to stay in sync
with the CLI/API. Reusable example vocabulary and workflow skills can be adapted
by agents; there is no template installation command. Automatic knowledge
injection is not implemented.

## Documentation

The [documentation site](https://chrismarxdev.github.io/knowledge-graph/) includes
installation, CLI workflows, and the [CLI API reference](https://chrismarxdev.github.io/knowledge-graph/reference/cli/).
The reference is generated from [our API surface knowledge node](knowledge/nodes/cli-api-surface.md)
on every build, so it stays tied to the same contract used by agents.

To run the Starlight docs locally (Node.js 22.12+):

```sh
npm --prefix docs ci
npm --prefix docs run dev
# Build and preview:
npm --prefix docs test
npm --prefix docs run build
npm --prefix docs run preview
```

Open the printed URL under `/knowledge-graph/`. Docs dependencies are separate
from the CLI install/build. Generated Markdown and static output are ignored.
The Documentation workflow validates pull requests and deploys relevant main
changes through GitHub Pages. In repository Settings → Pages, the publishing
source is GitHub Actions. See [documentation knowledge](knowledge/nodes/documentation.md).

## Install the bundled agent skill

With `kw` installed, run this from your project:

```sh
kw skill install
```

This copies the installed version's `use-kw` skill and references into
`skills/use-kw` at the Git repository root, even from a subdirectory. Outside
Git, it uses the current directory. Use `kw --project /path/to/project skill install`
to select another project. No network access or `kw init` is required.

Use `kw skill install --dry-run` to preview. Identical files are left alone;
use `kw skill install --force` after updating `kw` to replace bundled files that
differ. Additional local files are retained. This copies the skill without
changing `AGENTS.md` or configuring agent-specific skill discovery.

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

## Install

On macOS, run this single command (requires Git, Node.js 22.12+, and npm):

```sh
curl -fsSL https://raw.githubusercontent.com/ChrisMarxDev/knowledge-graph/HEAD/install.sh | sh
```

Open a new terminal if prompted. Run the same command again to update.
Check your installed version with `kw --version`.

### Installation details

It fetches the remote default
branch into a fresh directory, installs locked dependencies, builds the CLI and
UI, and atomically replaces `~/.local/bin/kw` only after the build succeeds.
Failed reinstalls retain the working version. Successful reinstalls remove the
previous managed build. Restart any running `kw view` server after updating.
This installs committed Git state, not uncommitted files in your checkout.

From a source checkout, `sh install.sh` runs the same installer. For a branch,
SSH authentication, or a different prefix:

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
existing `bin/kw` is never overwritten. The installer configures PATH for Bash, Zsh, and Fish; open a new terminal
if prompted. Pass `--no-modify-path` (or `KW_NO_MODIFY_PATH=1`) to skip shell
setup. Project knowledge is untouched. QMD's native dependencies may require a build
toolchain; build dependencies are retained with this initial source installer.

For local development and testing, install the current checkout with Task:

```sh
task install
# Open a new terminal if the installer configured PATH.
command -v kw
```

This installs dependencies, builds the CLI and UI including uncommitted changes,
and links `~/.local/bin/kw` to this checkout for use from any project. Keep the
checkout in place and rerun `task install` after edits. Restart running `kw view`
servers. It can replace this checkout's link or a managed `install.sh` install;
unrelated executables are refused. Previous managed builds are retained.
Use `KW_PREFIX=/path/to/prefix task install` for a different destination.
Shell setup is automatic here too; set `KW_NO_MODIFY_PATH=1` to skip it.
To return to the Git installer, remove the checkout's `kw` symlink first.

## Run

Requires Node.js 22.12 or newer and npm. QMD includes native dependencies;
installation may use platform binaries or require a native build toolchain.

```sh
npm ci
npm run build
node bin/kw.js --help
node bin/kw.js --project examples/demo map
node bin/kw.js --project examples/demo link show refunds
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
Type and dimensions share compact colored chips; the document starts immediately
below the introduction, without a section index or repeated opening title. Neighborhood
focus is an icon in the reader header. Old saved pin flags are ignored.

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

The explorer provides:

- A single compact filter toolbar above the graph. Both sidebars can
  collapse using the panel icons at the top of the screen and resize by dragging
  their inner edges (or focusing a divider and using arrow keys). Widths and open/closed state
  persist locally. Type and dimension filters live in the combobox; the Filters popover holds relationship filtering.
- A connection-driven Cytoscape.js/fCoSE network and persistent Markdown reader.
  Each document appears once. Click a node to read and emphasize its immediate
  neighbors; click empty canvas to clear the emphasis. The neighborhood icon
  explicitly narrows the graph. Sections and file references remain in the reader.
- Stable main colors identify types; dimension accents identify dimension names.
  The passive legend explains type colors. Optional `color` fields on vocabulary
  definitions override deterministic defaults; there is no Color by selector.
- Drag a node to move it. **Arrange** runs fCoSE in a cancellable background
  worker and can reposition every node. Positions are saved locally per
  project and origin. Metadata/color changes retain positions; newly added nodes
  can trigger arrangement. **Fit** adjusts the camera without rearranging nodes.
- A typed-tag combobox: enter `component:app`, `NOT component:app`, or
  `type:guide`. Suggestions appear as you type; there is no predefined filter
  sheet or Include/Exclude mode. Values within a field match with OR; fields combine
  with AND; exclusions always subtract matching nodes, including multi-value
  nodes. Remove a chip to replace it. Arrow keys/Enter select suggestions;
  Escape closes the menu; Backspace on an empty input removes the last facet.
  Enter commits a tag or plain title/description text. Quote tag names/values
  containing spaces or colons, e.g. `"team name":"client app"`. `NOT` is
  case-insensitive; these are individual tags, not AND/OR expressions. A dimension
  literally named type uses `"type":value`. Chips narrow the current
  graph without editing view YAML. Saved views open from the sidebar in the same
  explorer, with their description and breadcrumb; no duplicate page headline. The combobox and graph
  tools work identically; clearing filters keeps the view selected. The All knowledge breadcrumb returns to the full collection.
- **Search document contents** in the dropdown uses QMD keyword search and
  respects the active view, metadata filters, and neighborhood/relation filters.
  It searches bodies rather than requiring the text to match a title. Central **List** mode provides keyboard access even with the left sidebar closed.
- Compact wrapped node titles with canvas-colored backgrounds. Hover cards show the full
  title, description, dimensions, section/file/connection counts, and file path.
  Automatic Fit caps magnification at 135%; manual zoom can still reach 300%.
  Centered, evenly spaced dots inside nodes encode dimensions independently of the main
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
endpoints participate; use filters and neighborhood focus for large
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
`kw id` produces a UUID without needing a project. `create` generates IDs and
`fix --safe` can fill missing IDs. Existing IDs are never silently replaced.

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
kw --json read NODE_ID
kw source remove NODE_ID file docs/design.md --locator 'Retry behavior'
```

Source references are separate from conceptual `links` and existing `files`
associations. Optional titles, locators, and notes explain the evidence. Doctor
checks reference structure and local file paths without fetching URLs. The
explorer shows citations, opens web links, and previews referenced text files.
File sources also match `query --file` alongside ordinary file associations.
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

Read and edit the configured metadata YAML directly. Use doctor findings to
resolve typos or add intentional vocabulary with meaningful descriptions; there
is no automatic registration/synchronization command.

## Optional schemas

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
`create` and `link add` remain available even when they produce violations;
`fix --safe` never changes knowledge to satisfy schemas. Existing structural
checks still apply. No type or relationship has built-in domain meaning.

See the [advisory schema reference](skills/use-kw/references/schema-templates.md)
for exact rule semantics and diagnostics. Agents can adapt examples under
`templates/coding` or another user-selected repository using ordinary file
operations. These are reusable files, not an installed feature or fixed ontology.

## Read and query

```sh
kw map --limit 20 --offset 0
kw query --type capability --dimension module=web
kw query --dimension module=web --dimension module=server
kw query --missing description
kw query "refund retries" --fields id,title,description
kw query --file src/refunds.ts --fields title,description
kw query --filter '{"op":"or","filters":[{"field":"type","op":"eq","value":"rule"},{"field":"dimensions.module","op":"in","value":["server","cli"]}]}'
kw read refunds --detail overview
kw read refunds --section user-experience
kw read refunds --from-line 1 --lines 30 --max-bytes 4000
kw link show refunds --direction both --limit 30
kw link show refunds --relation governed_by
```

Repeated dimension flags combine with AND; each matches membership in a node's
list. Filter operators are eq, in, exists, and, or, and not. Use dimensions.NAME
for dimension fields. Matching is exact and case-sensitive.

`query [text]` intersects keyword hits with metadata, saved view, and file filters
before pagination. Text queries refresh QMD; metadata-only queries need no index.
Repeated `--file` paths match any exact normalized files or file-kind source
association. Source contents are not searched. `--fields` projects any of id,
path, title, type, description, dimensions, files, sources; default is full cards.
Only requested keys appear, so include id/path if needed for subsequent reads.

Query/map/link show return nextOffset. Map pages its lists independently with
the same offset. `link show` includes incoming/outgoing direct edges, section
suffixes, and unresolved target statuses; a self-link appears in both directions.

Read returns complete parsed frontmatter including custom fields and links, plus
bounded body content. Plain full output includes serialized YAML frontmatter.
Body line/byte limits do not truncate metadata. `nextLine` is relative to the
selected body/section; a line too large for the budget requires a larger budget.
Overview mode returns frontmatter, sections, and links without the body.

## Author and repair

```sh
kw create knowledge/nodes/refunds.md --title Refunds --type capability \
  --dimension module=server --dimension module=web
kw link add refunds governed_by refund-idempotency#retry-behavior
kw link remove refunds governed_by refund-idempotency#retry-behavior
kw doctor
kw fix --dry-run
kw fix --safe
```

`create` generates and returns an ID; use that ID in subsequent commands, or use
the file path. It scaffolds id, title, type, description, dimensions, links,
files, sources, and a title heading. Empty type/description and empty lists/maps
are ready to fill; no custom vocabulary is guessed. Edit fields and body directly.
The short IDs above correspond to the checked-in demo.

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

Use `git log --follow` directly for history. The CLI never commits automatically and does not
preserve uncommitted intermediate revisions beyond what Git already retains.

## Migration from the larger CLI

The current surface has 17 commands. Removed: template commands, related,
context, views list/show, history, id generate/assign, set, rename, source list,
and meta show/sync. Use `id`, `link add/remove/show`, full-frontmatter `read`,
`query [text] --file PATH --fields FIELDS`, and ordinary file/Git operations.
Saved views and advisory schemas remain. Old command spellings are not aliases.

Nonempty legacy `guidance` config no longer selects context; doctor reports
OBSOLETE_GUIDANCE. Review its intent and replace it with explicit node file
associations or agent workflow instructions, then remove the old configuration.
New configs omit it. No automatic context selection or injection occurs.

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
cache can be removed and rebuilt. Direct `read`, metadata-only `query`, and graph commands do
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

Exit codes: `0` success, `1` doctor findings, `2` operational
or usage errors.
Usage errors also print command help/diagnostics to stderr.
Text output uses indented JSON for records and YAML frontmatter plus text for full reads.

```sh
npm run check
npm test
npm run build
```

Tests cover graph integrity, section boundaries, dimension queries, preservation
of unrelated text, concurrent edits, path boundaries, CLI mutation/repair,
backlinks, projected queries, and real QMD search across edits and deletions. No model downloads are
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
kw query --view mobile-rules
kw map
```

`map` includes a paginated view catalog. Additional query flags narrow a saved
view. The explorer's Views section displays the selected nodes and their
internal edges. Definition edits refresh automatically. Views do not restrict
access to the underlying collection. See the
[view contract](skills/use-kw/references/cli.md#named-boolean-views) for API output,
validation, and configuration details.

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
No vocabulary is fixed.

Pinch-to-zoom is recorded as a separate follow-up; gesture behavior is unchanged.

The workspace header uses small breadcrumbs and one toolbar, with Graph/List
left of search. Table columns are Name, Description, Type, and each dimension;
click any header to sort and click again to reverse direction. Counts and paging
are below the table. Secondary context controls live in the Filters popover.
