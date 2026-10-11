---
id: coding-project-template
title: Project brief template
type: project-template
description: Reusable guide for recording a project's purpose, boundaries, and known constraints.
links:
  - relation: relates_to
    target: coding-intent-template
  - relation: relates_to
    target: coding-retro-template
---

# Project brief template

This is a writing guide, not a description of the current project. Create a
separate `project` node with a new ID and a `uses_template` link here when there
is enough source material to describe it. Keep this guide reusable.

## Purpose and boundaries {#purpose}

Describe the problem, intended users, and current scope. Distinguish what the
project does today from aspirations. Link existing concepts rather than repeat
their details.

## Constraints and choices {#constraints}

Link established constraints and decisions. Record where their reasoning came
from and what remains unknown. Do not infer business intent solely from code.

## Sources and open questions {#sources}

Name supporting documentation, commits, or discussions in the body. Use `files`
only for real project-relative file paths; URLs are ordinary Markdown references.
Create question nodes for gaps worth investigating, not speculative answers.
