---
title: CLI workflows
description: Use bounded queries and reads to discover relevant knowledge and follow its connections.
---

## Find the relevant documents

Start with metadata or explicit file associations:

```sh
kw --json query --file src/payments.ts --fields id,title,description
kw --json query --type rule --dimension component=app
```

Vocabulary names here are examples. Use your project's metadata map or `kw map`
to discover its actual names. File matching covers node `files` entries and
file-kind `sources`; it does not search the referenced file's contents.

Add keyword text when needed:

```sh
kw --json query "retry handling" --fields id,title,description --limit 10
```

Text queries refresh the local QMD keyword index. Metadata-only queries do not
need it. Filters intersect before paging. Follow `nextOffset` for more results.

If you only need a quick overview:

```sh
kw query --fields title
kw query --fields title,description
```

Projection returns exactly those fields. Include `id` or `path` if you plan to
read the selected documents afterward.

## Read a document and its neighbors

```sh
kw --json read NODE_ID
kw --json read NODE_ID --section SECTION_ID --lines 40
kw --json link show NODE_ID
kw --json link show NODE_ID --direction incoming --limit 10
```

Reads include complete parsed frontmatter, including custom fields and outgoing
links. Body limits do not truncate frontmatter. Follow `nextLine` to continue a
bounded body read. Section reads still include the whole frontmatter.

`link show` finds incoming relationships without making your agent scan every
file. It includes outgoing links, section targets, and unresolved target statuses.
It returns direct edges; choose which neighboring IDs to read next.

## Connect knowledge

```sh
kw link add SOURCE_ID depends_on TARGET_ID
kw link add SOURCE_ID governed_by 'TARGET_ID#SECTION_ID'
kw link remove SOURCE_ID depends_on TARGET_ID
```

Relations are project-defined. Section targets must have explicit heading anchors
such as `## Retry behavior {#retry-behavior}`. Use `--dry-run` to preview mutations.

Evidence is separate from graph relationships:

```sh
kw source add NODE_ID file docs/design.md --locator 'Retry behavior'
kw source add NODE_ID url https://example.com/spec --title 'Supporting specification'
kw source remove NODE_ID file docs/design.md --locator 'Retry behavior'
```

Source commands do not fetch or import cited content. Inspect citations through
`read` or the document itself.

## Maintain the collection

```sh
kw doctor
kw fix
kw fix --safe
```

Doctor reports broken references, malformed fields, undeclared vocabulary, and
optional schema findings. Resolve vocabulary mismatches case by case by editing
the files. `fix` previews; `--safe` writes only missing IDs and scalar-dimension
repairs. It does not infer meaning or repair ambiguous links.

Edit bodies and ordinary metadata directly, move files with the filesystem, and
use Git for history. Keep IDs stable. `kw id` supplies a new UUID when you need one.

For machine-readable results, use `--json`. Exit 1 means doctor findings; exit 2
means a command or argument error. See the [API reference](/knowledge-graph/reference/cli/)
for exact defaults, output shapes, and migration notes.
