import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init, project, scan, create, doctor, card } from "../src/core.js";
import { sourceError } from "../src/sources.js";
import { explorerSnapshot, readReferencedFile } from "../src/explorer.js";
function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-sources-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  init(root);
  return project(root);
}
test("source references appear in cards and explorer without becoming graph edges", (t) => {
  const p = fixture(t);
  writeFileSync(join(p.root, "design.md"), "# Design\nA real source.\n");
  const refs = [
    {
      kind: "url",
      target: "https://example.com/spec#retries",
      title: "Specification",
      note: "Explains retries",
    },
    { kind: "file", target: "design.md", locator: "Retry behavior" },
    {
      kind: "reference",
      target: "Maintainer discussion",
      locator: "2026-10-11",
    },
  ];
  create(p, "knowledge/nodes/a.md", { id: "a", title: "A", sources: refs });
  const g = scan(p);
  assert.deepEqual(doctor(p, g), []);
  assert.deepEqual(card(g.nodes[0]).sources, refs);
  assert.deepEqual(explorerSnapshot(p, g).nodes[0].sources, refs);
  assert.deepEqual(explorerSnapshot(p, g).edges, []);
  const preview = readReferencedFile(p, "design.md", 0, g);
  assert.ok(preview.content.includes("A real source"));
  assert.deepEqual(preview.backlinks, ["knowledge/nodes/a.md"]);
});
test("doctor reports malformed and missing sources without hiding readable content", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    sources: [
      { kind: "url", target: "javascript:alert(1)" },
      { kind: "file", target: "../outside.md" },
      { kind: "file", target: "missing.md" },
      { kind: "reference", target: "Book", extra: "unsupported" },
      { kind: "url", target: "https://example.com" },
    ],
  });
  create(p, "knowledge/nodes/b.md", {
    id: "b",
    title: "B",
    sources: "invalid",
  });
  const g = scan(p),
    findings = doctor(p, g);
  assert.equal(findings.filter((i) => i.code === "INVALID_SOURCE").length, 3);
  assert.equal(findings.filter((i) => i.code === "INVALID_SOURCES").length, 1);
  assert.equal(
    findings.filter((i) => i.code === "BROKEN_SOURCE_FILE").length,
    1,
  );
  assert.equal(card(g.nodes[0]).sources.length, 2);
  for (const target of [
    "file:///etc/passwd",
    "data:text/html,foo",
    "https://user:secret@example.com",
    "//example.com",
  ])
    assert.ok(sourceError({ kind: "url", target }));
});
test("source file previews preserve the project boundary and reject binary files", (t) => {
  const p = fixture(t);
  const outside = mkdtempSync(join(tmpdir(), "kw-source-outside-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, "secret.md"), "External");
  symlinkSync(join(outside, "secret.md"), join(p.root, "escape.md"));
  writeFileSync(join(p.root, "binary.pdf"), Buffer.from([0, 1, 2]));
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    sources: [
      { kind: "file", target: "escape.md" },
      { kind: "file", target: "binary.pdf" },
    ],
  });
  assert.ok(doctor(p, scan(p)).some((i) => i.code === "UNSAFE_SOURCE_FILE"));
  assert.throws(() => readReferencedFile(p, "escape.md"), /project directory/);
  assert.throws(() => readReferencedFile(p, "binary.pdf"), /Binary/);
  assert.throws(
    () => readReferencedFile(p, "knowledge/meta.yaml"),
    /not referenced/,
  );
});
