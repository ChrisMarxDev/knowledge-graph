import { execFileSync } from "node:child_process";
import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWrite, fail, portable } from "./core.js";

const source = fileURLToPath(new URL("../skills/use-kw/", import.meta.url));
function stat(path: string) {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
function bounded(root: string, path: string) {
  let current = root;
  for (const part of relative(root, path).split(sep)) {
    current = join(current, part);
    if (stat(current)?.isSymbolicLink())
      fail(`Skill paths cannot use symbolic links: ${current}`);
    if (current !== path && stat(current) && !stat(current)!.isDirectory())
      fail(`Expected a directory: ${current}`);
  }
  return path;
}
function repository(directory: string) {
  const start = realpathSync(resolve(directory));
  if (!lstatSync(start).isDirectory())
    fail(`Expected a project directory: ${start}`);
  try {
    return realpathSync(
      execFileSync("git", ["-C", start, "rev-parse", "--show-toplevel"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    );
  } catch {
    return start;
  }
}

/** Install only the bundled primitive skill; no collection or agent setup changes. */
export function installSkill(
  directory: string,
  options: { force?: boolean; dryRun?: boolean } = {},
) {
  const root = repository(directory);
  const destination = join(root, "skills", "use-kw");
  const assets: { path: string; content: string }[] = [];
  function visit(folder: string) {
    for (const name of readdirSync(folder).sort()) {
      const path = bounded(source, join(folder, name));
      const info = lstatSync(path);
      if (info.isDirectory()) visit(path);
      else if (info.isFile())
        assets.push({
          path: join(destination, relative(source, path)),
          content: readFileSync(path, "utf8"),
        });
      else fail(`Unsupported skill asset: ${path}`);
    }
  }
  visit(source);
  if (!assets.some((asset) => asset.path === join(destination, "SKILL.md")))
    fail("Bundled use-kw skill is missing SKILL.md");
  function plan() {
    return assets.map((asset) => {
      bounded(root, asset.path);
      const info = stat(asset.path);
      if (info && !info.isFile()) fail(`Expected a skill file: ${asset.path}`);
      const before = info ? readFileSync(asset.path, "utf8") : undefined;
      return {
        ...asset,
        before,
        action:
          before === asset.content
            ? "unchanged"
            : before === undefined
              ? "create"
              : "update",
      };
    });
  }
  const result = (files: ReturnType<typeof plan>, applied: boolean) => ({
    root,
    skill: "use-kw",
    destination,
    applied,
    files: files.map((file) => ({
      path: portable(relative(root, file.path)),
      action: file.action,
    })),
    conflicts: options.force
      ? []
      : files
          .filter((file) => file.action === "update")
          .map((file) => portable(relative(root, file.path))),
  });
  const initial = plan();
  if (options.dryRun) return result(initial, false);
  const conflicts = initial.filter((file) => file.action === "update");
  if (conflicts.length && !options.force)
    fail(
      `Skill files differ: ${conflicts.map((file) => portable(relative(root, file.path))).join(", ")}. Use --force to replace bundled files, or --dry-run to preview.`,
    );
  if (initial.every((file) => file.action === "unchanged"))
    return result(initial, false);
  const lockPath = bounded(
    root,
    join(root, "skills", ".kw-skill-install.lock"),
  );
  mkdirSync(dirname(lockPath), { recursive: true });
  const lock = openSync(lockPath, "wx");
  const written: ReturnType<typeof plan> = [];
  try {
    const files = plan();
    if (!options.force && files.some((file) => file.action === "update"))
      fail("Skill changed during install; reread and use --force if intended.");
    for (const file of files.filter((file) => file.action !== "unchanged")) {
      mkdirSync(dirname(file.path), { recursive: true });
      if (file.before === undefined)
        writeFileSync(file.path, file.content, { flag: "wx" });
      else atomicWrite(file.path, file.before, file.content);
      written.push(file);
    }
    return result(files, written.length > 0);
  } catch (error) {
    for (const file of written.reverse()) {
      if (
        stat(file.path)?.isFile() &&
        readFileSync(file.path, "utf8") === file.content
      ) {
        if (file.before === undefined) rmSync(file.path);
        else atomicWrite(file.path, file.content, file.before);
      }
    }
    throw error;
  } finally {
    closeSync(lock);
    rmSync(lockPath);
  }
}
