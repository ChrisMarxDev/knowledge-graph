import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readlinkSync,
  readdirSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

const installer = resolve("install.sh");
function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-install-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, "git source"),
    prefix = join(root, "install prefix"),
    tools = join(root, "tools");
  mkdirSync(repo);
  mkdirSync(tools);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, stdio: "pipe" });
  git("init", "-q");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Installer test");
  mkdirSync(join(repo, "bin"));
  writeFileSync(
    join(repo, "bin/kw.js"),
    "#!/usr/bin/env node\nconsole.log('installed fixture');\n",
  );
  writeFileSync(join(repo, "package-lock.json"), "{}");
  writeFileSync(join(repo, "package.json"), "{}");
  git("add", ".");
  git("commit", "-qm", "Initial fixture");
  // Simulate build outcomes; production installation is also exercised separately.
  writeFileSync(
    join(tools, "npm"),
    '#!/bin/sh\nset -eu\nif [ "$1" = run ]; then\n  [ ! -e fail-build ] || exit 17\n  mkdir -p dist/ui\n  printf "<html></html>" > dist/ui/index.html\nfi\n',
    { mode: 0o755 },
  );
  const run = (...args: string[]) =>
    spawnSync("sh", [installer, "--repo", repo, "--prefix", prefix, ...args], {
      env: { ...process.env, PATH: `${tools}:${process.env.PATH}` },
      encoding: "utf8",
    });
  return { root, repo, prefix, git, run };
}

test("Git installer installs/reinstalls paths with spaces and preserves a working copy on failed updates", (t) => {
  const { repo, prefix, git, run } = fixture(t);
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  const command = join(prefix, "bin/kw"),
    first = readlinkSync(command);
  assert.match(
    execFileSync(command, { encoding: "utf8" }),
    /installed fixture/,
  );
  writeFileSync(
    join(repo, "bin/kw.js"),
    "#!/usr/bin/env node\nconsole.log('updated fixture');\n",
  );
  git("add", ".");
  git("commit", "-qm", "Update fixture");
  result = run();
  assert.equal(result.status, 0, result.stderr);
  const second = readlinkSync(command);
  assert.notEqual(second, first);
  assert.equal(existsSync(first), false);
  assert.match(execFileSync(command, { encoding: "utf8" }), /updated fixture/);
  writeFileSync(join(repo, "fail-build"), "fail");
  git("add", ".");
  git("commit", "-qm", "Broken fixture");
  result = run();
  assert.notEqual(result.status, 0);
  assert.equal(readlinkSync(command), second);
  assert.deepEqual(readdirSync(join(prefix, "share/kw")), [
    second.split("/").at(-3),
  ]);
  result = run("--ref", "no-such-ref");
  assert.notEqual(result.status, 0);
  assert.equal(readlinkSync(command), second);
  result = run("--ref", git("rev-parse", "HEAD~1").toString().trim());
  assert.equal(result.status, 0, result.stderr);
});

test("installer refuses unrelated executables, overlapping installs and invalid flags", (t) => {
  const { prefix, run } = fixture(t);
  mkdirSync(join(prefix, "bin"), { recursive: true });
  writeFileSync(join(prefix, "bin/kw"), "unrelated");
  let r = run();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /already exists/);
  rmSync(join(prefix, "bin/kw"));
  mkdirSync(join(prefix, "share/kw/.install-lock"));
  r = run();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Another install/);
  assert.notEqual(run("--ref").status, 0);
  assert.notEqual(run("--unknown").status, 0);
});
