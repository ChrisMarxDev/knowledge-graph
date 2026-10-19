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
files: [src/cli.ts, src/core.ts, src/qmd.ts, src/skill.ts, src/review.ts, src/query.ts, src/skill-nodes.ts]
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

There are 18 executable commands. Groups and generated help are not counted.
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
| `query [text]` | Combine keyword alternatives with metadata, saved view, and file-reference filters. | repeated `--also-text`, `--explain`, `--type`, repeated `--dimension name=value`, `--missing`, `--filter JSON`, `--view`, repeated `--file`, `--fields`, `--limit 20`, `--offset 0` |
| `read <id>` | Complete parsed frontmatter plus bounded body, or overview with sections/links. | `--detail full\|overview` (full), `--section`, `--from-line 1`, `--lines 200`, `--max-bytes 16000` |
| `link show <id>` | Incoming and outgoing authored edges, including unresolved targets. | `--direction incoming\|outgoing\|both` (both), `--relation`, `--limit 20`, `--offset 0` |
| `link add <source> <relation> <target>` | Validate and add a node/section edge; exact duplicate is a no-op. | `--dry-run` |
| `link remove <source> <relation> <target>` | Remove exact stored edge, including dangling targets. | `--dry-run` |
| `source add <id> <kind> <target>` | Add/update url, file, or reference evidence citation. | `--title`, `--locator`, `--note`, `--dry-run` |
| `source remove <id> <kind> <target>` | Remove citation by kind + target + optional locator. | `--locator`, `--dry-run` |
| `review` | Find knowledge affected by local Git changes; no stored review state. | `--staged`, `--base REF` (mutually exclusive) |
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

## Alternative keyword queries and explanations

```sh
kw --json query "prevent duplicate payments" --also-text idempotency --also-text retry --explain
```

`--also-text TEXT` repeats independent keyword searches and unions their hits.
It requires nonblank positional text. When supplied, all texts are trimmed,
validated as 1–500 characters, and deduplicated by exact case-sensitive text in
first-seen order; at most 8 distinct texts including the original are allowed.
Invalid inputs exit 2 before opening QMD. The caller supplies alternatives;
there is no automatic synonym generation, embedding, or graph expansion.
Without --also-text, existing single-query input/ranking behavior is unchanged.

QMD refreshes once per invocation. Metadata/view/file eligibility filters apply
to each list before assigning 1-based ranks; nodes deduplicate by path. With
multiple distinct queries, sort each list by QMD score descending then path;
fuse with equal-weight reciprocal rank fusion: score = sum(1 / (60 + rank))
over matching queries. Sort fused results by score descending then path. One
distinct query retains QMD ordering and scores. Page after fusion; total counts
the eligible union. Repeating an identical trimmed query does not boost it.
Source contents and graph relationships are not searched or inferred.

`--explain` adds top-level `retrieval` and `explanations`; cards/projections are
unchanged. retrieval contains mode=keyword, queries (execution order),
fusion=rrf|none, and rrfK=60 only for rrf. Each explanation contains resultIndex
(zero-based within the returned page), score, matches [{queryIndex,rank}], and
snippet ({queryIndex,text,source:"indexed-markdown"} or null). Choose the snippet
from the matching query with the best rank; ties favor earlier queries. Snippet
text is capped at 500 characters and may include frontmatter, not just body
prose. A missing winning snippet stays null. Scores are ranking signals, not
confidence. No section/line locator or causal explanation is synthesized.

Metadata-only --explain uses queries=[], fusion=none, score=null, matches=[],
snippet=null without loading QMD. Empty searches return total=0 and empty
explanations. Without --explain neither extra field is emitted. No new HTTP/UI
search options or changes to the separate search command are introduced.

## Review knowledge affected by Git changes

`kw review` compares HEAD with the current working tree (net staged + unstaged
changes), plus non-ignored untracked files. `--staged` compares HEAD with the
index only. `--base REF` compares the merge-base of HEAD and REF with the current
working tree, including branch and uncommitted changes plus untracked files.
The flags are mutually exclusive. No network fetch is performed.

Match changed paths against current knowledge `files`, local file-kind `sources`,
and the knowledge node's own path. Paths are normalized project-relative names;
renames match both old and new names. URL/reference sources and graph links do
not participate. Associations always come from the current working-tree nodes,
even with --staged; stage validated knowledge edits before committing. Changes
outside the selected project are excluded. Moves across its boundary appear as
added/deleted paths. Submodules are Gitlink paths, not recursively scanned repos.

Output is unpaginated: `mode` (working-tree, staged, base), `base` (resolved
comparison commit or null for an unborn branch), `knowledgeSnapshot`
(working-tree), `results`, `unmappedFiles`, and `warnings` (doctor findings).
Each result has nullable `id`, `path`, `title`, `knowledgeChanged`, and
`changedFiles`. Change entries have `path`, `status` (added, modified, deleted,
renamed, copied, type-changed, untracked), and `oldPath` for renames/copies.
Nodes are ordered by path; changes by path. A change appears once per affected
node despite duplicate associations. Unmapped files match neither a node's own
path nor any current file association. Deleted/unparseable nodes cannot be
returned as current nodes; their changes remain unmapped unless another node
references them, and parse failures appear in warnings.

No checkpoints, hashes, approval flags, timestamps, hooks, database writes,
Git staging, commits, or gitignore changes. Repeated review reports the same
remaining changes; a commit clears the default comparison. Inspect Git diffs
and validate knowledge independently: knowledgeChanged is not approval.
Successful discovery exits 0, including affected/unmapped files and warnings.
Unavailable Git, non-repository projects, bad refs, no merge-base, conflicting
flags, and unresolved index conflicts exit 2. An unborn branch uses an empty
baseline for default/staged review; --base requires HEAD. Reads are not an
atomic snapshot across concurrent edits; rerun before committing if files change.

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
within configured roots; registered-skill annotations are written to their local
registry instead. Skill installation has its separate documented boundary.

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

## Explicit local skill nodes

Optional `skillNodes` names a project-local YAML registry mapping exact SKILL.md
paths to graph annotations (id, optional title/type/dimensions/links/files/sources).
Original skill name supplies the default title; its description and body remain
authoritative. No content copies, skill frontmatter changes, implicit folder
imports, activation, execution, or new command are introduced. Only normalized
local paths without symlinks are supported. Registry problems are parse findings.

Registered skills participate in graph/query/read/link/source/fix/search/view
operations. Search indexes only selected entry points outside normal roots, not
supporting resources or registry annotations. Read preserves original frontmatter
and adds graphMetadata {path, entry, data}; cards expose effective node metadata.
Mutations write registry annotations atomically and return its path plus nodePath.
Review conservatively treats registry-file changes as changes to all its currently
registered skills. Rename registry keys with files while preserving IDs. Skill
installation remains independent. The bundled usage reference defines details.
