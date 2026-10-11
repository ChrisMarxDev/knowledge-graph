import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { stringify } from "yaml";

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
  return { root, run };
}
test("CLI authoring, queries, sections, repair and history work end to end", (t) => {
  const { root, run } = fixture(t);
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
  run(["link", a.id, "depends_on", b.id]);
  assert.equal(
    run(["related", b.id, "--direction", "incoming"]).nodes[0].id,
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
  assert.equal(run(["meta", "sync"]).applied, false);
  run(["doctor"], 1);
  run(["meta", "sync", "--apply"]);
  assert.equal(run(["doctor"]).errors, 0);
  run(["set", a.id, "dimensions.module", '"web"']);
  const before = readFileSync(join(root, "knowledge/nodes/a.md"), "utf8");
  run(["fix", "--dry-run"]);
  assert.equal(
    readFileSync(join(root, "knowledge/nodes/a.md"), "utf8"),
    before,
  );
  run(["fix", "--safe"]);
  run(["doctor"]);
  run(["rename", b.id, "knowledge/nodes/payment-service.md"]);
  assert.equal(
    run(["related", a.id]).nodes[0].path,
    "knowledge/nodes/payment-service.md",
  );
  run(["unlink", a.id, "depends_on", b.id]);
  assert.equal(run(["related", a.id]).nodes.length, 0);
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", [
    "-C",
    root,
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-qm",
    "Knowledge snapshot",
  ]);
  assert.equal(run(["history", a.id]).commits[0].subject, "Knowledge snapshot");
  assert.equal(
    existsSync(join(root, ".knowledge/cache")),
    false,
    "primitive operations must not create QMD state",
  );
});
test("CLI ID assignment, section read pagination and explicit scope budgets", (t) => {
  const { root, run } = fixture(t);
  const path = join(root, "knowledge/nodes/a.md");
  writeFileSync(
    path,
    "---\ntitle: A\n---\n\n## Retry {#retry}\nOne\nTwo\n## End\nEnd\n",
  );
  run(["id", "assign", "knowledge/nodes/a.md"]);
  const id = run(["query"]).results[0].id;
  assert.equal(run(["id", "assign", "knowledge/nodes/a.md"], 2).ok, false);
  const read = run(["read", id, "--section", "retry", "--lines", "2"]);
  assert.ok(!read.content.includes("End"));
  assert.equal(read.nextLine, 3);
  writeFileSync(
    join(root, ".knowledge/config.yaml"),
    stringify({
      version: 1,
      roots: ["knowledge/nodes"],
      meta: "knowledge/meta.yaml",
      guidance: [{ files: ["src/**"], nodes: [id] }],
    }),
  );
  const context = run(["context", "--file", "src/foo.ts", "--max-bytes", "2"]);
  assert.equal(context.budgetConflict, true);
  assert.equal(context.omitted[0].id, id);
  assert.equal(
    run(["context", "--file", "src/foo.ts"]).results[0].required,
    true,
  );
});
test("real QMD SDK keyword search maps stable IDs, refreshes edits and removes deleted files", (t) => {
  const { root, run } = fixture(t);
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
  run(["set", a.id, "description", '"Exponential retry backoff"']);
  assert.equal(run(["search", "idempotent"]).results.length, 0);
  assert.equal(run(["search", "backoff"]).results[0].id, a.id);
  rmSync(join(root, "knowledge/nodes/refunds.md"));
  assert.equal(run(["search", "backoff"]).results.length, 0);
});
test("QMD results stay inside configured roots after roots are removed or reordered", (t) => {
  const { root, run } = fixture(t);
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

test("CLI templates and schema analysis remain optional and never block node editing", (t) => {
  const { root, run } = fixture(t);
  assert.equal(run(["template", "list"]).templates[0].name, "coding");
  assert.equal(run(["template", "show", "coding"]).nodes.length, 3);
  assert.equal(
    run(["template", "apply", "coding", "--apply", "--dry-run"]).applied,
    false,
  );
  assert.equal(run(["query"]).total, 0);
  assert.equal(run(["template", "apply", "coding", "--apply"]).applied, true);
  run(["doctor"]);
  const a = run([
    "create",
    "knowledge/nodes/a.md",
    "--title",
    "A",
    "--type",
    "concept",
  ]);
  const b = run([
    "create",
    "knowledge/nodes/b.md",
    "--title",
    "B",
    "--type",
    "dismissed-concept",
  ]);
  run(["link", a.id, "depends_on", b.id]);
  const diagnosis = run(["doctor"], 1);
  assert.equal(diagnosis.ok, true);
  assert.equal(diagnosis.errors, 0);
  assert.ok(
    diagnosis.issues.some((i: any) => i.code === "SCHEMA_FORBIDDEN_LINK"),
  );
  const before = readFileSync(join(root, "knowledge/nodes/a.md"), "utf8");
  run(["fix", "--safe"]);
  assert.equal(
    readFileSync(join(root, "knowledge/nodes/a.md"), "utf8"),
    before,
  );
  run(["set", a.id, "description", '"Known concept"']);
  run(["set", b.id, "description", '"Rejected concept"']);
  run(["set", b.id, "dimensions.evidence", '["confirmed"]']);
  run(["unlink", a.id, "depends_on", b.id]);
  run(["doctor"]);
  writeFileSync(join(root, "skills/retro/SKILL.md"), "Custom skill\n");
  const conflict = run(["template", "apply", "coding", "--apply"], 1);
  assert.equal(conflict.ok, true);
  assert.equal(conflict.applied, false);
  assert.equal(conflict.conflicts.length, 1);
});

test("source commands preserve body, update exact citations, and supply file-scoped context", (t) => {
  const { root, run } = fixture(t);
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
  assert.equal(run(["source", "list", node.id]).sources.length, 2);
  const read = run(["read", node.id, "--detail", "overview"]);
  assert.equal(read.node.sources[0].title, "Design");
  assert.equal(read.node.sources[0].note, "Explains the retry constraint");
  const context = run(["context", "--file", "design.md"]);
  assert.deepEqual(context.results[0].reasons, ["source-file"]);
  assert.equal(context.results[0].sources.length, 2);
  run(["source", "add", node.id, "url", "javascript:bad"], 2);
  run(["source", "remove", node.id, "file", "design.md"]);
  assert.equal(run(["source", "list", node.id]).sources.length, 2);
  run([
    "source",
    "remove",
    node.id,
    "file",
    "design.md",
    "--locator",
    "Retry behavior",
  ]);
  assert.equal(run(["source", "list", node.id]).sources.length, 1);
  assert.equal(run(["read", node.id]).content, "\n# Source test\n");
  run(["doctor"]);
});
