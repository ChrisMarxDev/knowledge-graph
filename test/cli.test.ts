import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parse, stringify } from "yaml";

const cli = resolve("src/cli.ts");
function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-cli-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function run(args: string[], status = 0) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cli, "--project", root, "--json", ...args],
      { encoding: "utf8", timeout: 60000 },
    );
    assert.equal(result.status, status, result.stderr + result.stdout);
    assert.doesNotThrow(() => JSON.parse(result.stdout), result.stdout);
    return JSON.parse(result.stdout);
  }
  run(["init"]);
  function patch(file: string, changes: Record<string, unknown>) {
    const path = join(root, file);
    const raw = readFileSync(path, "utf8");
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw)!;
    writeFileSync(
      path,
      `---\n${stringify({ ...parse(match[1]), ...changes })}---\n${match[2]}`,
    );
  }
  return { root, run, patch };
}
test("CLI authoring, queries, links and repair work end to end", (t) => {
  const { root, run, patch } = fixture(t);
  const a = run([
    "create",
    "knowledge/nodes/a.md",
    "--title",
    "Refunds",
    "--type",
    "concept",
    "--dimension",
    "module=web",
    "--dimension",
    "module=server",
  ]);
  const b = run(["create", "knowledge/nodes/b.md", "--title", "Payments"]);
  run(["link", "add", a.id, "depends_on", b.id]);
  assert.equal(
    run(["link", "show", b.id, "--direction", "incoming"]).results[0].node.id,
    a.id,
  );
  assert.equal(
    run(["query", "--dimension", "module=server"]).results[0].id,
    a.id,
  );
  assert.equal(
    run([
      "query",
      "--filter",
      JSON.stringify({
        op: "or",
        filters: [
          { field: "title", op: "eq", value: "Payments" },
          { field: "type", op: "eq", value: "concept" },
        ],
      }),
    ]).total,
    2,
  );
  run(["doctor"], 1);
  writeFileSync(
    join(root, "knowledge/meta.yaml"),
    stringify({
      types: { concept: {} },
      dimensions: { module: {} },
      relations: { depends_on: {} },
    }),
  );
  assert.equal(run(["doctor"]).errors, 0);
  patch("knowledge/nodes/a.md", { dimensions: { module: "web" } });
  const before = readFileSync(join(root, "knowledge/nodes/a.md"), "utf8");
  run(["fix", "--dry-run"]);
  assert.equal(
    readFileSync(join(root, "knowledge/nodes/a.md"), "utf8"),
    before,
  );
  run(["fix", "--safe"]);
  run(["doctor"]);
  renameSync(
    join(root, "knowledge/nodes/b.md"),
    join(root, "knowledge/nodes/payment-service.md"),
  );
  assert.equal(
    run(["link", "show", a.id]).results[0].node.path,
    "knowledge/nodes/payment-service.md",
  );
  run(["link", "remove", a.id, "depends_on", b.id]);
  assert.equal(run(["link", "show", a.id]).results.length, 0);
  assert.equal(
    existsSync(join(root, ".knowledge/cache")),
    false,
    "primitive operations must not create QMD state",
  );
});
test("IDs, complete frontmatter, bounded section reads, and scaffolds", (t) => {
  const { root, run, patch } = fixture(t);
  const id = run(["id"]).id;
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  const created = run(["create", "knowledge/nodes/a.md", "--title", "A"]);
  const path = join(root, created.path);
  const scaffold = run(["read", created.id]).frontmatter;
  assert.deepEqual(Object.keys(scaffold), [
    "id",
    "title",
    "type",
    "description",
    "dimensions",
    "links",
    "files",
    "sources",
  ]);
  assert.equal(scaffold.type, "");
  patch(created.path, {
    custom: { nested: ["retained"] },
    links: [{ relation: "uses", target: "missing" }],
  });
  writeFileSync(
    path,
    readFileSync(path, "utf8") + "\n## Retry {#retry}\nOne\nTwo\n## End\nEnd\n",
  );
  const read = run(["read", created.id, "--section", "retry", "--lines", "2"]);
  assert.ok(!read.content.includes("End"));
  assert.equal(read.nextLine, 3);
  assert.deepEqual(read.frontmatter.custom, { nested: ["retained"] });
  assert.equal(read.frontmatter.links[0].target, "missing");
  assert.deepEqual(
    run(["read", created.id, "--detail", "overview"]).frontmatter,
    read.frontmatter,
  );
  const plain = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      cli,
      "--project",
      root,
      "read",
      created.id,
      "--max-bytes",
      "0",
    ],
    { encoding: "utf8" },
  );
  assert.equal(plain.status, 0, plain.stderr);
  assert.match(plain.stdout, /^---\nid:/);
  assert.match(plain.stdout, /custom:/);
  assert.ok(!plain.stdout.includes("## Retry"));
  // Existing documents can receive a generated ID through ordinary file editing or fix.
  writeFileSync(
    join(root, "knowledge/nodes/legacy.md"),
    "---\ntitle: Legacy\n---\nBody",
  );
  run(["fix", "--safe"]);
  assert.ok(run(["read", "knowledge/nodes/legacy.md"]).frontmatter.id);
});
test("real QMD SDK keyword search maps stable IDs, refreshes edits and removes deleted files", (t) => {
  const { root, run, patch } = fixture(t);
  const a = run([
    "create",
    "knowledge/nodes/refunds.md",
    "--title",
    "Refund retries",
    "--description",
    "Idempotent refunds prevent duplicate transactions",
  ]);
  const search = run(["search", "idempotent"]);
  assert.equal(search.results.length, 1);
  assert.equal(search.results[0].id, a.id);
  assert.equal(search.results[0].path, "knowledge/nodes/refunds.md");
  assert.ok(existsSync(join(root, ".knowledge/cache/qmd.sqlite")));
  patch("knowledge/nodes/refunds.md", {
    description: "Exponential retry backoff",
  });
  assert.equal(run(["search", "idempotent"]).results.length, 0);
  assert.equal(run(["search", "backoff"]).results[0].id, a.id);
  rmSync(join(root, "knowledge/nodes/refunds.md"));
  assert.equal(run(["search", "backoff"]).results.length, 0);
});
test("QMD results stay inside configured roots after roots are removed or reordered", (t) => {
  const { root, run, patch } = fixture(t);
  mkdirSync(join(root, "other"));
  writeFileSync(
    join(root, "other/private.md"),
    "---\nid: private\ntitle: Private\n---\nConfidential marmalade\n",
  );
  const configPath = join(root, ".knowledge/config.yaml");
  writeFileSync(
    configPath,
    stringify({
      version: 1,
      roots: ["other", "knowledge/nodes"],
      meta: "knowledge/meta.yaml",
    }),
  );
  run([
    "create",
    "knowledge/nodes/Public Note.md",
    "--title",
    "Public",
    "--description",
    "Public marmalade",
  ]);
  assert.equal(run(["search", "marmalade"]).results.length, 2);
  writeFileSync(
    configPath,
    stringify({
      version: 1,
      roots: ["knowledge/nodes"],
      meta: "knowledge/meta.yaml",
    }),
  );
  const results = run(["search", "marmalade"]).results;
  assert.equal(results.length, 1);
  assert.equal(results[0].path, "knowledge/nodes/Public Note.md");
  assert.ok(results[0].id);
});
test("CLI errors are machine readable and limit zero cannot create an endless page", (t) => {
  const { run } = fixture(t);
  assert.equal(run(["query", "--limit", "0"], 2).ok, false);
  assert.equal(run(["query", "--filter", '{"op":"guess"}'], 2).ok, false);
});

test("source commands preserve body, update exact citations, and support file-scoped queries", (t) => {
  const { root, run, patch } = fixture(t);
  const node = run([
    "create",
    "knowledge/nodes/source-test.md",
    "--title",
    "Source test",
  ]);
  writeFileSync(join(root, "design.md"), "# Design\nSupporting evidence.\n");
  const path = join(root, "knowledge/nodes/source-test.md");
  const before = readFileSync(path, "utf8");
  run([
    "source",
    "add",
    node.id,
    "file",
    "design.md",
    "--locator",
    "Retry behavior",
    "--dry-run",
  ]);
  assert.equal(readFileSync(path, "utf8"), before);
  run([
    "source",
    "add",
    node.id,
    "file",
    "design.md",
    "--locator",
    "Retry behavior",
    "--title",
    "Design",
  ]);
  run([
    "source",
    "add",
    node.id,
    "file",
    "design.md",
    "--locator",
    "Retry behavior",
    "--note",
    "Explains the retry constraint",
  ]);
  run([
    "source",
    "add",
    node.id,
    "url",
    "https://example.com/spec",
    "--title",
    "Spec",
  ]);
  assert.equal(run(["read", node.id]).frontmatter.sources.length, 2);
  const read = run(["read", node.id, "--detail", "overview"]);
  assert.equal(read.node.sources[0].title, "Design");
  assert.equal(read.node.sources[0].note, "Explains the retry constraint");
  const query = run(["query", "--file", "design.md"]);
  assert.equal(query.results[0].id, node.id);
  assert.equal(query.results[0].sources.length, 2);
  run(["source", "add", node.id, "url", "javascript:bad"], 2);
  run(["source", "remove", node.id, "file", "design.md"]);
  assert.equal(run(["read", node.id]).frontmatter.sources.length, 2);
  run([
    "source",
    "remove",
    node.id,
    "file",
    "design.md",
    "--locator",
    "Retry behavior",
  ]);
  assert.equal(run(["read", node.id]).frontmatter.sources.length, 1);
  assert.equal(run(["read", node.id]).content, "\n# Source test\n");
  run(["doctor"]);
});

test("named views are discoverable and additional query filters narrow their results", (t) => {
  const { root, run, patch } = fixture(t);
  const a = run([
    "create",
    "knowledge/nodes/a.md",
    "--title",
    "A",
    "--type",
    "rule",
  ]);
  run(["create", "knowledge/nodes/b.md", "--title", "B", "--type", "concept"]);
  const config = join(root, ".knowledge/config.yaml");
  writeFileSync(
    config,
    readFileSync(config, "utf8") +
      "\nviews:\n  rules:\n    filter: { field: type, op: eq, value: rule }\n",
  );
  assert.equal(run(["map"]).views.total, 1);
  assert.equal(run(["query", "--view", "rules"]).results[0].id, a.id);
  assert.equal(run(["query", "--view", "rules", "--type", "concept"]).total, 0);
  run(["query", "--view", "absent"], 2);
});

test("query intersects keyword, view, metadata, and file filters before paging and projection", (t) => {
  const { root, run, patch } = fixture(t);
  const a = run([
    "create",
    "knowledge/nodes/a.md",
    "--title",
    "Alpha",
    "--type",
    "concept",
    "--description",
    "Marmalade",
  ]);
  const b = run([
    "create",
    "knowledge/nodes/b.md",
    "--title",
    "Beta",
    "--type",
    "rule",
    "--description",
    "Marmalade",
  ]);
  const c = run([
    "create",
    "knowledge/nodes/c.md",
    "--title",
    "Gamma",
    "--type",
    "rule",
    "--description",
    "Marmalade",
  ]);
  patch(a.path, { files: ["src/a.ts"] });
  patch(b.path, { sources: [{ kind: "file", target: "src/b.ts" }] });
  patch(c.path, { files: ["src/b.ts"] });
  // Invalid frontmatter must not consume the candidate budget ahead of valid nodes.
  for (let i = 0; i < 5; i++)
    writeFileSync(
      join(root, `knowledge/nodes/invalid-${i}.md`),
      "# Marmalade\nMarmalade\n",
    );
  const config = join(root, ".knowledge/config.yaml");
  writeFileSync(
    config,
    readFileSync(config, "utf8") +
      "\nviews:\n  rules:\n    filter: {field: type, op: eq, value: rule}\n",
  );
  const args = [
    "query",
    "marmalade",
    "--view",
    "rules",
    "--file",
    "./src/b.ts",
    "--type",
    "rule",
    "--fields",
    "title,description",
    "--limit",
    "1",
  ];
  const first = run(args);
  assert.equal(first.total, 2);
  assert.equal(first.nextOffset, 1);
  assert.deepEqual(Object.keys(first.results[0]), ["title", "description"]);
  const second = run([...args, "--offset", "1"]);
  assert.equal(second.nextOffset, null);
  assert.notEqual(first.results[0].title, second.results[0].title);
  assert.deepEqual(
    run(["query", "--file", "src/a.ts", "--fields", "title"]).results,
    [{ title: "Alpha" }],
  );
  assert.equal(
    run(["query", "--file", "src/a.ts", "--file", "src/b.ts"]).total,
    3,
  );
  assert.equal(run(["query", "--file", "src/no.ts"]).total, 0);
  assert.equal(
    run(["query", "marmalade", "--view", "rules", "--type", "concept"]).total,
    0,
  );
  run(["query", "--fields", "unknown"], 2);
  run(["query", "--fields", ""], 2);
});

test("link show reports directions, section targets, dangling links, self links and pagination", (t) => {
  const { root, run, patch } = fixture(t);
  const a = run(["create", "knowledge/nodes/a.md", "--title", "A"]);
  const b = run(["create", "knowledge/nodes/b.md", "--title", "B"]);
  writeFileSync(
    join(root, b.path),
    readFileSync(join(root, b.path), "utf8") +
      "\n## Section {#section}\nBody\n",
  );
  run(["link", "add", a.id, "uses", b.id + "#section"]);
  run(["link", "add", a.id, "uses", b.id + "#section"]);
  assert.equal(run(["link", "show", a.id]).total, 1);
  const incoming = run(["link", "show", b.id]);
  assert.equal(incoming.results[0].direction, "incoming");
  assert.equal(incoming.results[0].source, a.id);
  assert.equal(incoming.results[0].target, b.id + "#section");
  assert.equal(incoming.results[0].status, "resolved");
  patch(a.path, {
    links: [
      { relation: "uses", target: b.id + "#absent" },
      { relation: "uses", target: "missing" },
      { relation: "self", target: a.id },
    ],
  });
  const result = run(["link", "show", a.id, "--direction", "outgoing"]);
  assert.deepEqual(
    result.results.map((r: any) => r.status),
    ["missing-section", "missing-node", "resolved"],
  );
  assert.equal(result.results[1].node, null);
  const page = run(["link", "show", a.id, "--limit", "1"]);
  assert.equal(page.total, 4); // self link is both incoming and outgoing
  assert.equal(page.nextOffset, 1);
  assert.equal(run(["link", "show", a.id, "--relation", "self"]).total, 2);
  run(["link", "remove", a.id, "uses", "missing"]);
  assert.equal(run(["link", "show", a.id, "--direction", "outgoing"]).total, 2);
  run(["link", "show", a.id, "--direction", "sideways"], 2);
  writeFileSync(
    join(root, "knowledge/nodes/duplicate.md"),
    `---\nid: ${b.id}\ntitle: Duplicate\n---\n`,
  );
  assert.equal(run(["link", "show", a.id]).results[0].status, "ambiguous-node");
});

test("removed CLI wrappers fail and doctor flags retired guidance configuration", (t) => {
  const { root, run } = fixture(t);
  for (const args of [
    ["template", "list"],
    ["related", "x"],
    ["context"],
    ["views", "list"],
    ["history", "x"],
    ["id", "generate"],
    ["id", "assign", "x"],
    ["set", "x", "title", "x"],
    ["rename", "x", "y"],
    ["unlink", "x", "r", "y"],
    ["source", "list", "x"],
    ["meta", "show"],
    ["meta", "sync"],
  ])
    assert.equal(run(args, 2).ok, false);
  const config = join(root, ".knowledge/config.yaml");
  assert.ok(!readFileSync(config, "utf8").includes("guidance"));
  writeFileSync(
    config,
    readFileSync(config, "utf8") +
      "guidance: [{files: ['src/**'], nodes: [old]}]\n",
  );
  assert.ok(
    run(["doctor"], 1).issues.some((i: any) => i.code === "OBSOLETE_GUIDANCE"),
  );
});

test("query alternatives and explanations work with real QMD, filters, projections and paging", (t) => {
  const { root, run, patch } = fixture(t);
  for (const [id, body, type] of [
    ["both", "Idempotency and retry protect payment processing.", "rule"],
    ["first", "Idempotency keys protect payment processing.", "rule"],
    ["second", "Retry handling protects payment processing.", "rule"],
    ["excluded", "Idempotency idempotency retry retry.", "concept"],
  ]) {
    run(["create", `knowledge/nodes/${id}.md`, "--title", id, "--type", type]);
    patch(`knowledge/nodes/${id}.md`, { id, files: ["docs/evidence.md"] });
    const path = join(root, `knowledge/nodes/${id}.md`);
    writeFileSync(path, readFileSync(path, "utf8") + body + "\n");
  }
  const meta = run([
    "query",
    "--type",
    "rule",
    "--fields",
    "title",
    "--explain",
  ]);
  assert.equal(existsSync(join(root, ".knowledge/cache/qmd.sqlite")), false);
  assert.deepEqual(meta.retrieval, {
    mode: "keyword",
    queries: [],
    fusion: "none",
  });
  assert.deepEqual(meta.explanations[0], {
    resultIndex: 0,
    score: null,
    matches: [],
    snippet: null,
  });
  for (const args of [
    ["--also-text", "retry"],
    ["idempotency", "--also-text", " "],
    ["idempotency", "--also-text", "x".repeat(501)],
  ]) {
    assert.equal(run(["query", ...args], 2).ok, false);
  }
  assert.equal(existsSync(join(root, ".knowledge/cache/qmd.sqlite")), false);
  const args = [
    "query",
    "idempotency",
    "--also-text",
    "retry",
    "--type",
    "rule",
    "--file",
    "docs/evidence.md",
    "--fields",
    "title",
    "--explain",
  ];
  const all = run(args);
  assert.equal(all.total, 3);
  assert.equal(all.results[0].title, "both");
  assert.deepEqual(all.retrieval, {
    mode: "keyword",
    queries: ["idempotency", "retry"],
    fusion: "rrf",
    rrfK: 60,
  });
  assert.deepEqual(
    all.explanations[0].matches.map((m: any) => m.queryIndex),
    [0, 1],
  );
  assert.ok(all.explanations[0].snippet.text.length <= 500);
  assert.match(all.explanations[0].snippet.text, /idempotency|retry/i);
  assert.deepEqual(Object.keys(all.results[0]), ["title"]);
  const second = run([...args, "--limit", "1", "--offset", "1"]);
  assert.deepEqual(second.results, [all.results[1]]);
  assert.equal(second.nextOffset, 2);
  assert.deepEqual(second.explanations, [
    { ...all.explanations[1], resultIndex: 0 },
  ]);
  assert.deepEqual(
    run([...args, "--also-text", " retry ", "--also-text", "idempotency"]),
    all,
  );
  const ordinary = run(["query", "idempotency", "--type", "rule"]);
  const explain = run(["query", "idempotency", "--type", "rule", "--explain"]);
  assert.deepEqual(explain.results, ordinary.results);
  assert.equal(ordinary.retrieval, undefined);
  assert.equal(ordinary.explanations, undefined);
  assert.equal(explain.retrieval.fusion, "none");
  const empty = run([
    "query",
    "zzzxmissingword",
    "--also-text",
    "zzzymissingword",
    "--explain",
  ]);
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.explanations, []);
  rmSync(join(root, "knowledge/nodes/second.md"));
  assert.equal(run(args).total, 2);
});
