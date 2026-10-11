# Advisory schemas and templates

Schemas belong to the existing vocabulary map, not a second configuration file.
Templates are optional bundles that seed vocabulary, reusable nodes, and skills.
Neither imposes an ontology on ordinary collections.

## Schema rules

Each type, dimension, or relation definition may contain a `schema` mapping:

```yaml
types:
  concept:
    description: An approach or mechanism.
    schema:
      required: [description, dimensions.evidence]
  dismissed-concept:
    description: An approach considered and rejected.
  constraint:
    description: A limitation shaping implementation.
dimensions:
  evidence:
    description: Support for the origin of a claim.
    schema:
      values: [confirmed, inferred, unknown]
relations:
  depends_on:
    description: An implementation dependency.
    schema:
      from: [concept, dismissed-concept]
      to: [concept, dismissed-concept, constraint]
      forbidden:
        - from: concept
          to: dismissed-concept
      allowSelf: false
      maxOutgoing: 3
```

All rules are optional. Matching is exact and case-sensitive. A missing schema
adds no rules. Definitions without schemas keep their previous behavior.

| Location | Rule | Meaning |
|---|---|---|
| `types.NAME.schema` | `required: [FIELD, dimensions.NAME]` | Nodes of this type need nonempty values for these fields. |
| `dimensions.NAME.schema` | `values: [TEXT, ...]` | Each string in that dimension must be one of these values. |
| `relations.NAME.schema` | `from: [TYPE, ...]` | Allowed source types. Missing node types do not match. |
| `relations.NAME.schema` | `to: [TYPE, ...]` | Allowed target types, including the containing node for a section target. |
| `relations.NAME.schema` | `forbidden: [{from: TYPE, to: TYPE}, ...]` | Disallowed source/target type pairs, even if both pass the allowlists. |
| `relations.NAME.schema` | `allowSelf: false` | Report a link to its source node, including any section of that node. Defaults to allowing self links. |
| `relations.NAME.schema` | `maxOutgoing: N` | Maximum number of distinct authored target strings per source and relation; nonnegative safe integer. |

Required field names are top-level identifiers or `dimensions.NAME`, using
letters, digits, underscores, and hyphens, beginning with a letter or underscore.
Arbitrary nested field paths are not supported. Missing/null values, blank text,
empty lists, and empty mappings fail requiredness. `false` and `0` are present
values. Field shape remains a separate structural check.

Type references in `from`, `to`, and `forbidden`, and dimension names in
`required`, must be declared in the same map. Lists contain nonempty strings.
An empty required list adds no requirements; empty `values`, `from`, or `to`
allowlists allow nothing. Absent allowlists are unrestricted. Empty `forbidden`
adds no exclusions. Cardinality counts distinct full target strings: `id` and
`id#section` count separately, while identical repeated links count once.
Unresolved targets still count toward cardinality; their types are not guessed.

`kw doctor` automatically analyzes declared schemas. All schema findings are
warnings and still cause doctor exit code 1. Invalid rules produce findings at
the metadata path and skip that definition's entire schema; other schemas and
structural checks still run. Unknown keys within `schema` are invalid, so typos
cannot silently disable an intended rule. Malformed YAML or invalid top-level
metadata mappings remain operational errors, as before.

| Code | Meaning |
|---|---|
| `INVALID_SCHEMA` | Malformed rule, unsupported key, or undeclared vocabulary reference. |
| `SCHEMA_REQUIRED` | Required field is empty or missing. |
| `SCHEMA_DIMENSION_VALUE` | Value outside the declared list. |
| `SCHEMA_RELATION_SOURCE` | Source type outside `from`. |
| `SCHEMA_RELATION_TARGET` | Resolved target type outside `to`. |
| `SCHEMA_FORBIDDEN_LINK` | A prohibited type pair uses this relation. |
| `SCHEMA_SELF_LINK` | Self link prohibited by `allowSelf: false`. |
| `SCHEMA_CARDINALITY` | Too many distinct outgoing targets. |

These are analysis only. `create`, `set`, and `link` do not enforce schemas;
`fix --safe` does not rewrite content or relationships to satisfy them. Existing
structural write checks still apply. The explorer and `fix` display these
findings through their existing doctor integration. No cycle analysis, semantic
inference, relationship repairs, or workflow-specific enforcement is provided.

## Apply a template

```sh
kw template list
kw template show coding
kw --project /path/to/project init
kw --project /path/to/project template apply coding
kw --project /path/to/project template apply coding --apply
kw --project /path/to/project doctor
```

Run `init` only for a project without a collection. `template list` and `show`
do not require a collection. `template apply` requires an initialized one and
previews by default. `--apply` writes; `--dry-run` overrides it. The `source`
argument is a bundled name or a local template directory, resolved from the
shell's working directory, not `--project`. Use `./coding` to explicitly choose
a local directory rather than the bundled name. No network templates are loaded.

Application merges missing names into `types`, `dimensions`, and `relations`,
retaining existing YAML comments and unrelated fields. It copies nodes into the
first configured knowledge root, retaining their paths relative to the bundle's
`nodes/` directory and preserving their authored IDs. It copies complete skill
folders into the target project's `skills/`. Those skill paths must be outside
knowledge roots. Existing config, guidance, and agent setup are not modified.
Skills are files ready for the agent's normal discovery/installation mechanism;
copying them does not register hooks or guarantee activation in every agent.

Existing vocabulary definitions must be structurally equal to be reused;
differing definitions are conflicts, not merged at the field level. Existing
files must be byte-identical to be reused. Conflicting node IDs elsewhere in
the graph are reported, as are parse errors preventing reliable ID checks.
Any conflict prevents all planned writes. Reapplying an unchanged template is a
no-op; this is an additive installer, not an upgrade or overwrite mechanism.
Resolve conflicts explicitly in the project or an adapted local bundle.

All template writes stay inside the project. Nodes additionally stay inside
configured roots. Source and destination paths must not traverse symlinks;
source paths must stay within the bundle (bundled skills use the kw package's
canonical `skills/` directory). Skill assets must be regular UTF-8 text files.
No scripts are executed. A cooperating template lock and exclusive file creation
protect application; metadata uses the normal atomic edit mechanism. On a write
failure, newly created files are removed only if their contents are unchanged.
Empty directories can remain. This is not a filesystem transaction against
external editors or concurrent non-template node creation.

## Template results

All results use the normal `ok` JSON envelope with `--json`.

- `list`: `templates`, containing each bundled `name` and `description`.
- `show`: `name`, `description`, absolute `directory`, `metadata`, `nodes`,
  `skills`. Each asset has `path` and full UTF-8 `content`; node paths are
  relative to the bundle's `nodes/`, skill paths are `skills/NAME/...`.
- `apply`: `template`, `additions` (`category`, `name`), `changes` (`path`,
  `kind`, `before`, `after`), `unchanged` paths, `conflicts` (`path`, `message`),
  and `applied`. Paths are project-relative. Kinds are `metadata`, `node`, or
  `skill`; new files have `before: null`. Changes contain complete file text.
  `applied` is true after successful `--apply`, including an unchanged reapply;
  it is false for previews and conflicts.

Exit codes: 0 successful preview/application; 1 conflicts (a successful data
result with `ok: true`); 2 malformed bundle, unsafe path, or operational error.
No changes are applied on a conflict, even though proposed additions are shown.

## Author a local template

```text
my-template/
  template.yaml
  meta.yaml
  nodes/
    project-guide.md
  skills/
    my-workflow/
      SKILL.md
      references/...
```

```yaml
# template.yaml
version: 1
name: my-template
description: Project-specific vocabulary and workflows.
nodes: [project-guide.md]
skills: [my-workflow]
```

The manifest accepts exactly those five fields. Both lists are required but may
be empty; entries must be unique. Names use lowercase letters, digits, and
single hyphens between segments. Node entries are relative `.md` paths without
`..` segments. Each node needs normal frontmatter with a unique valid stable ID
and nonempty title. Other node semantics are analyzed later by doctor.
`meta.yaml` contains exactly the three vocabulary mappings; schemas are optional.
Each listed skill needs `skills/NAME/SKILL.md` with a matching `name` and nonempty
`description` in frontmatter. Supporting UTF-8 files are copied recursively.
Template loading reads assets as data and never runs embedded code.

```sh
kw template show ./my-template
kw --project /path/to/project template apply ./my-template --apply
```

## The coding starter

The bundled `coding` template defines project, concept, dismissed-concept,
decision, constraint, incident, question, and project-template types; area,
evidence, and status dimensions; and part_of, alternative_to, dismissed_because,
motivated_by, implements, depends_on, superseded_by, uses_template, and relates_to
relationships. Inspect `template show coding` for the actual definitions/rules.

It includes three reusable guide nodes (`coding-project-template`,
`coding-intent-template`, `coding-retro-template`) and the `use-kw`, `capture-intent`,
and `retro` skills. The guides are not facts about the target project. Create
actual records with new IDs and link to a guide with `uses_template` when useful.
Capture-intent interprets coding conventions; retro uses any collection's own
vocabulary. Core commands never assign special meaning to these names.
