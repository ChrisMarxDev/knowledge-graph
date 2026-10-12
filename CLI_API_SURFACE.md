# CLI API surface

Status: verified inventory; next-iteration scope is under discussion.

This is the top-level record for CLI scope and agreed API decisions. The current
surface below records implemented behavior, not a commitment to keep every feature.
The proposals at the end are not accepted decisions or instructions to remove code.
No command has been removed as part of this inventory.

Update this document when agreeing additions, removals, or contract changes, then
keep implementation, help, tests, README, and the bundled usage skill aligned.
If code and this document disagree, record the discrepancy and resolve it explicitly;
do not silently treat either an implementation accident or a proposal as the contract.
Detailed formats remain in the [CLI/file reference](skills/use-kw/references/cli.md),
[source reference](skills/use-kw/references/sources.md), and
[schema/template reference](skills/use-kw/references/schema-templates.md).
This document governs CLI scope; it is not an inventory of HTTP endpoints or UI controls.

## Current surface: 30 executable commands

Verified against `src/cli.ts` and each command's `--help` on 2026-10-12.
Command groups and generated help are not counted as executable capabilities.
All commands support `-h, --help`. Options below are command-specific.

### Setup and distribution

| Command | Purpose / effects | Options and defaults |
|---|---|---|
| `init` | Create configuration, an empty vocabulary, and knowledge directory. Does not import existing Markdown. | None |
| `skill install` | Copy the installed tool's bundled `use-kw` skill and references into the target repo's `skills/use-kw`. | `--dry-run`; `--force` replaces differing bundled files, retains extras |
| `template list` | List bundled starter setups. | None |
| `template show <source>` | Inspect bundled/local/Git templates or knowledge folders, including contents. Git sources can access the network. | `--ref <ref>` (Git default HEAD), `--folder <path>` |
| `template apply <source>` | Preview additions of vocabulary, nodes, and skills; write only when requested and conflict-free. Git sources can access the network. | `--ref <ref>`, `--folder <path>`, `--apply`, `--dry-run` |

### Discovery and reading

| Command | Purpose / effects | Options and defaults |
|---|---|---|
| `map` | Return instructions, vocabulary, saved views, and node cards; each list is paged independently with shared paging arguments. | `--limit 20`, `--offset 0` |
| `query` | Filter node cards by metadata and optionally a saved view. Reads current files. | `--type <type>`, repeatable `--dimension <name=value>`, `--missing <field>`, `--filter <json>`, `--view <name>`, `--limit 20`, `--offset 0` |
| `read <id>` | Read a node card/section index or bounded Markdown body; accepts `ID#SECTION_ID`. | `--detail full\|overview` (full), `--section <anchor-or-heading>`, `--from-line 1`, `--lines 200`, `--max-bytes 16000` |
| `related <id>` | Traverse explicit graph edges and return neighboring nodes. | `--direction outgoing\|incoming\|both` (both), `--depth 1`, `--relation <name>`, `--limit 50` |
| `search <text>` | QMD keyword search; refreshes the local index before searching. | `--limit 20` |
| `context [text]` | Select cards using file links, file sources, configured file-pattern guidance, optional keyword hits, and outgoing one-hop edges. Return selection reasons and omissions. | Repeatable `--file <path>`, `--max-bytes 12000`, `--limit 20` (text candidates) |
| `views list` | List saved Boolean graph selections. | `--limit 20`, `--offset 0` |
| `views show <name>` | Inspect one saved selection. | None |
| `history <id>` | Read Git history for the node's current path with rename following. Does not commit or restore. | `--limit 10` |

### Identity and authoring

| Command | Purpose / effects | Options and defaults |
|---|---|---|
| `id generate` | Generate a UUID v4; writes no files. | None |
| `id assign <file>` | Add a UUID to existing frontmatter without an ID. Refuses replacing an existing ID. | `--dry-run` |
| `create <file>` | Create a Markdown node with a UUID and initial frontmatter. Refuses overwrite. | Required `--title <title>`; `--type <type>`, `--description <text>` (empty), repeatable `--dimension <name=value>` |
| `set <id> <field> <json-value>` | Replace a top-level field or `dimensions.NAME`; refuses changing `id`. | `--dry-run` |
| `rename <id> <file>` | Move a node within knowledge roots, retaining its ID. Does not rewrite raw file-path references. | `--dry-run` |
| `link <source> <relation> <target>` | Add an explicit node/section edge after validating its target; existing exact edges are a no-op. | `--dry-run` |
| `unlink <source> <relation> <target>` | Remove the exact stored relation/target pair, including a dangling target. | `--dry-run` |
| `source list <id>` | Return evidence references and source diagnostics for a node. | None |
| `source add <id> <kind> <target>` | Add/update a URL, file, or bibliographic reference. Identity is kind + target + optional locator. Does not fetch evidence content. | `--title <text>`, `--locator <text>`, `--note <text>`, `--dry-run` |
| `source remove <id> <kind> <target>` | Remove an exact source identity. An omitted locator matches only entries without one. | `--locator <text>`, `--dry-run` |

### Integrity and vocabulary

| Command | Purpose / effects | Options and defaults |
|---|---|---|
| `doctor` | Check structure, references, undeclared vocabulary, and optional advisory schemas. Writes nothing. | None |
| `fix` | Preview repairs for missing IDs and scalar dimension values; does not infer vocabulary or repair ambiguous links. | `--safe` applies repairs; `--dry-run` forces preview |
| `meta show` | Read the full authored vocabulary map. | None |
| `meta sync` | Preview registering observed type/dimension/relation names with empty descriptions; retains existing definitions. | `--apply` writes; `--dry-run` forces preview |
| `index` | Refresh the local QMD keyword index. No embeddings or model downloads. | None |

### Human explorer

| Command | Purpose / effects | Options and defaults |
|---|---|---|
| `view` | Serve the read-only explorer on localhost, print its URL, open the browser, and run until interrupted. Search can refresh local cache. | `--port 4317` (0 selects a free port), `--no-open` |

## Shared contract and important distinctions

- Global options: `--project <directory>` (current directory), `--json`,
  `-h, --help`, `-V, --version`. Generated `help [command]` is also available.
- Most commands discover `.knowledge/config.yaml` upward from `--project` and
  operate only on its configured roots. `init` creates setup at that directory.
  `skill install` uses Git-root discovery instead, falling back to the selected
  directory. `id generate`, `template list`, and `template show` need no collection.
- Markdown/YAML files are authoritative. Types, dimensions, and relation names
  are project-defined. Dimensions support multiple names and multiple values.
  Current `type` is a single value, unlike dimension lists.
- Node lookups generally accept stable IDs or project-relative node paths. Newly
  generated IDs are UUID v4. Node edges, section edges, raw file references, and
  evidence sources are separate concepts. Explicit section IDs use `{#id}`.
- Body edits, node deletion, view authoring, vocabulary descriptions, and config
  editing currently use ordinary file editing; there are no dedicated commands.
- Query dimension flags combine with AND, including repeated values of one
  dimension. Saved views and JSON filters support Boolean expressions. The UI's
  tag input syntax is not a CLI query language.
- JSON successes use `ok: true` plus command-specific fields. Failures use
  `ok: false` and `error: {code, message}`. Command failures use `COMMAND_FAILED`;
  argument-parser errors use Commander codes. Human output is generally formatted
  JSON, except body reads print content. Help/version print text even with `--json`.
- Exit 0 means successful execution, not necessarily no findings. Exit 1 is used
  for doctor findings and template-application conflicts. Exit 2 is used for
  command/argument errors. `fix` can exit 0 while returning remaining issues.
- Most authoring commands write immediately; `fix`, `meta sync`, and
  `template apply` preview by default. Where supported, `--dry-run` wins over
  write flags. `init` and `create` do not have a dry-run option.
- `map`, `query`, and `views list` use record pagination. `read` bounds body bytes
  and lines. `context` bounds its serialized card array, not the entire output
  envelope. Warnings, vocabulary definitions, and other payloads are not uniformly
  byte-bounded. Current limits are not an overall context-window guarantee.
- Search uses `.knowledge/cache/qmd.sqlite`, a derived local cache. `search`,
  textual `context`, and explorer full-text search refresh it automatically;
  `index` exposes manual refresh. Ordinary graph operations need no index.
- `read --detail overview` is a CLI summary mode, separate from the removed UI
  graph Overview feature. `views` means saved selections; `view` starts the server.

## Current iteration review — proposals, not decisions

The intended baseline remains local files, free vocabulary, explicit connections,
efficient agent reading, and human graph navigation. Review features by the
primitive they provide, not just their command count.

| Review area | Proposed direction | Decision needed |
|---|---|---|
| Bounded reading, filtering, traversal, keyword search | Retain as core. | Keep `map`, `query`, `read`, `related`, and `search` as separate entry points? |
| Vocabulary, IDs, diagnostics | Retain as core. | Keep conservative repairs and registration separate from validation? |
| Basic authoring helpers | Retain graph-aware conveniences provisionally. | Is the CLI a supported writer, or mainly a reader/validator over agent-edited files? |
| `context` and configured guidance | Strongest candidate for deferral from the primitive layer. It combines selection policy, priority, traversal, and budgets. | Keep composition in the CLI or move the workflow to skills? |
| Templates, Git imports, advisory schemas | Review separately from the core file/graph model. | Are starter distribution and schema rules needed in this iteration? They are distinct features even though templates can bundle schemas. |
| `sources` vs `files` | Review overlapping representations before deleting commands. | Are structured evidence citations necessary, or are graph edges and file references enough? |
| `history`, `rename`, `index` | Candidates to drop as public conveniences. Git/filesystem operations and automatic search refresh already exist. | Is stable-ID lookup/manual refresh enough added value to retain these wrappers? |
| Saved views | Retain provisionally because they support current human navigation. | Keep CLI inspection and `query --view`, even without CLI view authoring? |
| `view`, `init`, `skill install` | Retain as project entry points. | Confirm their current responsibilities rather than expanding setup automation. |

## Decision log

- 2026-10-12: User requested a full CLI inventory before deciding what to remove,
  and a top-level API surface document. Recorded all 30 implemented commands.
- No retention/removal choices have been approved yet. Implementation is unchanged.
- Corrected the existing reference's command table to include `views list`,
  `views show`, and `query --view`; these were already implemented and described
  elsewhere in that reference.
