# CLI and file contract

This reference describes the current `kw` implementation. Global flags are
`--project <directory>`, `--json`, `--help`, and `--version`.

## Commands

| Command | Options and behavior |
|---|---|
| `init` | Creates an empty collection at `--project`; refuses existing config/map files. Existing-document onboarding is an agent workflow, not an automatic import by this command; see [repository initialization](initialization.md). |
| `template list` | Lists bundled names/descriptions; no collection required. |
| `template show <source>` | Shows a bundled name or local directory, including vocabulary and asset contents. |
| `template apply <source>` | Previews additions/conflicts for an initialized collection; `--apply` writes, `--dry-run` forces preview. Conflicts prevent all writes and return exit 1. |
| `view` | Local read-only map/reader; `--port 4317` (default), `--port 0` selects an available port. Requires built UI assets. Prints URL; runs until interrupted. |
| `id generate` | Prints a UUID v4 without modifying files. |
| `id assign <file>` | Adds a UUID to existing frontmatter without an ID; supports `--dry-run`. |
| `create <file>` | Requires `--title`; optional `--type`, `--description`, repeated `--dimension name=value`. Generates an ID; never overwrites a file. |
| `map` | `--limit 20`, `--offset 0`; pages vocabulary and node cards independently using the same offset. |
| `query` | `--type`, repeated `--dimension name=value`, `--missing field`, `--filter JSON`, `--limit 20`, `--offset 0`. |
| `read <id>` | `--detail full\|overview` (default full), `--section ID_OR_HEADING`, `--from-line 1`, `--lines 200`, `--max-bytes 16000`. Also accepts `ID#SECTION_ID`. |
| `related <id>` | `--direction incoming\|outgoing\|both` (default both), `--depth 1`, optional `--relation`, `--limit 50` neighboring nodes. |
| `link <source> <relation> <target>` | Target is a node ID or `ID#SECTION_ID`; checks it exists. Supports `--dry-run`. |
| `unlink <source> <relation> <target>` | Removes the exact stored relation/target pair; supports `--dry-run`. Can remove dangling targets. |
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
affected project-relative paths supplied to `context --file`. `nodes` explicitly
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
optional. Dimension values are lists of strings. Unknown vocabulary is reported
but remains readable/queryable. Optional schemas in vocabulary definitions analyze
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
[schema reference](schema-templates.md).

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
`dist/ui`. Stop it with Ctrl+C. The startup JSON is an ordinary CLI envelope;
HTTP responses below are direct JSON objects, not CLI envelopes. HTTP errors
return `{ "error": "message" }` and a non-2xx status.

- `GET /api/graph`: `project`, `version`, `nodes`, `edges`, `issues`, `meta`.
  Supports `ETag` / `If-None-Match` with `304` for unchanged state. Node cards
  include `key` (project-relative path), stable `id`, title/type/description,
  dimensions, files, sections (title/id/depth/start), and a content revision.
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
  referenced in `files` and resolving inside the project are readable; binary,
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
