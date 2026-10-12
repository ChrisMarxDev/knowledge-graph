import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  init,
  project,
  scan,
  doctor,
  create,
  edit,
  getNode,
  matches,
  sections,
  mutablePath,
} from "../src/core.js";

function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-core-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  init(root);
  return project(root);
}
test("free vocabulary, multiple values, unknown dimensions stay queryable", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    type: "custom",
    dimensions: { module: ["web", "server"], audience: ["agent"] },
  });
  const g = scan(p),
    n = getNode(g, "a");
  assert.equal(
    matches(n, { field: "dimensions.module", op: "eq", value: "server" }),
    true,
  );
  assert.equal(
    matches(n, { field: "dimensions.unknown", op: "exists", value: false }),
    true,
  );
  assert.equal(
    matches(n, {
      op: "and",
      filters: [
        { field: "type", op: "eq", value: "custom" },
        { field: "dimensions.module", op: "in", value: ["web"] },
      ],
    }),
    true,
  );
  assert.equal(
    doctor(p, g).filter((i) => i.code.startsWith("UNDECLARED")).length,
    3,
  );
});
test("doctor catches duplicate IDs, dangling nodes, missing sections and broken files", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    links: [
      { relation: "uses", target: "missing" },
      { relation: "uses", target: "b#missing" },
    ],
    files: ["missing.ts"],
  });
  create(p, "knowledge/nodes/b.md", { id: "b", title: "B" });
  create(p, "knowledge/nodes/c.md", { id: "a", title: "C" });
  const codes = doctor(p, scan(p)).map((i) => i.code);
  for (const code of [
    "DUPLICATE_ID",
    "DANGLING_ID",
    "DANGLING_SECTION",
    "BROKEN_FILE_LINK",
  ])
    assert.ok(codes.includes(code), code);
  assert.throws(() => getNode(scan(p), "a"), /Ambiguous/);
});
test("sections respect fenced code, nested headings, and explicit section links", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    links: [{ relation: "uses", target: "b#retry" }],
  });
  create(p, "knowledge/nodes/b.md", {
    id: "b",
    title: "B",
    links: [
      { relation: "uses", target: "a" },
      { relation: "uses", target: "c" },
    ],
  });
  create(p, "knowledge/nodes/c.md", { id: "c", title: "C" });
  const path = join(p.root, "knowledge/nodes/b.md");
  writeFileSync(
    path,
    readFileSync(path, "utf8") +
      "\n## Retry {#retry}\nText\n```md\n## Fake {#fake}\n```\n### Child\nNested\n## Other\nOther\n",
  );
  const g = scan(p),
    b = getNode(g, "b");
  assert.equal(
    sections(b).some((s) => s.id === "fake"),
    false,
  );
  const s = sections(b).find((s) => s.id === "retry")!;
  assert.ok(b.body.slice(s.start, s.end).includes("Nested"));
  assert.ok(!b.body.slice(s.start, s.end).includes("Other"));
  assert.equal(
    doctor(p, g).some((i) => i.code === "DANGLING_SECTION"),
    false,
  );
});
test("metadata edits preserve body, unknown fields, comments and CRLF", (t) => {
  const p = fixture(t),
    path = join(p.root, "knowledge/nodes/a.md");
  const raw =
    '---\r\nid: a\r\n# custom comment\r\ncustom: "keep this quoting"\r\ntitle: Old\r\ndimensions:\r\n  module: [web]\r\n---\r\n\r\n# A\r\n```yaml\r\n---\r\n```\r\n';
  writeFileSync(path, raw);
  const n = getNode(scan(p), "a");
  const result = edit(n, {
    title: "New",
    links: [{ relation: "uses", target: "b" }],
  });
  const updated = getNode(scan(p), "a");
  assert.equal(updated.body, n.body);
  assert.equal(updated.data.title, "New");
  assert.equal(updated.data.links[0].target, "b");
  assert.ok(
    result.after.includes(
      '# custom comment\r\ncustom: "keep this quoting"\r\n',
    ),
  );
  assert.ok(!/(?<!\r)\n/.test(result.after));
});
test("dry run and concurrent edits never overwrite content", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", { id: "a", title: "A" });
  const n = getNode(scan(p), "a");
  edit(n, { title: "B" }, true);
  assert.equal(readFileSync(n.path, "utf8"), n.raw);
  writeFileSync(n.path, n.raw + "External edit");
  assert.throws(() => edit(n, { title: "C" }), /changed/);
  assert.ok(readFileSync(n.path, "utf8").endsWith("External edit"));
});
test("mutations reject paths outside roots and symlink escapes", (t) => {
  const p = fixture(t);
  assert.throws(() => mutablePath(p, "../escape.md"), /roots/);
  const outside = join(p.root, "outside");
  mkdirSync(outside);
  symlinkSync(outside, join(p.root, "knowledge/nodes/escape"));
  assert.throws(() => mutablePath(p, "knowledge/nodes/escape/new.md"), /roots/);
});
test("malformed YAML does not hide other readable nodes", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", { id: "a", title: "A" });
  writeFileSync(
    join(p.root, "knowledge/nodes/b.md"),
    "---\nid: b\nid: c\n---\n",
  );
  const g = scan(p);
  assert.equal(g.nodes.length, 1);
  assert.equal(g.issues[0].code, "PARSE_ERROR");
});
test("dimension names may match object prototype properties without phantom values", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    dimensions: { constructor: ["tooling"] },
  });
  const n = getNode(scan(p), "a");
  assert.equal(
    matches(n, { field: "dimensions.constructor", op: "eq", value: "tooling" }),
    true,
  );
  assert.equal(
    matches(n, { field: "dimensions.toString", op: "exists", value: true }),
    false,
  );
});
