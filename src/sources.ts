import { existsSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { object, type Node, type Project, type Issue } from "./core.js";

export type Source = {
  kind: "url" | "file" | "reference";
  target: string;
  title?: string;
  locator?: string;
  note?: string;
};
export function sourceError(value: unknown): string | undefined {
  if (!object(value) || !["url", "file", "reference"].includes(value.kind))
    return "kind must be url, file, or reference";
  if (
    typeof value.target !== "string" ||
    !value.target.trim() ||
    /[\x00-\x1f\x7f]/.test(value.target)
  )
    return "target must be nonempty text without control characters";
  if (
    Object.keys(value).some(
      (k) => !["kind", "target", "title", "locator", "note"].includes(k),
    )
  )
    return "unknown source field";
  for (const key of ["title", "locator", "note"])
    if (
      value[key] !== undefined &&
      (typeof value[key] !== "string" || !value[key].trim())
    )
      return `${key} must be nonempty text`;
  if (value.kind === "url") {
    try {
      const url = new URL(value.target);
      if (
        !/^https?:\/\//i.test(value.target) ||
        !["https:", "http:"].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password
      )
        return "URL must use HTTP(S) without embedded credentials";
    } catch {
      return "target must be an absolute HTTP(S) URL";
    }
  }
  if (
    value.kind === "file" &&
    (isAbsolute(value.target) ||
      /^[A-Za-z]:/.test(value.target) ||
      value.target.includes("\\") ||
      value.target.split("/").includes(".."))
  )
    return "file target must be a project-relative path without parent traversal; use locator for a section or page";
}
export function sources(n: Node): Source[] {
  return Array.isArray(n.data.sources)
    ? n.data.sources.filter((s: unknown) => !sourceError(s))
    : [];
}
export function sourceFiles(n: Node): string[] {
  return sources(n)
    .filter((s) => s.kind === "file")
    .map((s) => s.target);
}
export function analyzeSources(p: Project, n: Node): Issue[] {
  const issues: Issue[] = [];
  const add = (
    code: string,
    message: string,
    severity: Issue["severity"] = "error",
  ) => issues.push({ code, message, severity, path: n.relativePath });
  if (n.data.sources === undefined) return issues;
  if (!Array.isArray(n.data.sources)) {
    add("INVALID_SOURCES", "sources must be a list of source references");
    return issues;
  }
  for (const [index, source] of n.data.sources.entries()) {
    const error = sourceError(source);
    if (error) {
      add("INVALID_SOURCE", `sources[${index}]: ${error}`);
      continue;
    }
    if (source.kind !== "file") continue;
    const path = resolve(p.root, source.target);
    try {
      if (!existsSync(path)) {
        add(
          "BROKEN_SOURCE_FILE",
          `Source file does not exist: ${source.target}`,
          "warning",
        );
        continue;
      }
      const rel = relative(realpathSync(p.root), realpathSync(path));
      if (rel === ".." || rel.startsWith("../") || isAbsolute(rel))
        add(
          "UNSAFE_SOURCE_FILE",
          `Source file resolves outside the project: ${source.target}`,
        );
      else if (!statSync(path).isFile())
        add(
          "BROKEN_SOURCE_FILE",
          `Source is not a regular file: ${source.target}`,
          "warning",
        );
    } catch {
      add(
        "BROKEN_SOURCE_FILE",
        `Cannot inspect source file: ${source.target}`,
        "warning",
      );
    }
  }
  return issues;
}
