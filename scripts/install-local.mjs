import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

import { configurePath } from "./install-path.mjs";

const repo = fileURLToPath(new URL("..", import.meta.url));
const source = join(repo, "bin/kw.js");
const prefix = resolve(process.env.KW_PREFIX || join(homedir(), ".local"));
const bindir = join(prefix, "bin");
const root = join(prefix, "share/kw");
const command = join(bindir, "kw");
const lock = join(root, ".install-lock");

try {
  for (const file of ["dist/cli.js", "dist/ui/index.html"]) {
    if (!existsSync(join(repo, file)))
      throw new Error("Run npm run build first");
  }
  mkdirSync(bindir, { recursive: true });
  mkdirSync(root, { recursive: true });
  try {
    mkdirSync(lock);
  } catch {
    throw new Error(`Another install may be running; check ${lock}`);
  }
  let stage;
  try {
    const existing = lstatSync(command, { throwIfNoEntry: false });
    if (existing) {
      if (!existing.isSymbolicLink())
        throw new Error(`${command} already exists and is not a symlink`);
      const target = resolve(bindir, readlinkSync(command));
      const build = dirname(dirname(target));
      const managed =
        dirname(build) === root &&
        build.startsWith(join(root, "build.")) &&
        target === join(build, "bin/kw.js") &&
        existsSync(join(build, ".kw-git-install"));
      if (target !== source && !managed)
        throw new Error(
          `${command} points to another installation; choose a different KW_PREFIX or move it first`,
        );
    }
    chmodSync(source, 0o755);
    stage = mkdtempSync(join(bindir, ".kw-local-"));
    symlinkSync(source, join(stage, "kw"));
    renameSync(join(stage, "kw"), command);
    console.log(`Installed ${command} -> ${source}`);
    console.log(
      `Keep this checkout in place; rerun task install after edits. Restart running kw view servers.`,
    );
    configurePath(bindir);
  } finally {
    if (stage) rmSync(stage, { recursive: true, force: true });
    rmSync(lock, { recursive: true });
  }
} catch (error) {
  console.error(`kw local installer: ${error.message}`);
  process.exitCode = 1;
}
