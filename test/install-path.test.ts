import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("shell setup is literal, repeatable, and supports opt-out and different shells", (t) => {
  const root = mkdtempSync(join(tmpdir(), "kw-path-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, "space ' dollar$`test`", "bin");
  const env = {
    ...process.env,
    HOME: root,
    SHELL: "/bin/bash",
    ZDOTDIR: root,
    XDG_CONFIG_HOME: join(root, ".config"),
    KW_NO_MODIFY_PATH: "0",
  };
  const run = (extra = {}) => {
    const r = spawnSync(
      process.execPath,
      [resolve("scripts/install-path.mjs"), bin],
      { env: { ...env, ...extra }, encoding: "utf8" },
    );
    assert.equal(r.status, 0, r.stderr);
    return r.stdout;
  };
  run({ KW_NO_MODIFY_PATH: "1" });
  assert.equal(existsSync(join(root, ".bashrc")), false);
  run();
  const original = readFileSync(join(root, ".bashrc"), "utf8");
  run();
  assert.equal(readFileSync(join(root, ".bashrc"), "utf8"), original);
  const shell = spawnSync(
    "bash",
    ["-c", '. "$HOME/.bashrc"; . "$HOME/.bashrc"; printf "%s" "$PATH"'],
    { env, encoding: "utf8" },
  );
  assert.equal(shell.status, 0, shell.stderr);
  assert.equal(shell.stdout.split(":").filter((p) => p === bin).length, 1);
  assert.equal(readFileSync(join(root, ".profile"), "utf8"), original);
  run({ SHELL: "/bin/zsh" });
  assert.equal(readFileSync(join(root, ".zshrc"), "utf8"), original);
  run({ SHELL: "/bin/fish" });
  assert.match(
    readFileSync(join(root, ".config/fish/conf.d/kw-path.fish"), "utf8"),
    /fish_add_path --path/,
  );
  assert.match(run({ SHELL: "/bin/unknown" }), /supported shell/);
});

test("version matches package metadata without a collection, including JSON mode", () => {
  const version = JSON.parse(readFileSync("package.json", "utf8")).version;
  for (const args of [["--version"], ["-V"], ["--json", "--version"]]) {
    const r = spawnSync(
      process.execPath,
      ["--import", import.meta.resolve("tsx"), resolve("src/cli.ts"), ...args],
      { cwd: tmpdir(), encoding: "utf8" },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), version);
  }
});
