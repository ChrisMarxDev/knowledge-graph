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
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync, spawn, execFileSync } from "node:child_process";
import { countCall } from "../src/usage.js";
const cli = resolve("src/cli.ts");
const tsx = import.meta.resolve("tsx");
function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-usage-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (args: string[], cwd = root) =>
    spawnSync(process.execPath, ["--import", tsx, cli, ...args], {
      cwd,
      encoding: "utf8",
    });
  const file = join(root, ".knowledge/usage/counts.json");
  return {
    root,
    run,
    file,
    read: () => JSON.parse(readFileSync(file, "utf8")),
  };
}
test("CLI counts attempts exactly once; help/version and generated help do not count", (t) => {
  const { root, run, file, read } = fixture(t);
  for (const args of [
    ["--help"],
    ["--version"],
    ["help", "read"],
    ["read", "--help"],
  ])
    assert.equal(run(args).status, 0);
  assert.equal(existsSync(file), false);
  assert.equal(run(["init"]).status, 0);
  assert.equal(run(["read", "missing"]).status, 2);
  assert.equal(run(["read", "missing"]).status, 2);
  assert.equal(run(["read"]).status, 2);
  assert.equal(run(["nonsense"]).status, 2);
  const data = read();
  assert.equal(data.total, 5);
  assert.equal(data.commands.read, 3);
  assert.equal(
    data.calls.find((c: any) => c.argv.join(" ") === "read missing").count,
    2,
  );
  assert.match(data.calls[0].lastCalled, /^\d{4}-/);
  mkdirSync(join(root, "nested"));
  assert.equal(run(["id"], join(root, "nested")).status, 0);
  assert.equal(read().commands.id, 1);
  assert.equal(run(["--project", root, "query", "--json"], tmpdir()).status, 0);
  assert.equal(read().commands.query, 1);
  execFileSync("git", ["init", "-q", root]);
  assert.equal(
    execFileSync("git", ["check-ignore", ".knowledge/usage/counts.json"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    ".knowledge/usage/counts.json",
  );
});
test("concurrent writers preserve totals and counters can be reset by deleting the file", async (t) => {
  const { root, read, file } = fixture(t);
  const children = Array.from(
    { length: 6 },
    () =>
      new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, ["--import", tsx, cli, "id"], {
          cwd: root,
          stdio: "ignore",
        });
        child.on("error", reject);
        child.on("exit", (code) =>
          code === 0 ? resolve() : reject(new Error(String(code))),
        );
      }),
  );
  await Promise.all(children);
  assert.equal(read().total, 6);
  assert.equal(read().calls[0].count, 6);
  rmSync(file);
  await countCall(root, "id", ["id"]);
  assert.equal(read().total, 1);
});
test("corrupt or unwritable counters do not alter command output or exit codes", (t) => {
  const { root, run, file } = fixture(t);
  mkdirSync(join(root, ".knowledge/usage"), { recursive: true });
  writeFileSync(file, "not json");
  const r = run(["id"]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).id);
  assert.equal(readFileSync(file, "utf8"), "not json");
  rmSync(join(root, ".knowledge/usage"), { recursive: true });
  writeFileSync(join(root, ".knowledge/usage"), "blocked");
  assert.equal(run(["id"]).status, 0);
  assert.equal(run(["read", "missing"]).status, 2);
});
