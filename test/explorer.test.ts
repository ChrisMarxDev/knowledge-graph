import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { init, project, create } from "../src/core.js";
import {
  explorerSnapshot,
  readReferencedFile,
  createExplorerReader,
} from "../src/explorer.js";
import { startExplorer } from "../src/server.js";
function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-explorer-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  init(root);
  return project(root);
}

test("graph preserves multi-value dimensions and surfaces unresolved links without losing usable nodes", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    dimensions: { module: ["web", "server"] },
    links: [
      { relation: "uses", target: "b#good" },
      { relation: "uses", target: "b#absent" },
      { relation: "uses", target: "missing" },
      { relation: "uses", target: "dup" },
    ],
  });
  create(p, "knowledge/nodes/b.md", { id: "b", title: "B" });
  writeFileSync(
    join(p.root, "knowledge/nodes/b.md"),
    "---\nid: b\ntitle: B\n---\n## Good {#good}\n\nHello.\n",
  );
  create(p, "knowledge/nodes/c.md", { id: "dup" });
  create(p, "knowledge/nodes/d.md", { id: "dup" });
  writeFileSync(
    join(p.root, "knowledge/nodes/bad.md"),
    "---\nnot: [valid\n---\n",
  );
  const g = explorerSnapshot(p);
  assert.equal(g.nodes.length, 4);
  assert.deepEqual(g.nodes[0].dimensions.module, ["web", "server"]);
  assert.deepEqual(
    g.edges.map((e) => e.status),
    ["resolved", "missing-section", "missing", "ambiguous"],
  );
  assert.equal(g.edges[0].target, "knowledge/nodes/b.md");
  assert.ok(g.issues.some((i) => i.code === "PARSE_ERROR"));
  assert.equal(g.version, explorerSnapshot(p).version);
  writeFileSync(
    join(p.root, "knowledge/nodes/b.md"),
    "---\nid: b\ntitle: New title\n---\nChanged.",
  );
  assert.notEqual(g.version, explorerSnapshot(p).version);
});

test("referenced previews are bounded, UTF-8 safe, and reject unreferenced, binary and escaping files", (t) => {
  const p = fixture(t);
  mkdirSync(join(p.root, "src"));
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    files: ["src/large.ts", "src/binary", "src/escape", "../outside"],
  });
  const content = "a".repeat(47999) + "🌱" + "z".repeat(5000);
  writeFileSync(join(p.root, "src/large.ts"), content);
  const first = readReferencedFile(p, "src/large.ts");
  assert.equal(first.content.length, 47999);
  assert.equal(first.next, 47999);
  assert.equal(
    first.content + readReferencedFile(p, "src/large.ts", first.next!).content,
    content,
  );
  assert.throws(
    () => readReferencedFile(p, ".knowledge/config.yaml"),
    /not referenced/,
  );
  writeFileSync(join(p.root, "src/binary"), Buffer.from([0, 1, 2]));
  assert.throws(() => readReferencedFile(p, "src/binary"), /Binary/);
  symlinkSync("/etc/passwd", join(p.root, "src/escape"));
  assert.throws(() => readReferencedFile(p, "src/escape"), /project directory/);
  assert.throws(() => readReferencedFile(p, "../outside"), /project directory/);
});

test("local server supports read, ETag refresh, invalid input and a read-only same-origin boundary", async (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", { id: "a", title: "A" });
  const assets = join(p.root, "assets");
  mkdirSync(assets);
  writeFileSync(
    join(assets, "index.html"),
    "<!doctype html><title>Test</title>",
  );
  const { server, url } = await startExplorer(p.root, 0, assets);
  t.after(
    () =>
      new Promise<void>((ok) => {
        server.close(() => ok());
        server.closeAllConnections();
      }),
  );
  const first = await fetch(url + "/api/graph");
  assert.equal(first.status, 200);
  const etag = first.headers.get("etag")!;
  const graph = await first.json();
  assert.equal(graph.nodes.length, 1);
  assert.equal(
    (await fetch(url + "/api/graph", { headers: { "If-None-Match": etag } }))
      .status,
    304,
  );
  assert.equal(
    (await fetch(url + "/api/graph", { method: "POST" })).status,
    405,
  );
  assert.equal(
    (
      await fetch(url + "/api/graph", {
        headers: { Origin: "https://evil.test" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(url + "/api/node?key=knowledge/nodes/a.md&start=-1")).status,
    400,
  );
  assert.equal(
    (await fetch(url + "/api/file?path=.knowledge/config.yaml")).status,
    400,
  );
  assert.equal(
    (await fetch(url + "/api/node?key=knowledge/nodes/a.md")).status,
    200,
  );
  assert.equal((await fetch(url + "/api/not-found")).status, 404);
  assert.equal(
    await new Promise<number>((ok) => {
      const req = request(
        url + "/api/graph",
        { headers: { Host: "evil.test" } },
        (res) => {
          ok(res.statusCode!);
          res.resume();
        },
      );
      req.end();
    }),
    403,
  );
  writeFileSync(
    join(p.root, "knowledge/nodes/a.md"),
    "---\nid: a\ntitle: Updated\n---\nNew body",
  );
  const changed = await fetch(url + "/api/graph", {
    headers: { "If-None-Match": etag },
  });
  assert.equal(changed.status, 200);
  assert.equal((await changed.json()).nodes[0].title, "Updated");
});

test("1,000-node snapshot remains complete and separates cards from document bodies", (t) => {
  const p = fixture(t);
  for (let i = 0; i < 1000; i++)
    writeFileSync(
      join(p.root, `knowledge/nodes/${i}.md`),
      `---\nid: node-${i}\ntitle: Node ${i}\ntype: custom\nlinks:\n  - relation: next\n    target: node-${(i + 1) % 1000}\n---\n## Content {#content}\n\nA private document body.\n`,
    );
  const start = performance.now();
  const graph = explorerSnapshot(p);
  t.diagnostic(
    `Snapshot of 1,000 nodes and edges: ${Math.round(performance.now() - start)} ms`,
  );
  assert.equal(graph.nodes.length, 1000);
  assert.equal(graph.edges.length, 1000);
  assert.ok(graph.edges.every((e) => e.status === "resolved"));
  assert.ok(!JSON.stringify(graph).includes("A private document body."));
});

test("read cache reuses unchanged parsing and invalidates on new, edited and removed files", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", { id: "a", title: "Original" });
  const read = createExplorerReader(p.root);
  const first = read();
  assert.equal(read(), first);
  writeFileSync(
    join(p.root, "knowledge/nodes/a.md"),
    "---\nid: a\ntitle: Modified\n---\nBody",
  );
  const modified = read();
  assert.notEqual(modified, first);
  assert.equal(modified.snapshot.nodes[0].title, "Modified");
  create(p, "knowledge/nodes/b.md", { id: "b", title: "B" });
  assert.equal(read().snapshot.nodes.length, 2);
  rmSync(join(p.root, "knowledge/nodes/a.md"));
  assert.equal(read().snapshot.nodes.length, 1);
  writeFileSync(
    p.metaPath,
    "types: {}\ndimensions: {}\nrelations: {}\nextra: changed\n",
  );
  assert.equal(read().snapshot.meta.extra, "changed");
});
