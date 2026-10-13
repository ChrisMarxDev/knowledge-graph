---
id: fb00b9ea-f26e-4e08-a255-cdcef3f0b2c6
title: Focused full-screen Markdown reading
type: decision
description: "Provide a Read action beside neighborhood focus to immerse in one node document without surrounding graph or navigation."
dimensions:
  feature: [product, explorer]
  component: [ui]
  status: [accepted, implemented]
links:
  - relation: part_of
    target: 70d0b2a5-3d35-4d89-a215-0c12e58c5405
files: [ui/main.tsx, ui/style.css]
sources:
  - kind: reference
    target: User explorer direction discussion, 2026-10-13
    note: Accepted intent and planned behavior; distinguish proposals from implementation.
---

# Focused full-screen Markdown reading

## Intent

Exploration and sustained reading are different activities. After finding useful
knowledge, the user should be able to give the document the whole workspace and
read without graph, sidebar, or unrelated controls competing for attention.
This is a reading mode, not an editor or another knowledge organization model.

## Accepted direction

Add a Read button beside the existing Show/Focus neighborhood action. It opens
the selected node's Markdown as a full-screen, document-focused Zen mode, where
that document is the only content being read. Keep neighborhood exploration as
a separate action. This mode complements the ordinary side reader and must work
with the shared selection model for Graph and List.

## Implemented interaction

Read beside neighborhood focus opens a native modal dialog filling the application
viewport, with rendered full-document Markdown. It does not request OS fullscreen.
Metadata and connections are omitted. Escape or Back to explorer closes it and
returns focus to Read while preserving graph/list context and the side reader.
The modal contains keyboard focus and makes background controls inert.

Long documents retain the existing 48,000-character body paging, with Read more
inside Zen. A side-reader section selection does not truncate the Zen document.
External links open separately; internal knowledge/file links close Zen and follow
the existing reader navigation. This is explicitly navigational, not document
editing, multi-document tabs, or a file browser. Embedded images retain the
existing textual placeholder behavior.

## Implementation status

Implemented 2026-10-13. Context is restored on closing; intentionally following an
internal link instead navigates the ordinary reader to that destination.
