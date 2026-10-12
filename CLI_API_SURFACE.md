# CLI API surface

Status: verified current inventory plus target-surface decisions; implementation migration is pending.

This is the top-level record for CLI scope and agreed API decisions. The current
surface below records implemented behavior, not a commitment to keep every feature.
Accepted target changes and open questions are recorded separately below.
The inventory still describes the running implementation; accepted removals and
renames have not yet been applied to code during this API design discussion.

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

## Target surface decisions — implementation pending

The CLI should add value beyond ordinary file editing. Agents can inspect and
edit Markdown/YAML directly; schema-aware creation and relationship operations
remain useful. These decisions supersede the initial review proposals.

| Area | User decision / direction |
|---|---|
| `template list/show/apply` | Remove all template CLI functions. Agents can adapt a referenced repository themselves. This does not independently decide whether advisory schemas or existing reusable skill files are removed. |
| `history` | Remove; use Git directly. Revisit only if future internal tooling adds value. |
| `set` | Remove; agents edit frontmatter directly. |
| `create` | Keep. Desired role: create an empty document with fields ready to fill. Exact scaffold fields still need definition; current implementation does not include every supported field. |
| `link` and `unlink` | Keep relationship helpers, rename to `link add <source> <relation> <target>` and `link remove <source> <relation> <target>`. Old aliases are not yet decided. |
| `source add/remove` | Keep the existing grouped command pattern. |
| `source list` | Remove; inspect the document directly. |
| `views list/show` | User favors removing inspection wrappers and using files / query. Clarify that `query --view` returns matching nodes, not the saved definition. Saved views and UI navigation are not being removed. |

## Open questions and technical implications

- **Read / related:** User proposes full frontmatter in `read`, following outgoing
  IDs with additional reads, then removing `related`. Current full reads expose
  selected card fields, not complete frontmatter or outgoing links. Full
  frontmatter enables outgoing traversal but does not reveal incoming links or
  replace multi-hop traversal automatically. Decide whether reverse lookup belongs
  in query, read, or is unnecessary. Define full-frontmatter behavior for JSON,
  plain output, section reads, and byte limits before implementing.
- **Context:** Current command selects cards from exact file references, file
  sources, configured file-pattern guidance, optional keyword matches, and one-hop
  outgoing links. Configured guidance is prioritized as required; omissions and
  unresolved references are reported. It is deterministic workflow composition,
  not semantic understanding or automatic injection. Removal remains undecided.
  Proposal: defer this composition to skills; separately decide whether querying
  by referenced file is a needed primitive. Removing context must not silently
  leave guidance configuration that no longer affects anything.
- **IDs:** `id assign` only writes a fresh UUID to a file missing an ID. `create`
  already generates one, and `fix --safe` repairs missing IDs. UUID generation is
  Node's standard `crypto.randomUUID`, not a proprietary identity system. User is
  open to retaining `id generate` as a portable convenience; neither ID command's
  final disposition is settled. Directly authored valid IDs remain supported.
- **Rename:** User favors removal, pending any additional value. It resolves an
  ID to a file, checks configured write boundaries, and refuses overwrite, but
  does not rewrite file references. Moving the file directly preserves its ID.
  Recommendation: remove this wrapper.
- **Metadata:** `meta show` resolves and parses the configured metadata file;
  direct reading is sufficient when its path is known. `meta sync` scans every
  node and registers missing type, dimension, and relation names with empty
  descriptions. It neither registers all dimension values nor infers meanings;
  typos can become registered vocabulary. Doctor already detects undeclared names.
  Recommendation: remove show; consider dropping sync and letting agents review
  doctor findings and edit metadata deliberately. User decision pending.
- **Remaining scope:** `map`, `query`, `search`, `init`, `skill install`, `doctor`,
  `fix`, `index`, `view`, optional schemas, and detailed shared contracts have not
  all received an explicit retention decision in this review. Do not infer
  removal from silence.

## Decision log

- 2026-10-12: User requested a full CLI inventory and top-level API surface document.
  Recorded 30 implemented commands; corrected missing saved-view entries in the
  detailed reference. No runtime changes.
- 2026-10-12: Recorded user feedback to remove template/history/set/source-list
  wrappers, keep create and relationship/source writers, and standardize graph
  mutations under `link add/remove`. Recorded unresolved read/traversal, context,
  ID, metadata, rename, and view-inspection questions above. Implementation
  migration follows the API design discussion; current inventory remains accurate.
