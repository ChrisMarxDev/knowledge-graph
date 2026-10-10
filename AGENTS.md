# Agent instructions

## Tool usage skill

The repository-owned skill for using this tool is
[skills/use-kw/SKILL.md](skills/use-kw/SKILL.md). Read it when working with the
`kw` CLI or changing its user-facing behavior. The skill is part of the product,
not a personal skill installation.

## Keep the skill synchronized

Every change to the public CLI/API must update the usage skill and its relevant
references in the same change. This includes commands, flags, defaults, JSON
output, exit codes, frontmatter/configuration formats, ID and link semantics,
diagnostics, repairs, storage behavior, and newly available capabilities.

- Check actual implementation and command help; do not document planned features
  as working functionality.
- Update `skills/use-kw/SKILL.md` for changes affecting normal agent use. Put
  detailed command/schema changes in its linked references. Remove obsolete
  guidance when behavior changes.
- Keep examples runnable and consistent with the current CLI. Verify affected
  examples against the demo or a temporary collection. Avoid mutating the demo
  during checks; use a temporary collection for write examples.
- Update the README where the same public behavior is described. A README update
  does not substitute for updating the skill.
- For internal changes with no observable API effect, check the skill for
  accuracy; no cosmetic edit is required.

Do not consider an API change complete while the skill describes the old API.

## Skill organization

Keep reusable skills under `skills/<skill-name>/SKILL.md`. The baseline `use-kw`
skill explains the supported primitives without imposing a project ontology or
use-case-specific knowledge workflow.

Future opinionated workflows and automatic knowledge-injection skills belong in
separate skill folders. Add them when implemented and requested; do not create
placeholder skills, automatic hooks, or injection behavior in the baseline
skill. Later skills should reference the baseline tool contract rather than
maintain competing copies of it.
