# Advisory schemas

Schemas belong to the existing vocabulary map, not a second configuration file.
They are optional and do not impose an ontology on ordinary collections.

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

These are analysis only. `create` and `link add` do not enforce schemas;
`fix --safe` does not rewrite content or relationships to satisfy them. Existing
structural write checks still apply. The explorer and `fix` display these
findings through their existing doctor integration. No cycle analysis, semantic
inference, relationship repairs, or workflow-specific enforcement is provided.
