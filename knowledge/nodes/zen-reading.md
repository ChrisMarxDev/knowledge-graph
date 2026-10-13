---
id: fb00b9ea-f26e-4e08-a255-cdcef3f0b2c6
title: Focused full-screen Markdown reading
type: decision
description: "Provide a Read action beside neighborhood focus to immerse in one node document without surrounding graph or navigation."
dimensions:
  feature: [product, explorer]
  component: [ui]
  status: [accepted]
links:
  - relation: part_of
    target: 70d0b2a5-3d35-4d89-a215-0c12e58c5405
files: []
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

## Proposed interaction details

Use rendered Markdown and the full application workspace as the default design
interpretation; requiring browser/OS fullscreen was not requested. Keep a clear,
minimal exit and restore the prior exploration context on return. Preserve
normal document scrolling, long-document loading, and accessible reading.
These are implementation recommendations supporting the intent, not a claim
that the mode or its controls exist today.

Exact keyboard shortcuts, metadata visibility, in-document link navigation,
and whether native browser fullscreen is optional remain open. Do not expand
this request into editing, multi-document tabs, or a separate file browser.

## Implementation status

Accepted feature intent, not implemented by this knowledge update.
