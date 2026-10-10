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
with the CLI/API. Future use-case workflows and knowledge-injection skills will
live separately under `skills/`.

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
# Or: kw --project /path/to/project view --port 4318
```

`view` serves the built React interface and a read-only API on `127.0.0.1`.
`--port` defaults to `4317`; `0` chooses an available port. The command prints
its URL and stays running until Ctrl+C. It does not open a browser automatically.
Build first, including when running `view` through `npm run dev`.

The explorer provides:

- A grouped map and persistent Markdown reader. Click a node to read without
  moving the camera; **Explore neighborhood** explicitly narrows the graph.
- Grouping by type or any existing dimension. Multi-value nodes appear in each
  applicable group and retain one canonical identity. No types are built in.
- Title/description filtering, type/dimension/relation filters, and a separate
  **Full text** action using the existing QMD keyword search. Full-text results
  can locate a node even when the live title filter excludes it.
- Directed relationships, selected-neighbor emphasis, group expansion, pan,
  zoom, fit, and anchored section navigation. The selected card's **+** opens
  its section/file list. Hidden group members' edges end at the group header.
- Diagnostics, unresolved link labels, and bounded text previews for explicitly
  referenced files inside the project. File previews include backlinks.
- Automatic graph refresh roughly every 2.5 seconds, preserving selection,
  camera, and expanded groups. Changed nodes briefly highlight; removed or
  unparseable selections show a notice. Light/dark theme and grouping persist
  in browser-local storage; the UI never writes authored knowledge.

Views initially show three nodes per group. Expansion is capped at 160 visible
node cards and 1,200 drawn connections; filtering and neighborhood focus narrow
larger maps. All node cards remain available through the graph API, while bodies
load on demand in 48,000-character pages and referenced files in up to 48,000-byte
pages. This is a first desktop-oriented explorer, not a force-layout editor.
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
multiple values rather than repeated YAML keys. Domain-specific value typing and
requiredness rules are deferred. `files` contains paths relative to the project
root. Unlike node links, file paths do not survive renames automatically.

Section targets use explicit IDs in headings:

```markdown
## Retry behavior {#retry-behavior}
```

A link to `refund-idempotency#retry-behavior` remains valid when the heading text
changes, provided the explicit ID remains. Heading IDs must be unique within a
file. These are authored sections, not QMD embedding chunks. The annotation is
readable Markdown text; not every Markdown renderer renders it as an HTML anchor.

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

`doctor` detects missing/duplicate IDs, malformed frontmatter and field shapes,
dangling node/section references, duplicate section IDs, broken file paths, and
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

Exit codes: `0` success, `1` doctor findings, `2` operational or usage errors.
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
