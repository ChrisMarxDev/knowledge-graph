import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { doctor, fail, portable, type Graph, type Project } from "./core.js";
import { sourceError, sourceFiles } from "./sources.js";

export type ChangedFile = {
  path: string;
  status:
    | "added"
    | "modified"
    | "deleted"
    | "renamed"
    | "copied"
    | "type-changed"
    | "untracked";
  oldPath?: string;
};

/** Match a Git change set to current knowledge. No index, cache, or review writes. */
export function review(
  p: Project,
  g: Graph,
  options: { staged?: boolean; base?: string } = {},
) {
  if (options.staged && options.base !== undefined)
    fail("--staged and --base cannot be combined");
  const run = (cwd: string, args: string[], optional = false) => {
    const result = spawnSync(
      "git",
      ["--no-optional-locks", "-C", cwd, ...args],
      {
        encoding: "utf8",
        input: "",
        maxBuffer: 32 * 1024 * 1024,
        timeout: 30000,
      },
    );
    if (result.error) fail(`Git review failed: ${result.error.message}`);
    if (result.status !== 0) {
      if (optional && result.status === 1) return null;
      fail(`Git review failed: ${result.stderr.trim() || "command failed"}`);
    }
    return result.stdout;
  };
  const root = realpathSync(p.root);
  const repo = realpathSync(
    run(root, ["rev-parse", "--show-toplevel"])!.trimEnd(),
  );
  const git = (args: string[], optional = false) => run(repo, args, optional);
  if (git(["ls-files", "--unmerged", "-z"]))
    fail("Resolve Git index conflicts before running review");
  const head = git(["rev-parse", "--verify", "--quiet", "HEAD"], true)?.trim();
  let base = head;
  if (options.base !== undefined) {
    if (!head) fail("--base requires an existing HEAD commit");
    const commit = git([
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${options.base}^{commit}`,
    ])!.trim();
    base = git(["merge-base", head, commit])!.trim();
  }
  // Hashing the empty tree without -w supports unborn branches without writing objects.
  const comparison =
    base ?? git(["hash-object", "-t", "tree", "--stdin"])!.trim();
  const fields = git([
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--ignore-submodules=none",
    "--name-status",
    "-z",
    "--find-renames",
    ...(options.staged ? ["--cached"] : []),
    comparison,
    "--",
  ])!.split("\0");
  const local = (path: string): string | undefined => {
    const rel = relative(root, resolve(repo, path));
    return rel && rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel)
      ? portable(rel)
      : undefined;
  };
  const changes: ChangedFile[] = [];
  const statuses: Record<string, ChangedFile["status"]> = {
    A: "added",
    M: "modified",
    D: "deleted",
    T: "type-changed",
  };
  for (let i = 0; i < fields.length && fields[i];) {
    const status = fields[i++];
    const first = local(fields[i++]);
    if (status.startsWith("R") || status.startsWith("C")) {
      const second = local(fields[i++]);
      if (first && second)
        changes.push({
          path: second,
          oldPath: first,
          status: status.startsWith("R") ? "renamed" : "copied",
        });
      else if (first && status.startsWith("R"))
        changes.push({ path: first, status: "deleted" });
      else if (second) changes.push({ path: second, status: "added" });
    } else {
      if (!statuses[status]) fail(`Unsupported Git change status: ${status}`);
      if (first) changes.push({ path: first, status: statuses[status] });
    }
  }
  if (!options.staged)
    for (const path of git([
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
    ])!.split("\0")) {
      if (!path) continue;
      const file = local(path);
      if (file && !changes.some((c) => c.path === file))
        changes.push({ path: file, status: "untracked" });
    }
  changes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const covered = new Set<ChangedFile>();
  const results = g.nodes.flatMap((node) => {
    const files: unknown[] = Array.isArray(node.data.files)
      ? node.data.files
      : [];
    const references = new Set(
      [...files, ...sourceFiles(node)]
        .filter(
          (target): target is string => !sourceError({ kind: "file", target }),
        )
        .map((target) => portable(relative(p.root, resolve(p.root, target)))),
    );
    const matches = (change: ChangedFile, paths: Set<string>) =>
      paths.has(change.path) ||
      (change.oldPath !== undefined && paths.has(change.oldPath));
    const own = new Set([
      node.relativePath,
      ...(node.skill ? [node.skill.relativePath] : []),
    ]);
    const knowledgeChanges = changes.filter((c) => matches(c, own));
    const changedFiles = changes.filter((c) => matches(c, references));
    for (const c of [...knowledgeChanges, ...changedFiles]) covered.add(c);
    if (!knowledgeChanges.length && !changedFiles.length) return [];
    return [
      {
        id: typeof node.data.id === "string" ? node.data.id : null,
        path: node.relativePath,
        title: typeof node.data.title === "string" ? node.data.title : "",
        knowledgeChanged: knowledgeChanges.length > 0,
        changedFiles,
      },
    ];
  });
  return {
    mode: options.staged
      ? "staged"
      : options.base !== undefined
        ? "base"
        : "working-tree",
    base: base ?? null,
    knowledgeSnapshot: "working-tree",
    results,
    unmappedFiles: changes.filter((c) => !covered.has(c)),
    warnings: doctor(p, g),
  };
}
