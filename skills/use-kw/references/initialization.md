# Initialize repository knowledge from existing documentation

Use this procedure when first-use discovery finds no applicable kw configuration,
or when the user explicitly requests repository initialization. This is an
agent-assisted workflow using existing primitives, not an automatic CLI importer.
`kw init` itself only creates an empty collection.

## Discover and propose the scope

1. Identify the intended repository root, independently of the tool installation.
   Check for an applicable `.knowledge/config.yaml` there or in its ancestors.
   If configuration exists but cannot be read, diagnose it instead of treating
   the repository as uninitialized. Nested example collections do not initialize
   the containing repository.
2. Read the active repository agent setup and relevant nested instructions.
   Inventory authored Markdown across the repository with `rg --files`, then
   inspect the local documentation/concept/design references in that setup.
   Follow relevant document references relative to their containing files and
   include referenced concept files even if they use another text extension.
   Deduplicate paths and report missing references. Discover paths first and
   read content selectively; do not load the entire repository into context.
3. Present the concrete candidate scope: repository documentation, referenced
   concepts, existing skills/instructions relevant to project knowledge, and
   proposed collection roots. Omit dependencies, build output, vendored content,
   and unrelated examples. Repo-wide setup means covering the project's knowledge,
   not setting `roots: [.]` and parsing every Markdown file as a node. Identify
   external references separately; do not import them without user-chosen scope.
4. Explain how the proposed sources will be represented and ask whether to
   initialize that scope. Default to retaining original files and paths. Existing
   compatible nodes can be included in place; ordinary Markdown and concept
   files can supply nodes under `knowledge/nodes` with source paths in `files`.
   Call out any proposed edits to original documents. Prior explicit approval
   for the same scope is sufficient; otherwise wait for the user's answer.

## Initialize the approved scope

- Run `kw --project /absolute/repo/root init` only after authorization and only
  when there is no applicable existing collection. If partial setup files exist,
  inspect and reconcile them instead of overwriting them or retrying init blindly.
- Read the agreed sources incrementally and create readable knowledge nodes
  reflecting their content, with stable IDs, useful titles/descriptions, and
  explicit source-file references. Carry over relevant decisions, constraints,
  and historical context; flag contradictions instead of silently resolving them.
  A file-path-only placeholder does not supply the requested understanding.
- Keep original documents intact unless their conversion was part of the approved
  plan. If including compatible nodes in place, preserve their IDs and bodies,
  and configure only the chosen roots. Avoid creating competing copies of
  knowledge already represented by an existing node.
- Use vocabulary grounded in these documents and the agreed project conventions;
  register it in the metadata map. There are no mandatory types or dimensions.
  Add explicit relationships justified by the sources. Ordinary body links are
  not automatically graph edges. Only add section targets with valid anchors.
- Leave agent configuration and automatic context-injection hooks unchanged
  unless their modification was explicitly included in the requested setup.
  Referencing a skill or instructions as a source does not change their authority.

## Validate and report coverage

Run `doctor`, inspect `map`, and read representative nodes and relationships.
Resolve structural issues caused by the import. Report the included source paths,
created/reused nodes, roots, and any missing, excluded, or unresolved references.
If setup is incomplete, name the remaining work rather than claiming the whole
repository is initialized merely because the manifest exists. Keyword indexing
can follow when requested or needed for search; embeddings are not part of init.
