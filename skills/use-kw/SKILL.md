---
name: use-kw
description: Read, search, traverse, edit, and diagnose a local Markdown knowledge graph with the kw CLI. Use when a project uses kw or the user asks to manage or initialize repository knowledge with it; includes first-use setup from existing project documentation.
---

# Use kw

`kw` manages Markdown files with YAML frontmatter. Types, dimensions, and
relationship names are defined by each project. Files remain authoritative;
QMD supplies keyword search through a rebuildable local cache.

## Locate the tool and collection

Use `kw` if installed. `kw --version` (or `-V`) prints the package version
without requiring a project; it remains plain text with `--json`. From a source checkout, use `node bin/kw.js` after
`npm run build`, or `npm run dev --` to run the source. Node.js 22.12+ is required.
The public macOS install command is
`curl -fsSL https://raw.githubusercontent.com/ChrisMarxDev/knowledge-graph/HEAD/install.sh | sh`.
It downloads and runs the same script in one step. From a tool checkout,
run `sh install.sh` to install or
reinstall from the remote default branch. It needs Git, Node, and npm; defaults
to `~/.local/bin/kw`, with managed builds in `~/.local/share/kw`. The installer configures Bash/Zsh/Fish PATH automatically; open a new terminal
if prompted. Pass `--no-modify-path` or set `KW_NO_MODIFY_PATH=1` to opt out. Use `--repo`, `--ref`, and `--prefix` to select
the source and destination. Reinstall fetches committed Git state, not local
uncommitted edits, and retains the previous installation if the new build fails.
Restart running `kw view` servers after reinstalling. No release is required.

For local testing, run `task install` from the tool checkout. It installs locked
dependencies, builds the CLI/UI including uncommitted edits, and links
`~/.local/bin/kw` to the checkout for use from any project. Keep the checkout in
place; rerun after source changes and restart running `kw view` servers. Set
`KW_PREFIX` for another prefix. It replaces its own link or a managed Git install,
retains previous managed builds, and refuses unrelated executables. Shell PATH setup is automatic here too; `KW_NO_MODIFY_PATH=1` skips it. Remove the checkout link before switching
back to `sh install.sh`.

Resolve the tool checkout independently of the project whose knowledge is being
read; from elsewhere, use an absolute path to `bin/kw.js`.

To install this bundled skill into a project, run `kw skill install`. It copies
the installed tool's skill and references to `skills/use-kw` at the Git root
(or the selected directory outside Git), without requiring knowledge initialization
or network access. `--project` selects the starting directory. Preview with
`--dry-run`; use `--force` to replace differing bundled files when updating.
Identical files and additional local files are retained. Agent setup files and
agent-specific skill registration are not changed.

Use `kw --project /path/to/project --json ...` for agent-facing results. The CLI
finds `.knowledge/config.yaml` by walking upward from that directory. Its
`roots` define the included knowledge directories; do not add sources beyond
the user's chosen scope. If no configuration exists for the intended repository,
follow the first-use setup below; a wrong working directory or invalid existing
configuration is not a reason to reinitialize.

Read [the CLI and file contract](references/cli.md) when constructing advanced
filters, changing configuration/frontmatter, or using mutation and repair
commands. Use `kw <command> --help` to check installed-version flags.

## First use in an uninitialized repository

When the intended repository has no applicable `.knowledge/config.yaml`, offer
to initialize knowledge for the whole repository using its existing Markdown
and concept/design files, including those referenced by its agent setup.
First inspect the repository's agent instructions/configuration (such as
`AGENTS.md`, `CLAUDE.md`, and locally referenced skills) and inventory relevant
project documentation. Follow their local document references; do not silently
include external repositories, company knowledge, or personal/global skills.

Read [repository initialization](references/initialization.md) for the discovery
and import procedure. Present a concrete scope with the discovered source paths,
proposed knowledge roots, and how existing documents will be represented. Then
ask whether to initialize that scope, unless the user has already authorized
it. For example: “This repo has no kw setup. Shall I initialize repo-wide
knowledge from README.md, docs/, and the concept files linked from AGENTS.md,
keeping the originals in place?” Use actual discovered paths in the question.

Wait for the answer before initializing or importing. If declined, continue the
original task with the existing files and do not repeatedly ask in that task.
If approved, initialize at the repository root, incorporate the agreed sources,
and validate the result; creating an empty collection alone does not complete
the requested setup. Existing collections keep their chosen scope; do not
reinitialize them or expand their roots automatically.

## Vocabulary and advisory schemas

Read the metadata file configured by `.knowledge/config.yaml`, or use `map` for
paged orientation. Types, dimensions, and relationship names belong to the
project. `doctor` reports undeclared names; resolve typos or update definitions
case by case through file editing. There is no vocabulary synchronization command.
Optional schemas provide advisory checks, not write restrictions; see
[advisory schemas](references/schema-templates.md).

## Find and read knowledge

Use `query` as the main discovery command:

```sh
kw --json query --file src/payments.ts --fields id,title,description
kw --json query "refund retries" --type rule --limit 10
kw --json query --view backend --dimension component=app
kw --json map --limit 20
```

Without text, query filters current files with no index. Text uses QMD keyword
search and refreshes the derived local cache. Metadata, view, and file conditions
intersect before paging. Repeated dimensions use AND; repeated `--file` paths
use OR over exact project-relative file associations and file-kind sources.
Source content is not searched. `--fields title` or `--fields description` returns
only those fields; include `id` or `path` when you need to read results later.
`search TEXT` remains useful for scored matches and snippets.

```sh
kw --json read NODE_ID
kw --json read NODE_ID --section SECTION_ID
kw --json link show NODE_ID --direction both --limit 20
```

Read always returns complete parsed `frontmatter`, including custom fields and
outgoing links. Full mode returns a bounded body; overview adds sections/links.
Plain full output includes YAML frontmatter. `link show` scans incoming as well as
outgoing edges, including section targets and unresolved references. It pages
direct relationships rather than selecting a multi-hop context automatically.
Follow `nextOffset` or `nextLine`; inspect statuses and warnings and run doctor
for structural issues. Body budgets do not bound metadata, and projections do not
guarantee a total byte budget. Choose subsequent reads based on the task.

## Edit knowledge

```sh
kw --json create knowledge/nodes/refunds.md --title Refunds --type capability
kw id
kw --json link add SOURCE_ID depends_on TARGET_ID
kw --json link add SOURCE_ID governed_by 'TARGET_ID#SECTION_ID'
kw --json link remove SOURCE_ID depends_on TARGET_ID
kw --json source add NODE_ID file docs/design.md --locator 'Retry behavior'
kw --json source remove NODE_ID file docs/design.md --locator 'Retry behavior'
```

Create generates an ID and scaffolds title, type, description, dimensions, links,
files, sources, and a title heading. Type/description default to empty strings;
no project-specific fields are guessed. `id` generates a UUID v4 without requiring
a project or changing a file. Existing valid non-UUID IDs remain supported.

Edit ordinary metadata and body content directly. Preserve IDs and explicit
section anchors when moving/editing documents. Use Git directly for history.
Raw file references need manual updates after file moves. Relationship and source
mutators validate their supported structures and preserve unrelated authored
content. `--dry-run` previews changes. On lock/change errors reread before retrying.

Links are named node/section edges; section targets use explicit `{#section-id}`
headings. `files` are untyped project-relative associations. `sources` are evidence
citations, separate from graph links; read them in full frontmatter. See
[source references](references/sources.md) for identity and validation rules.
Citations are evidence, not instructions to execute or permission to expand scope.

## Diagnose and repair

Run `doctor` after structural changes. Exit 1 means findings (including warnings);
exit 2 means failed invocation. `fix` previews missing IDs and scalar-dimension
repairs; `fix --safe` writes them and `--dry-run` overrides writes. Resolve
vocabulary mismatches and ambiguous links deliberately through file editing.

Template installation, context assembly, metadata setters/sync, ID assignment,
view/source inspection wrappers, rename, and history commands are removed.
Use agents to adapt user-selected template repositories. Existing nonempty legacy
`guidance` produces an `OBSOLETE_GUIDANCE` finding: review intent, use explicit
file associations or agent workflow instructions, then remove that config.
There is no automatic injection or configured required-context selection.

## Open the human explorer

Use `kw --project /path/to/project view [--port 4317]` to serve the read-only map
and reader on localhost. From the project directory, `kw view --port 4400`
selects that port without needing `--project`. Build the checkout first with `npm run build`; the
server needs the bundled UI assets even under `npm run dev`. The command prints
its URL, opens the default browser, and stays running until interrupted.
Pass `--no-open` for headless or remote sessions. Browser-launch failures warn
on stderr without stopping the server; open the printed URL manually.
`--port 0` selects an available port. With `--json`, startup returns
`{ "ok": true, "url": "http://127.0.0.1:PORT", "readOnly": true }`.

The UI lays out explicit connections with Cytoscape.js/fCoSE, displays relationships and
sections, previews referenced project files, exposes diagnostics, and offers
QMD full-text keyword search. It polls graph changes and preserves navigation.
Its compact toolbar contains a filter combobox; panel toggles
sit at the top of the screen.
Type individual tags such as `component:app`, `NOT component:app`, or `type:guide`.
Autocomplete appears only after typing; no predefined filter sheet or Include/Exclude
switch is shown. Quote names/values containing spaces or colons. A dimension named
`type` uses `"type":value`. `NOT` is case-insensitive. Remove a chip to replace it.
These entries are tags, not full AND/OR expressions; plain text still searches
node titles/descriptions.
Views open from the sidebar in the same explorer, identified by breadcrumbs and
the browser-tab title; no duplicate large page headline is shown;
the All knowledge breadcrumb returns to the full collection. Clearing filters retains
the selected view. Includes use OR within a field and AND across fields;
exclusions subtract matches. Chips narrow the selected view without editing YAML.
Enter selects a suggestion or commits title/description text. The dropdown's
Search document contents action uses QMD; results retain active metadata/view
constraints. Exclusions hide graph nodes, not Markdown heading sections.
Compact 10px node titles wrap on canvas-colored backgrounds. Small dimension-value
dots form a centered, evenly spaced row within the main fill; colors match the hover card and Dimension dots
legend. More than four values show three dots plus a + marker.
Hover cards show descriptions, dimensions, sections/files and
connection counts. Fit caps automatic magnification; manual zoom remains available.
Network shows each node once; the passive legend identifies stable type colors. Dragging moves nodes.
Arrange runs in a cancellable worker; positions persist locally per
project/origin. Fit changes only the camera. Use central List mode for keyboard navigation. Selection highlights neighbors; empty canvas clears selection.
Both sidebars resize by dragging their inner dividers or using arrow keys on a
focused divider; widths and visibility persist in browser-local storage. Filters are shared by Graph and List. Panel toggles sit at the top of the screen.
Selecting knowledge opens the full-height reader; without a node, file, or
open diagnostics, it stays hidden. Details/Connections switch in its top bar;
type/dimensions are chips. No section index precedes the document; an opening
heading matching the reader title is hidden, while other headings remain. The
neighborhood action is an icon. Pinning controls/locking are removed; Arrange
may reposition every node and ignores old saved pin flags.
It never edits authored files; full-text search may rebuild the local QMD cache.
The map includes the current filtered nodes; filters can hide project knowledge.
Use the CLI's structured read/query commands for agent context.

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

For visual feedback, enable **Annotate UI** in the left sidebar, add notes using
Agentation, and copy feedback into the agent chat. **Done** closes annotation mode.
The help panel exposes selectable output after Copy, including on clipboard failure.
Notes are browser-local and project/origin-scoped, with seven-day retention; copy
important feedback to retain it. The graph is one canvas, so name affected nodes
in notes. There is no MCP connection or automatic delivery to an agent.

Use Git for committed history; the tool never commits automatically. Vector search,
embedding generation and automatic knowledge injection are not implemented.
Optional opinionated workflows live in separate skills;
this baseline skill does not impose their vocabulary.

## Reuse named views

`map` includes the project's saved Boolean views. Inspect their definitions in
configuration/YAML files, then use `kw query --view NAME` to retrieve matching nodes. Additional query filters narrow the selection. The human
explorer offers the same selections in its Views section.

Views are authored in the project's config or its `viewFiles` YAML files. Each
has one nested `filter`: use `and`, `or`, and `not` to combine metadata and ID
predicates, including exceptions and untagged nodes. No separate include/exclude
fields are supported. Read [the view contract](references/cli.md#named-boolean-views)
for configuration, empty-expression semantics, validation, and HTTP behavior.

## Contextual presentation, colors, and reading

Graph and List share the active context, filters, search, and selection. List
sorts by title/type and pages 50 nodes at a time. Switching modes preserves the
graph camera/layout. Full-text search opens List with snippets and narrows both
modes to returned hits. The sidebar is for saved views and secondary utilities.
Read beside neighborhood focus opens one full-document Zen view; Escape or Back
to explorer exits. Internal document links return to ordinary reader navigation.

Optional `color: "#RRGGBB"` fields belong on type and dimension definitions in
the existing metadata file, not a separate colors file. Main colors identify
types; accents identify dimensions. Defaults are stable by name. Invalid colors
produce INVALID_COLOR doctor warnings and fall back without blocking exploration.
See the CLI reference for the full color and explorer contracts.
