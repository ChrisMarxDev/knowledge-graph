# Source references

Nodes may cite evidence separately from conceptual graph relationships:

```yaml
sources:
  - kind: url
    target: https://example.com/api#rate-limits
    title: API documentation
    note: Explains why a fixed retry delay is unsuitable.
  - kind: file
    target: docs/design.md
    locator: Retry behavior, lines 20–35
  - kind: reference
    target: Maintainer discussion about gateway retries
    locator: 2026-10-11
    note: Original explanation; no recording available.
```

Each source requires `kind` and `target`. `title`, `locator`, and `note` are
optional nonempty strings. Unknown fields are reported. Targets must be nonempty
text without control characters.

- `url`: absolute HTTP(S) URL without embedded credentials. A fragment can
  identify a section. No request is made to validate, download, or index it.
- `file`: project-relative path using forward slashes, without `..` components.
  Put page/section/line information in `locator`, not in the path. Doctor checks
  existence, regular-file status, and whether symlinks resolve inside the project.
- `reference`: free-text citation for books, conversations, or other evidence
  without a usable URL/path. It is displayed as text, not followed automatically.

`locator` is a human-readable location, not an executable selector: no automatic
page extraction, line validation, or navigation is implied. `note` explains
what the source supports. These fields make no claim about evidence quality,
truth, historical revision, or current applicability. Schemas may require a
nonempty `sources` list, but a citation alone does not establish a claim.

`links` remains node-to-node relationships; `files` remains the existing simple
file-association list. Neither field is migrated or reinterpreted. Sources do
not create graph edges, add to relation vocabulary, or trigger graph traversal.
External collections are not linked or fetched by source references.

## CLI

```sh
kw source add NODE_ID url https://example.com/api --title 'API documentation' --note 'Supports the retry constraint'
kw source add NODE_ID file docs/design.md --locator 'Retry behavior'
kw source add NODE_ID reference 'Maintainer discussion' --locator '2026-10-11'
kw --json read NODE_ID
kw source remove NODE_ID file docs/design.md --locator 'Retry behavior'
```

Add/remove support `--dry-run`. `add` identifies a citation by exact
`kind`, `target`, and `locator` (including absence of a locator). Re-adding that
identity updates supplied title/note fields, preserving omitted fields and other
sources. Different locators create separate citations. No URL or path
normalization/deduplication is performed. `remove` deletes all exact matches;
omitting `--locator` matches only references with no locator, not every location
in that target. Removing an absent match is harmless.

Malformed existing sources must be repaired before adding; use direct Markdown
editing for replacement or to clear optional fields.
Remove can delete malformed entries that still match its identity fields.
File targets need not exist at authoring time; doctor reports missing files.
Neither add nor doctor fetches a URL. Metadata edits preserve the Markdown body.

Inspect complete authored sources in read's `frontmatter.sources`. Add/remove
return the standard edit result (`path`, `before`, `after`, `applied`). Invalid
arguments produce exit 2; doctor findings produce exit 1.

Node cards in query/map/read and the explorer graph API include a
`sources` array (empty by default). Invalid source entries are omitted from
these views but remain in authored files and are diagnosed by doctor:

| Code | Severity | Meaning |
|---|---|---|
| `INVALID_SOURCES` | error | Sources is not a list. |
| `INVALID_SOURCE` | error | Invalid kind, target, optional field, or unknown key. |
| `BROKEN_SOURCE_FILE` | warning | Missing, non-regular, or unreadable local source file. |
| `UNSAFE_SOURCE_FILE` | error | File resolves outside the project. |

## Query and explorer

`query --file docs/design.md` finds nodes citing that file through either
files or file-kind sources. It matches associations, not source contents.
Use --fields to return compact projections when appropriate.

The explorer reader shows sources, labels, locators, and notes. URL references
open in a separate tab. File references use the existing bounded text preview;
backlinks include nodes citing the file through either `files` or `sources`.
Binary/PDF files can be cited, but the explorer does not render their contents.
Plain references are displayed as text. The existing `/api/file` project boundary,
UTF-8 validation, and pagination also apply to files authorized through sources.

Source content is not fetched, embedded, imported, or monitored. When agents copy knowledge, local source paths resolve against the destination
project; validate them after copying.
