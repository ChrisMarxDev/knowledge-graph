import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { init, project, scan } from "../src/core.js";
import { review } from "../src/review.js";

function fixture(t: any, nested = false) {
  const repo = mkdtempSync(join(tmpdir(), "kw-review-"));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const root = nested ? join(repo, "app") : repo;
  mkdirSync(root, { recursive: true });
  const git = (...args: string[]) => {
    const result = spawnSync(
      "git",
      [
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "commit.gpgsign=false",
        "-C",
        repo,
        ...args,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-b", "main");
  git("config", "user.name", "Review Test");
  git("config", "user.email", "review@example.invalid");
  init(root);
  const write = (path: string, content = "initial\n") => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const node = (
    path: string,
    id: string,
    files: string[],
    sourcePaths: string[] = [],
  ) =>
    write(
      path,
      `---\n${stringify({ id, title: id, type: "concept", files, sources: sourcePaths.map((target) => ({ kind: "file", target })) })}---\n# ${id}\n`,
    );
  write(
    "knowledge/meta.yaml",
    "types:\n  concept: {}\ndimensions: {}\nrelations: {}\n",
  );
  write("src/payments.ts");
  write("docs/spec.md", "Specification content\n");
  node(
    "knowledge/nodes/payments.md",
    "payments",
    ["src/payments.ts"],
    ["docs/spec.md"],
  );
  const commit = () => {
    git("add", ".");
    git("commit", "-m", "fixture");
  };
  const run = (opts = {}) => {
    const p = project(root);
    return review(p, scan(p), opts);
  };
  return { repo, root, git, write, node, commit, run };
}

test("review maps local associations and concept edits without writing state", (t) => {
  const f = fixture(t);
  f.commit();
  f.write("src/payments.ts", "changed\n");
  f.write("docs/spec.md", "changed\n");
  f.write("extra.txt");
  f.write(".gitignore", "ignored.txt\n");
  f.write("ignored.txt");
  const path = join(f.root, "knowledge/nodes/payments.md");
  writeFileSync(path, readFileSync(path, "utf8") + "Updated concept\n");
  const before = f.git("status", "--porcelain=v1");
  const index = readFileSync(join(f.repo, ".git/index"));
  const result = f.run();
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].knowledgeChanged, true);
  assert.deepEqual(result.results[0].changedFiles, [
    { path: "docs/spec.md", status: "modified" },
    { path: "src/payments.ts", status: "modified" },
  ]);
  assert.ok(
    result.unmappedFiles.some(
      (f) => f.path === "extra.txt" && f.status === "untracked",
    ),
  );
  assert.ok(!result.unmappedFiles.some((f) => f.path === "ignored.txt"));
  assert.equal(f.git("status", "--porcelain=v1"), before);
  assert.deepEqual(readFileSync(join(f.repo, ".git/index")), index);
  assert.equal(existsSync(join(f.root, ".knowledge/cache")), false);
  f.commit();
  assert.deepEqual(f.run().results, []);
  assert.deepEqual(f.run().unmappedFiles, []);
});

test("staged excludes unstaged/untracked paths and compares index contents", (t) => {
  const f = fixture(t);
  f.commit();
  f.write("src/payments.ts", "staged\n");
  f.git("add", "src/payments.ts");
  f.write("src/payments.ts", "initial\n"); // Worktree reverted, index still changed.
  f.write("docs/spec.md", "unstaged\n");
  f.write("new.txt");
  assert.deepEqual(f.run({ staged: true }).results[0].changedFiles, [
    { path: "src/payments.ts", status: "modified" },
  ]);
  assert.deepEqual(f.run({ staged: true }).unmappedFiles, []);
  assert.deepEqual(f.run().results[0].changedFiles, [
    { path: "docs/spec.md", status: "modified" },
  ]);
  assert.throws(
    () => f.run({ staged: true, base: "main" }),
    /cannot be combined/,
  );
});

test("renames match both old and new associations; deletions remain visible", (t) => {
  const f = fixture(t);
  f.node("knowledge/nodes/new.md", "new", ["src/renamed.ts"]);
  f.commit();
  f.git("mv", "src/payments.ts", "src/renamed.ts");
  rmSync(join(f.root, "docs/spec.md"));
  const result = f.run();
  assert.equal(result.results.length, 2);
  for (const n of result.results)
    assert.ok(
      n.changedFiles.some(
        (c) =>
          c.status === "renamed" &&
          c.oldPath === "src/payments.ts" &&
          c.path === "src/renamed.ts",
      ),
    );
  assert.ok(
    result.results
      .find((n) => n.id === "payments")!
      .changedFiles.some((c) => c.status === "deleted"),
  );
  assert.ok(result.warnings.some((w) => w.code === "BROKEN_SOURCE_FILE"));
});

test("base uses merge-base and includes branch plus uncommitted changes", (t) => {
  const f = fixture(t);
  f.commit();
  const initial = f.git("rev-parse", "HEAD");
  f.git("checkout", "-b", "feature");
  f.write("src/payments.ts", "feature\n");
  f.commit();
  f.git("checkout", "main");
  f.write("main-only.txt");
  f.commit();
  f.git("checkout", "feature");
  f.write("docs/spec.md", "working\n");
  f.write("new.txt");
  const result = f.run({ base: "main" });
  assert.equal(result.base, initial);
  assert.equal(result.mode, "base");
  assert.equal(result.results[0].changedFiles.length, 2);
  assert.deepEqual(result.unmappedFiles, [
    { path: "new.txt", status: "untracked" },
  ]);
  assert.throws(() => f.run({ base: "no-such-ref" }), /Git review failed/);
  assert.throws(() => f.run({ base: "--help" }), /Git review failed/);
});

test("unborn repositories support working and staged review without creating Git objects", (t) => {
  const f = fixture(t);
  assert.equal(f.run().base, null);
  assert.equal(f.run().results[0].changedFiles[0].status, "untracked");
  assert.deepEqual(f.run({ staged: true }).results, []);
  f.git("add", ".");
  assert.equal(
    f.run({ staged: true }).results[0].changedFiles[0].status,
    "added",
  );
  assert.throws(() => f.run({ base: "main" }), /existing HEAD/);
});

test("nested project excludes sibling paths and handles moves across its boundary", (t) => {
  const f = fixture(t, true);
  writeFileSync(join(f.repo, "outside.txt"), "outside\n");
  f.commit();
  writeFileSync(join(f.repo, "outside.txt"), "modified\n");
  f.git("mv", "app/src/payments.ts", "moved-out.ts");
  const result = f.run();
  assert.deepEqual(result.results[0].changedFiles, [
    { path: "src/payments.ts", status: "deleted" },
  ]);
  assert.deepEqual(result.unmappedFiles, []);
});

test("NUL-delimited Git paths preserve whitespace and unusual characters", (t) => {
  const f = fixture(t);
  const path = "src/space ü [x].ts";
  f.write(path);
  f.node("knowledge/nodes/odd.md", "odd", [path, "./" + path], [path]);
  f.commit();
  f.write(path, "changed\n");
  f.write("tab\tnewline\n.txt");
  const result = f.run();
  assert.deepEqual(result.results[0].changedFiles, [
    { path, status: "modified" },
  ]);
  assert.ok(result.unmappedFiles.some((f) => f.path === "tab\tnewline\n.txt"));
});

test("deleted/malformed knowledge stays visible", (t) => {
  const f = fixture(t);
  f.commit();
  rmSync(join(f.root, "knowledge/nodes/payments.md"));
  f.write("knowledge/nodes/bad.md", "---\nid: [\n---\n");
  f.write("src/payments.ts", "changed\n");
  const result = f.run();
  assert.deepEqual(result.results, []);
  assert.ok(result.warnings.some((w) => w.code === "PARSE_ERROR"));
  assert.ok(
    result.unmappedFiles.some((f) => f.path === "knowledge/nodes/payments.md"),
  );
  assert.ok(result.unmappedFiles.some((f) => f.path === "src/payments.ts"));
});

test("CLI exposes JSON and operational errors; no approval subcommand", (t) => {
  const f = fixture(t);
  f.commit();
  f.write("src/payments.ts", "changed\n");
  const run = (args: string[]) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        resolve("src/cli.ts"),
        "--project",
        f.root,
        "--json",
        "review",
        ...args,
      ],
      { encoding: "utf8" },
    );
  const result = run([]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).results[0].id, "payments");
  for (const args of [
    ["--approve"],
    ["--staged", "--base", "main"],
    ["--base", "missing"],
  ]) {
    const error = run(args);
    assert.equal(error.status, 2, error.stdout + error.stderr);
    assert.equal(JSON.parse(error.stdout).ok, false);
  }
  rmSync(join(f.repo, ".git"), { recursive: true });
  assert.equal(run([]).status, 2);
});

test("URL and text sources do not act as local file associations", (t) => {
  const f = fixture(t);
  f.write(
    "knowledge/nodes/external.md",
    `---\n${stringify({
      id: "external",
      title: "External",
      type: "concept",
      sources: [
        { kind: "url", target: "https://example.com/docs/spec.md" },
        { kind: "reference", target: "docs/spec.md" },
      ],
    })}---\nExternal sources\n`,
  );
  f.commit();
  f.write("docs/spec.md", "changed\n");
  assert.deepEqual(
    f.run().results.map((n) => n.id),
    ["payments"],
  );
});

test("unresolved Git index conflicts fail rather than report partial coverage", (t) => {
  const f = fixture(t);
  f.commit();
  f.git("checkout", "-b", "other");
  f.write("src/payments.ts", "other branch\n");
  f.commit();
  f.git("checkout", "main");
  f.write("src/payments.ts", "main branch\n");
  f.commit();
  const merge = spawnSync(
    "git",
    ["-C", f.repo, "-c", "core.hooksPath=/dev/null", "merge", "other"],
    { encoding: "utf8" },
  );
  assert.equal(merge.status, 1);
  assert.throws(() => f.run(), /Resolve Git index conflicts/);
});
