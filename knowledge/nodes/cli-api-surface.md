---
id: 8f0e952a-0d52-4d41-92cd-00e32c536ab3
title: CLI API surface
type: rule
description: The authoritative CLI scope and contract for the current primitive-based iteration.
dimensions:
  feature: [tooling, retrieval, authoring]
  component: [cli, files]
  status: [accepted, implemented]
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: governed_by
    target: e6e2c384-c78e-4be1-a71b-7db18333a74e
files: [src/cli.ts, src/core.ts, src/qmd.ts, src/skill.ts]
sources:
  - kind: reference
    target: Christopher CLI simplification decisions, 2026-10-12
    note: Keep graph-aware primitives; make query the workhorse; remove file/Git wrappers and template/context workflows.
  - kind: file
    target: skills/use-kw/references/cli.md
---

# CLI API surface

This kw node is the top-level truth for CLI scope and agreed behavior. Update it
with public API changes, together with implementation, help, tests, README, and
the bundled usage skill. The skill references contain detailed storage, schema,
source, and HTTP contracts. Do not introduce a competing standalone API document.

## Design boundary

Keep operations that save agents a collection-wide search or require graph
knowledge: query, resolving IDs, backlinks, diagnosis, and schema-aware writers.
Agents edit ordinary Markdown/YAML directly and use Git for history. Templates
are adapted by agents from user-selected repositories; there is no template
installation engine or automatic context-selection workflow.

## Commands

There are 17 executable commands. Groups and generated help are not counted.
All support --help. Global options: --project DIRECTORY (current directory),
--json, --help, --version. `kw --version` (alias `-V`) reads the installed
package.json version and exits 0 without a project; output stays plain text
even with --json.

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

## Query is the discovery workhorse

```sh
kw query --file src/payments.ts --fields title,description
kw query "retry handling" --view backend --dimension component=app --limit 10
kw query --fields id,title --offset 20
```

Text uses QMD keyword search, not semantic inference. Metadata/view/file filters
intersect before pagination; keyword ordering is retained. Without text, query
reads current files without creating an index. Repeated dimension flags use AND;
repeated --file paths use OR. File paths resolve against the project root and
match exact normalized files associations or file-kind sources. They do not mean
filename globs, document-body search, source-content search, or guidance rules.

--fields is an explicit comma-separated projection of card fields: id, path,
title, type, description, dimensions, files, sources. Default is the full card.
--fields title returns objects containing only title; IDs are not silently added.
Include id or path when later reads will need them. Unknown/empty fields fail.
Responses contain results, total, nextOffset, and parse warnings even with a
projection. Limits count records, not bytes; descriptions and warnings may be long.

## Read and relationship inspection

JSON read results retain node (card) and add frontmatter containing every parsed
frontmatter field, including custom values and authored links/sources. Full mode
adds content, totalLines, nextLine, truncated. Overview adds sections, links,
and warnings. Plain full mode prints YAML frontmatter followed by the bounded
body. YAML formatting/comments are not a byte-for-byte reproduction; use the
original file for that. Section reads still return the whole frontmatter.
Body line/byte budgets never silently cut frontmatter. Overview is a summary
mode, not the removed graph Overview UI.

link show returns origin plus paginated results, total, nextOffset, warnings.
Each result has source (ID or null), sourcePath, relation, target (including
section suffix), direction, status, and node (the other endpoint's card or null).
Status is resolved, missing-node, ambiguous-node, or missing-section. Missing
sections retain their containing node card. Incoming edges to any section of a
node are included. A self-link appears once per requested direction; both yields
two entries. Relations/directions filter before paging. This inspects direct
edges, not multi-hop traversal; agents choose subsequent reads themselves.
Origin needs a unique ID; node paths can resolve it. Malformed links remain in
files and are reported by doctor rather than guessed into edges.

## Authoring and metadata

create scaffolds id, title, type, description, dimensions, links, files, sources,
and a title heading. Type/description default to empty strings; dimensions to an
empty mapping, and link/file/source lists to empty lists. No project-specific
names or custom fields are invented. Preserve IDs when editing or moving files.
Use id for a portable UUID when editing an existing document; fix can also fill
missing IDs. The graph also accepts existing valid non-UUID identifiers.

Edit metadata/config/views and body content directly. Doctor reports mismatches;
the agent resolves them case by case. There is no automatic vocabulary sync.
Schemas remain advisory, and saved views still power query --view and the UI.
Raw file-path references need manual repair after filesystem moves.

## Shared behavior and boundaries

Most commands locate .knowledge/config.yaml upward from --project. Init uses the
selected directory directly; skill install finds its Git root (or the selected
directory outside Git). Generated IDs require no project. Writes to nodes stay
within configured roots. Skill installation has its separate documented boundary.

JSON uses ok:true plus result fields, or ok:false with error.code/message.
Exit 0 means completed execution; doctor returns 1 for any findings; operational
and argument errors return 2. Fix can return 0 with remaining findings. Help and
version print text. Most mutators write by default; fix previews by default.
Dry-run wins wherever supported. Init/create have no dry-run.

Map's lists paginate independently with the same offset. Read budgets cover only
body bytes/lines; query projections reduce output but are not whole-response byte
budgets. Search/text-query/explorer search refresh .knowledge/cache/qmd.sqlite.
Ordinary graph operations require no index. No embedding generation, vector
search, automatic injection, automatic commits, or source fetching is exposed.

## Removed surface and migration

Removed template list/show/apply and their import engine, related, context,
views list/show, history, id generate/assign, set, rename, source list, and
meta show/sync. Old link/unlink spellings have no compatibility aliases; use
link add/remove. Use id instead of id generate. Inspect saved definitions in
YAML and use query --view for their results. Read full frontmatter instead of
source list. Use the filesystem/Git for ordinary editing, moving, and history.

Configured guidance no longer selects context. New configs omit guidance;
doctor emits OBSOLETE_GUIDANCE for nonempty or malformed legacy guidance. Review
its intent, move useful associations into node files/sources or an explicit
agent workflow, and remove the obsolete configuration. Empty legacy lists are
harmless. Existing user-authored knowledge and reusable example files are retained.

## Decisions

2026-10-12: User approved slimming the CLI around graph-aware operations, query
as the workhorse, complete frontmatter reads, grouped link mutation and backlink
inspection, a standalone id helper, and a standard create scaffold. User requested
this contract as a kw knowledge node instead of a standalone document. Earlier
review discussion is retained in Git and agent-wiki-discussion.md.


## Installation

The Git installer and task install configure Bash/Zsh/Fish PATH automatically
when needed. Open a new terminal afterward. --no-modify-path (Git installer)
or KW_NO_MODIFY_PATH=1 skips shell changes. Unsupported shells receive absolute
executable-path guidance. Detailed startup-file behavior is in the usage skill.

## Published documentation

The Starlight CLI reference is generated from this node's body by
`docs/scripts/reference.mjs`; do not maintain a second hand-written API surface.
The site links back here and regenerates on each docs build. Human onboarding
and workflow pages complement this contract under `docs/src/content/docs`.

## Explorer metadata colors

Type and dimension definitions in the configured metadata YAML accept optional
quoted #RRGGBB color fields. Invalid values yield INVALID_COLOR doctor warnings
(exit 1), with fallback colors in the UI. No separate color config exists.
The graph API exposes colors (types/dimensions maps) and colorWarning, included
in snapshot version/ETag. See the bundled CLI reference for Graph/List and Zen
reader behavior; commands and CLI flags are otherwise unchanged.

## Passive local CLI counters

Every CLI invocation is counted once in `.knowledge/usage/counts.json`, including
failed commands and argument errors. Help, version, and generated help are not
counted. Long-running `view` counts once at startup; HTTP requests and internal
operations do not count. There is no analytics command, UI, or automatic action.

The JSON contains `version: 1`, `total`, `commands` (command-name totals), and
`calls` entries with `command`, `argv`, `count`, and `lastCalled` (UTC ISO time).
Command groups use names such as `link show`. `argv` preserves the exact CLI
argument array, including global flags and their order, without the executable
name. Different spellings/orderings remain separate combinations. No results,
durations, sessions, or source contents are stored.

The directory is located at the collection root found upward from `--project`
or cwd, even if configuration is malformed. Without a collection it uses the
nearest Git root, or the selected directory outside Git. `init` uses its explicit
target directory. A nonexistent target skips counting. The usage directory has
its own `.gitignore` containing `*`; it requires no search database.

Inspect with `cat .knowledge/usage/counts.json`; deleting that file resets counts.
Writes use a short lock and atomic replacement. Recording is best-effort: an
unwritable/corrupt file or lock contention never changes CLI output or exit code.
A process killed while holding `.knowledge/usage/.lock` may leave it behind;
remove that directory after confirming no writer is active to resume counting.
Dry-run calls still update this local counter; authored knowledge is unaffected.
