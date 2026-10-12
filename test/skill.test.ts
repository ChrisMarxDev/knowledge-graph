import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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
import { join, resolve } from "node:path";
import { installSkill } from "../src/skill.js";

function fixture(t: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), "kw-skill-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
test("skill installs into Git root from a nested directory without initializing knowledge", (t) => {
  const root = fixture(t);
  execFileSync("git", ["init", "-q", root]);
  const nested = join(root, "app");
  mkdirSync(nested);
  const result = installSkill(nested);
  assert.equal(result.root, root);
  assert.equal(result.applied, true);
  assert.equal(
    readFileSync(join(result.destination, "SKILL.md"), "utf8"),
    readFileSync("skills/use-kw/SKILL.md", "utf8"),
  );
  assert.ok(existsSync(join(result.destination, "references", "cli.md")));
  assert.equal(existsSync(join(root, ".knowledge")), false);
  assert.equal(existsSync(join(root, "AGENTS.md")), false);
  assert.equal(
    existsSync(join(root, "skills", ".kw-skill-install.lock")),
    false,
  );
  const repeat = installSkill(nested);
  assert.equal(repeat.applied, false);
  assert.ok(repeat.files.every((file) => file.action === "unchanged"));
});
test("dry run writes nothing, including with force; custom files require explicit replacement", (t) => {
  const root = fixture(t);
  const preview = installSkill(root, { dryRun: true, force: true });
  assert.equal(preview.applied, false);
  assert.equal(existsSync(join(root, "skills")), false);
  const destination = join(root, "skills", "use-kw");
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, "SKILL.md"), "Local customization");
  writeFileSync(join(destination, "notes.txt"), "Keep this");
  const conflict = installSkill(root, { dryRun: true });
  assert.deepEqual(conflict.conflicts, ["skills/use-kw/SKILL.md"]);
  assert.throws(() => installSkill(root), /--force/);
  assert.equal(existsSync(join(destination, "references")), false);
  installSkill(root, { force: true, dryRun: true });
  assert.equal(
    readFileSync(join(destination, "SKILL.md"), "utf8"),
    "Local customization",
  );
  const result = installSkill(root, { force: true });
  assert.equal(result.applied, true);
  assert.equal(
    readFileSync(join(destination, "notes.txt"), "utf8"),
    "Keep this",
  );
  assert.ok(result.files.some((file) => file.action === "update"));
});
test("skill install refuses destination symlinks and directory/file conflicts before writes", (t) => {
  const root = fixture(t);
  const outside = fixture(t);
  symlinkSync(outside, join(root, "skills"));
  assert.throws(() => installSkill(root, { force: true }), /symbolic links/);
  assert.equal(existsSync(join(outside, "use-kw")), false);
  rmSync(join(root, "skills"));
  mkdirSync(join(root, "skills", "use-kw", "SKILL.md"), { recursive: true });
  assert.throws(() => installSkill(root), /Expected a skill file/);
  assert.equal(existsSync(join(root, "skills", "use-kw", "references")), false);
});
test("CLI skill install works from cwd and exposes JSON previews and conflict errors", (t) => {
  const root = fixture(t);
  const cli = resolve("src/cli.ts");
  const loader = import.meta.resolve("tsx");
  const run = (args: string[]) =>
    spawnSync(
      process.execPath,
      ["--import", loader, cli, "--json", "skill", "install", ...args],
      { cwd: root, encoding: "utf8" },
    );
  const preview = run(["--dry-run"]);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).applied, false);
  assert.equal(run([]).status, 0);
  writeFileSync(join(root, "skills", "use-kw", "SKILL.md"), "custom");
  const conflict = run([]);
  assert.equal(conflict.status, 2);
  assert.equal(JSON.parse(conflict.stdout).ok, false);
  assert.equal(run(["--force"]).status, 0);
});
