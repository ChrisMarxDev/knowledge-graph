import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init, project, scan, doctor } from "../src/core.js";
import { applyTemplate, showTemplate } from "../src/templates.js";
import { parseGitSource, withGitSource } from "../src/git-source.js";

function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-git-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, "source repo");
  mkdirSync(repo);
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
  git("init", "-q");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  init(repo);
  const node = join(repo, "knowledge/nodes/a.md");
  writeFileSync(
    node,
    "---\nid: imported\ntitle: Original\ntype: concept\n---\nOriginal body\n",
  );
  writeFileSync(
    join(repo, "knowledge/meta.yaml"),
    "types:\n  concept: {}\ndimensions: {}\nrelations: {}\n",
  );
  mkdirSync(join(repo, "skills/local-skill"), { recursive: true });
  writeFileSync(
    join(repo, "skills/local-skill/SKILL.md"),
    "---\nname: local-skill\ndescription: Test workflow.\n---\nRead relevant knowledge.\n",
  );
  mkdirSync(join(repo, "templates/example/nodes"), { recursive: true });
  writeFileSync(
    join(repo, "templates/example/template.yaml"),
    "version: 1\nname: example\ndescription: Example\nnodes: []\nskills: [local-skill]\n",
  );
  writeFileSync(
    join(repo, "templates/example/meta.yaml"),
    "types: {}\ndimensions: {}\nrelations: {}\n",
  );
  symlinkSync("knowledge", join(repo, "linked"));
  git("add", ".");
  git("commit", "-qm", "Original knowledge");
  const commit = git("rev-parse", "HEAD");
  git("tag", "v1");
  writeFileSync(
    node,
    readFileSync(node, "utf8").replaceAll("Original", "Updated"),
  );
  git("add", ".");
  git("commit", "-qm", "Update knowledge");
  const target = join(root, "target");
  init(target);
  return { root, repo, commit, p: project(target) };
}
test("GitHub folder URLs and explicit Git references parse without conflating local directories", () => {
  assert.deepEqual(
    parseGitSource("https://github.com/org/repo/tree/main/knowledge"),
    {
      repository: "https://github.com/org/repo.git",
      ref: "main",
      folder: "knowledge",
    },
  );
  assert.deepEqual(
    parseGitSource("git@github.com:org/repo.git", {
      ref: "feature/schema",
      folder: "templates/coding",
    }),
    {
      repository: "git@github.com:org/repo.git",
      ref: "feature/schema",
      folder: "templates/coding",
    },
  );
  assert.equal(parseGitSource("./local-folder"), null);
  for (const folder of ["../other", "/absolute", "a/../../b", "a\\b"])
    assert.throws(
      () => parseGitSource("https://example.com/repo.git", { folder }),
      /relative path/,
    );
  assert.throws(
    () => parseGitSource("https://user:secret@example.com/repo.git"),
    /credentials/,
  );
  assert.throws(
    () =>
      parseGitSource("https://example.com/repo.git", {
        ref: "--upload-pack=bad",
      }),
    /Invalid Git ref/,
  );
});
test("Git knowledge folders preview, pin revisions, copy nodes and preserve conflict behavior", (t) => {
  const { repo, commit, p } = fixture(t);
  const opts = { folder: "knowledge", ref: "v1" };
  const shown = showTemplate(repo, opts);
  assert.equal(shown.directory, null);
  assert.equal(shown.source?.commit, commit);
  assert.ok(shown.nodes[0].content.includes("Original body"));
  const preview = applyTemplate(p, repo, false, opts);
  assert.equal(preview.source?.commit, commit);
  assert.equal(scan(p).nodes.length, 0);
  assert.equal(applyTemplate(p, repo, true, opts).applied, true);
  assert.deepEqual(doctor(project(p.root), scan(project(p.root))), []);
  assert.equal(
    applyTemplate(project(p.root), repo, true, opts).changes.length,
    0,
  );
  const conflict = applyTemplate(project(p.root), repo, true, {
    folder: "knowledge",
  });
  assert.equal(conflict.applied, false);
  assert.equal(conflict.conflicts.length, 1);
  assert.ok(scan(p).nodes[0].body.includes("Original body"));
  assert.equal(
    showTemplate(repo, { folder: "knowledge", ref: commit }).source?.commit,
    commit,
  );
});
test("Git template folders include explicitly listed repository skills, and cleanup on failure", (t) => {
  const { repo, p } = fixture(t);
  const result = applyTemplate(p, repo, true, { folder: "templates/example" });
  assert.equal(result.applied, true);
  assert.ok(existsSync(join(p.root, "skills/local-skill/SKILL.md")));
  let checkout = "";
  assert.throws(
    () =>
      withGitSource(repo, { folder: "knowledge" }, (_dir, root) => {
        checkout = root!;
        throw new Error("consumer failed");
      }),
    /consumer failed/,
  );
  assert.equal(existsSync(checkout), false);
  assert.throws(() => showTemplate(repo, { folder: "linked" }), /symbolic/);
  assert.throws(() => showTemplate(repo, { folder: "missing" }), /ENOENT/);
  assert.throws(
    () => showTemplate(repo, { folder: "knowledge", ref: "not-a-ref" }),
    /Git source operation failed/,
  );
});
test("plain local knowledge folders use the same additive importer", (t) => {
  const { repo, p } = fixture(t);
  assert.equal(applyTemplate(p, join(repo, "knowledge"), true).applied, true);
  assert.ok(scan(p).nodes[0].body.includes("Updated body"));
});
