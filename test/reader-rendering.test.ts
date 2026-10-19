import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentMarkdown } from "../ui/DocumentMarkdown";
import { readerMarkdown } from "../ui/reader-markdown";

test("reader renders the real command reference as a table with code cells", () => {
  const source = readFileSync(
    new URL("../knowledge/nodes/cli-api-surface.md", import.meta.url),
    "utf8",
  ).replace(/^---\n[\s\S]*?\n---\n/, "");
  const html = renderToStaticMarkup(
    React.createElement(DocumentMarkdown, {
      children: readerMarkdown(source, "CLI API surface"),
    }),
  );
  assert.match(html, /<table>/);
  assert.match(html, /<th>Command<\/th>/);
  assert.match(html, /<code>init<\/code>/);
  assert.match(html, /markdown-table-scroll/);
  assert.doesNotMatch(html, /<h1>CLI API surface<\/h1>/);
});

test("reader supports task lists and strikethrough without rendering raw HTML", () => {
  const html = renderToStaticMarkup(
    React.createElement(DocumentMarkdown, {
      children: "- [x] Done\n\n~~Old~~\n\n<script>alert('unsafe')</script>",
    }),
  );
  assert.match(html, /type="checkbox"/);
  assert.match(html, /<del>Old<\/del>/);
  assert.doesNotMatch(html, /<script>/);
});
