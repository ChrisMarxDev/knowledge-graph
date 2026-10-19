import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync, spawn, execFileSync } from "node:child_process";

const Database = createRequire(import.meta.resolve("@tobilu/qmd"))(
  "better-sqlite3",
);
const cli = resolve("src/cli.ts");
const tsx = import.meta.resolve("tsx");
function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-usage-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (args: string[], enabled = "1", cwd = root) =>
    spawnSync(process.execPath, ["--import", tsx, cli, ...args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, KW_USAGE: enabled },
    });
  const file = join(root, ".knowledge/cache/qmd.sqlite");
  const open = () => new Database(file);
  const read = () => {
    const db = open();
    try {
      return db
        .prepare("SELECT * FROM kw_usage_calls ORDER BY command, argv")
        .all();
    } finally {
      db.close();
    }
  };
  const setup = () => {
    assert.equal(run(["init"]).status, 0);
    mkdirSync(join(root, ".knowledge/cache"), { recursive: true });
    open().close();
  };
  return { root, run, file, read, open, setup };
}
test("usage is off by default and never creates a database", (t) => {
  const { root, run, file, setup, open } = fixture(t);
  assert.equal(run(["id"]).status, 0);
  assert.equal(existsSync(join(root, ".knowledge")), false);
  setup();
  for (const value of ["", "0", "true"])
    assert.equal(run(["id"], value).status, 0);
  const db = open();
  assert.equal(
    db
      .prepare("SELECT name FROM sqlite_master WHERE name='kw_usage_calls'")
      .get(),
    undefined,
  );
  db.close();
  rmSync(file);
  assert.equal(run(["id"]).status, 0);
  assert.equal(existsSync(file), false);
});
test("enabled CLI counts attempts once, excluding help/version, and resolves project roots", (t) => {
  const { root, run, file, read, setup } = fixture(t);
  setup();
  for (const args of [
    ["--help"],
    ["--version"],
    ["help", "read"],
    ["read", "--help"],
  ])
    assert.equal(run(args).status, 0);
  assert.equal(run(["read", "missing"]).status, 2);
  assert.equal(run(["read", "missing"]).status, 2);
  assert.equal(run(["read"]).status, 2);
  assert.equal(run(["nonsense"]).status, 2);
  assert.equal(
    read().reduce((sum: number, c: any) => sum + c.count, 0),
    4,
  );
  assert.equal(
    read().find((c: any) => c.argv === '["read","missing"]').count,
    2,
  );
  assert.match(read()[0].last_called, /^\d{4}-/);
  mkdirSync(join(root, "nested"));
  assert.equal(run(["id"], "1", join(root, "nested")).status, 0);
  assert.equal(read().find((c: any) => c.command === "id").count, 1);
  assert.equal(
    run(["--project", root, "query", "--json"], "1", tmpdir()).status,
    0,
  );
  assert.equal(read().find((c: any) => c.command === "query").count, 1);
  assert.equal(run(["fix", "--dry-run"]).status, 0);
  assert.equal(read().find((c: any) => c.command === "fix").count, 1);
  execFileSync("git", ["init", "-q", root]);
  assert.ok(execFileSync("git", ["check-ignore", file], { cwd: root }).length);
});
test("concurrent SQLite increments preserve totals", async (t) => {
  const { root, setup, read } = fixture(t);
  setup();
  await Promise.all(
    Array.from(
      { length: 6 },
      () =>
        new Promise<void>((resolve, reject) => {
          const child = spawn(process.execPath, ["--import", tsx, cli, "id"], {
            cwd: root,
            stdio: "ignore",
            env: { ...process.env, KW_USAGE: "1" },
          });
          child.on("error", reject);
          child.on("exit", (code) =>
            code === 0 ? resolve() : reject(new Error(String(code))),
          );
        }),
    ),
  );
  assert.equal(read()[0].count, 6);
});
test("locked and corrupt databases never alter command output or status", (t) => {
  const { setup, run, file, open } = fixture(t);
  setup();
  const db = open();
  db.exec("BEGIN EXCLUSIVE");
  const result = run(["id"]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.ok(JSON.parse(result.stdout).id);
  assert.equal(run(["read", "missing"]).status, 2);
  db.exec("ROLLBACK");
  db.close();
  writeFileSync(file, "not sqlite");
  assert.equal(run(["id"]).status, 0);
  assert.equal(readFileSync(file, "utf8"), "not sqlite");
});
test("QMD indexing and reopening preserve the kw table", (t) => {
  const { run, file, read } = fixture(t);
  assert.equal(run(["init"]).status, 0);
  let result = run(["index"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(file), true);
  assert.equal(run(["id"]).status, 0);
  result = run(["index"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read().find((c: any) => c.command === "id").count, 1);
  assert.equal(read().find((c: any) => c.command === "index").count, 1);
});
