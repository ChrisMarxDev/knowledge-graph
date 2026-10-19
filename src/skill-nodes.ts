import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { parseDocument } from "yaml";
import {
  atomicWrite,
  fail,
  object,
  portable,
  type Data,
  type Node,
  type Project,
} from "./core.js";

const fields = new Set([
  "id",
  "title",
  "type",
  "dimensions",
  "links",
  "files",
  "sources",
]);

/** Explicit, project-local paths only; never follow a symlink into another collection. */
export function localSkillPath(root: string, path: string): string {
  if (
    !path ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    fail(`Expected a normalized project-relative path: ${path}`);
  const full = resolve(root, path);
  let current = root;
  for (const part of path.split("/")) {
    current = resolve(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      fail(`Skill paths cannot use symbolic links: ${path}`);
  }
  if (!full.startsWith(resolve(root) + sep))
    fail(`Skill path escapes the project: ${path}`);
  return full;
}

export function skillRegistry(p: Project) {
  if (p.manifest.skillNodes === undefined) return undefined;
  if (typeof p.manifest.skillNodes !== "string")
    fail("skillNodes must be a project-relative YAML registry path");
  const path = localSkillPath(p.root, p.manifest.skillNodes);
  const raw = readFileSync(path, "utf8");
  const doc = parseDocument(raw);
  if (doc.errors.length)
    fail(
      `Invalid skill registry: ${doc.errors.map((e) => e.message).join("; ")}`,
    );
  const entries = doc.toJS();
  if (!object(entries))
    fail("Skill registry must map SKILL.md paths to graph metadata");
  return { path, relativePath: portable(relative(p.root, path)), raw, entries };
}

export function skillMetadata(p: Project, key: string, metadata: unknown) {
  const path = localSkillPath(p.root, key);
  if (basename(path) !== "SKILL.md")
    fail(`Registered skills must name an exact SKILL.md file: ${key}`);
  if (!object(metadata)) fail(`Skill graph metadata must be a mapping: ${key}`);
  for (const field of Object.keys(metadata))
    if (!fields.has(field))
      fail(
        `Unsupported skill graph field ${field}; name, description and body come from SKILL.md`,
      );
  return { path, metadata };
}

/** Edit graph annotations, never the skill's authored instructions or frontmatter. */
export function editSkillNode(n: Node, changes: Data, dryRun: boolean) {
  const registration = n.skill!;
  for (const key of Object.keys(changes))
    if (!fields.has(key))
      fail(`Cannot edit skill field ${key} through graph metadata`);
  localSkillPath(registration.root, registration.relativePath);
  localSkillPath(registration.root, n.relativePath);
  if (readFileSync(n.path, "utf8") !== n.raw)
    fail(`Skill changed since reading: ${n.relativePath}`);
  const before = readFileSync(registration.path, "utf8");
  const doc = parseDocument(before);
  if (
    doc.errors.length ||
    JSON.stringify(doc.toJS()?.[registration.key]) !==
      JSON.stringify(registration.metadata)
  )
    fail(`Skill registration changed since reading: ${registration.key}`);
  for (const [key, value] of Object.entries(changes))
    doc.setIn([registration.key, key], value);
  const after = String(doc);
  if (!dryRun) atomicWrite(registration.path, before, after);
  return {
    path: registration.relativePath,
    nodePath: n.relativePath,
    before,
    after,
    applied: !dryRun,
  };
}
