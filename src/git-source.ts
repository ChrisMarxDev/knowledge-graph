import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, relative, isAbsolute, sep } from "node:path";
import { fail } from "./core.js";

export type SourceOptions = { ref?: string; folder?: string };
export type GitSource = {
  repository: string;
  ref: string;
  folder: string;
  commit: string;
};
export function parseGitSource(source: string, options: SourceOptions = {}) {
  let repository = source;
  let ref = options.ref ?? "HEAD";
  let folder = options.folder ?? ".";
  const remote = /^(https:\/\/|ssh:\/\/|git@)/.test(source);
  if (!remote && options.ref === undefined && options.folder === undefined)
    return null;
  if (source.startsWith("https://")) {
    const url = new URL(source);
    if (url.username || url.password || url.search || url.hash)
      fail("Git URLs must not contain credentials, queries, or fragments");
    const parts = url.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    if (url.hostname === "github.com" && parts[2] === "tree") {
      if (parts.length < 4) fail("GitHub folder URL requires a ref");
      repository = `https://github.com/${parts[0]}/${parts[1]}.git`;
      ref = options.ref ?? parts[3];
      folder = options.folder ?? (parts.slice(4).join("/") || ".");
    }
  }
  if (!remote) repository = resolve(source);
  if (!ref || ref.startsWith("-") || /[\x00-\x20\x7f]/.test(ref))
    fail("Invalid Git ref");
  if (
    !folder ||
    isAbsolute(folder) ||
    folder.includes("\\") ||
    folder.split("/").includes("..") ||
    /[\x00-\x1f\x7f]/.test(folder)
  )
    fail("Git folder must be a relative path without parent traversal");
  return { repository, ref, folder };
}
export function withGitSource<T>(
  source: string,
  options: SourceOptions,
  use: (
    directory: string,
    repositoryRoot?: string,
    provenance?: GitSource,
  ) => T,
): T {
  const spec = parseGitSource(source, options);
  if (!spec) return use(source);
  const checkout = mkdtempSync(join(tmpdir(), "kw-git-source-"));
  function git(args: string[]) {
    try {
      return execFileSync(
        "git",
        [
          "-c",
          "core.hooksPath=/dev/null",
          "-c",
          "protocol.allow=never",
          "-c",
          "protocol.https.allow=always",
          "-c",
          "protocol.ssh.allow=always",
          "-c",
          "protocol.file.allow=always",
          "-C",
          checkout,
          ...args,
        ],
        {
          encoding: "utf8",
          timeout: 120000,
          maxBuffer: 4 * 1024 * 1024,
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: "0",
            GIT_LFS_SKIP_SMUDGE: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      ).trim();
    } catch {
      return fail(
        `Git source operation failed (${args[0]}). Check repository access and ref; Git is required.`,
      );
    }
  }
  try {
    git(["init", "--quiet"]);
    git([
      "fetch",
      "--quiet",
      "--depth=1",
      "--no-tags",
      "--",
      spec.repository,
      spec.ref,
    ]);
    const commit = git(["rev-parse", "--verify", "FETCH_HEAD^{commit}"]);
    git([
      "-c",
      "advice.detachedHead=false",
      "checkout",
      "--quiet",
      "--detach",
      commit,
    ]);
    const directory = resolve(checkout, spec.folder);
    if (directory !== checkout && !directory.startsWith(checkout + sep))
      fail("Git folder escapes checkout");
    let current = checkout;
    for (const part of relative(checkout, directory)
      .split(sep)
      .filter(Boolean)) {
      current = join(current, part);
      if (lstatSync(current).isSymbolicLink())
        fail("Git folder cannot traverse symbolic links");
    }
    if (!lstatSync(directory).isDirectory())
      fail("Git folder must be a directory");
    return use(directory, checkout, { ...spec, commit });
  } finally {
    rmSync(checkout, { recursive: true, force: true });
  }
}
