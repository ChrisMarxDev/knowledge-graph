import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { parseDocument } from "yaml";
import {
  atomicWrite,
  fail,
  mutablePath,
  object,
  parseNode,
  portable,
  project,
  scan,
  type Data,
  type Project,
} from "./core.js";

import { withGitSource, type SourceOptions } from "./git-source.js";

const packageRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const bundledRoot = join(packageRoot, "templates");
const safeName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const inside = (root: string, path: string) => path.startsWith(root + sep);

// Do not follow source or destination symlinks, including dangling links.
function bounded(root: string, path: string): string {
  const full = resolve(root, path);
  if (!inside(root, full))
    fail(`Template path must stay inside ${root}: ${path}`);
  let current = root;
  for (const part of relative(root, full).split(sep)) {
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink())
        fail(`Template paths cannot use symbolic links: ${current}`);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  return full;
}
function yaml(path: string): Data {
  const doc = parseDocument(readFileSync(path, "utf8"));
  if (doc.errors.length || !object(doc.toJS()))
    fail(`Invalid template YAML: ${path}`);
  return doc.toJS();
}
type Asset = { path: string; content: string };
type Template = {
  name: string;
  description: string;
  directory: string;
  metadata: Data;
  nodes: Asset[];
  skills: Asset[];
};
export function loadTemplate(
  source: string,
  repositoryRoot?: string,
): Template {
  const bundled =
    safeName.test(source) &&
    existsSync(join(bundledRoot, source, "template.yaml"));
  const directory = bundled ? join(bundledRoot, source) : resolve(source);
  if (lstatSync(directory).isSymbolicLink())
    fail("Template directory cannot be a symbolic link");
  const manifestPath = bounded(directory, "template.yaml");
  const plain = !existsSync(manifestPath);
  const walkNodes = (path: string): string[] => {
    bounded(directory, path);
    const stat = lstatSync(path);
    if (stat.isDirectory())
      return readdirSync(path)
        .sort()
        .flatMap((name) => walkNodes(join(path, name)));
    if (!stat.isFile()) fail(`Unsupported knowledge file: ${path}`);
    return path.endsWith(".md")
      ? [portable(relative(join(directory, "nodes"), path))]
      : [];
  };
  const manifest = plain
    ? {
        version: 1,
        name:
          basename(directory)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "knowledge",
        description: "Imported knowledge folder",
        nodes: walkNodes(bounded(directory, "nodes")),
        skills: existsSync(bounded(directory, "skills"))
          ? readdirSync(join(directory, "skills")).sort()
          : [],
      }
    : yaml(manifestPath);
  if (
    manifest.version !== 1 ||
    typeof manifest.name !== "string" ||
    !safeName.test(manifest.name) ||
    typeof manifest.description !== "string"
  )
    fail(
      "Template requires version: 1, a lowercase hyphenated name, and a description",
    );
  if (
    Object.keys(manifest).some(
      (k) => !["version", "name", "description", "nodes", "skills"].includes(k),
    )
  )
    fail("Unknown template manifest field");
  for (const key of ["nodes", "skills"])
    if (
      !Array.isArray(manifest[key]) ||
      manifest[key].some((v: unknown) => typeof v !== "string") ||
      new Set(manifest[key]).size !== manifest[key].length
    )
      fail(`Template ${key} must be a list of unique strings`);
  const rawMetadata = yaml(bounded(directory, "meta.yaml"));
  const metadata = plain
    ? Object.fromEntries(
        ["types", "dimensions", "relations"].map((key) => [
          key,
          rawMetadata[key],
        ]),
      )
    : rawMetadata;
  if (
    Object.keys(metadata).some(
      (k) => !["types", "dimensions", "relations"].includes(k),
    ) ||
    ["types", "dimensions", "relations"].some((k) => !object(metadata[k]))
  )
    fail(
      "Template meta.yaml requires types, dimensions, and relations mappings only",
    );
  const ids = new Set<string>();
  const nodes = manifest.nodes.map((path: string) => {
    if (
      isAbsolute(path) ||
      path.split(/[\\/]/).includes("..") ||
      !path.endsWith(".md")
    )
      fail(`Invalid template node path: ${path}`);
    const sourcePath = bounded(directory, join("nodes", path));
    const n = parseNode(sourcePath, directory);
    if (
      typeof n.data.id !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(n.data.id) ||
      ids.has(n.data.id)
    )
      fail(`Template node needs a unique valid id: ${path}`);
    if (typeof n.data.title !== "string" || !n.data.title.trim())
      fail(`Template node needs a title: ${path}`);
    ids.add(n.data.id);
    return { path, content: n.raw };
  });
  const skills: Asset[] = [];
  for (const name of manifest.skills) {
    if (!safeName.test(name)) fail(`Invalid template skill name: ${name}`);
    // Built-ins share the repository's canonical skills; custom bundles own theirs.
    const base = bundled
      ? packageRoot
      : !plain && repositoryRoot && !existsSync(join(directory, "skills", name))
        ? repositoryRoot
        : directory;
    const skillRoot = bounded(base, join("skills", name));
    const entry = bounded(base, join("skills", name, "SKILL.md"));
    const skill = parseNode(entry, base);
    if (
      skill.data.name !== name ||
      typeof skill.data.description !== "string" ||
      !skill.data.description.trim()
    )
      fail(`Skill ${name} needs matching name and description frontmatter`);
    function visit(path: string) {
      bounded(base, path);
      const stat = lstatSync(path);
      if (stat.isDirectory())
        for (const item of readdirSync(path).sort()) visit(join(path, item));
      else if (stat.isFile()) {
        const bytes = readFileSync(path);
        const content = bytes.toString("utf8");
        if (!Buffer.from(content).equals(bytes))
          fail(`Template skills support UTF-8 files only: ${path}`);
        skills.push({ path: portable(relative(base, path)), content });
      } else fail(`Unsupported template file: ${path}`);
    }
    visit(skillRoot);
  }
  return {
    name: manifest.name,
    description: manifest.description,
    directory,
    metadata,
    nodes,
    skills,
  };
}
export function listTemplates() {
  return readdirSync(bundledRoot)
    .sort()
    .map((name) => {
      const t = loadTemplate(name);
      return { name: t.name, description: t.description };
    });
}
export function showTemplate(source: string, options: SourceOptions = {}) {
  return withGitSource(
    source,
    options,
    (directory, repositoryRoot, provenance) => {
      const t = loadTemplate(directory, repositoryRoot);
      return {
        name: t.name,
        description: t.description,
        directory: provenance ? null : t.directory,
        ...(provenance ? { source: provenance } : {}),
        metadata: t.metadata,
        nodes: t.nodes,
        skills: t.skills,
      };
    },
  );
}
function planTemplate(p: Project, t: Template) {
  const conflicts: { path: string; message: string }[] = [];
  const additions: { category: string; name: string }[] = [];
  const changes: {
    path: string;
    kind: "metadata" | "node" | "skill";
    before: string | null;
    after: string;
  }[] = [];
  const unchanged: string[] = [];
  const metaPath = bounded(p.root, p.metaPath);
  const previous = readFileSync(metaPath, "utf8");
  const doc = parseDocument(previous);
  const existing = doc.toJS();
  for (const category of ["types", "dimensions", "relations"]) {
    for (const [name, definition] of Object.entries(t.metadata[category])) {
      if (Object.hasOwn(existing[category], name)) {
        if (!isDeepStrictEqual(existing[category][name], definition))
          conflicts.push({
            path: portable(relative(p.root, metaPath)),
            message: `Vocabulary definition differs: ${category}.${name}`,
          });
      } else {
        doc.setIn([category, name], definition);
        additions.push({ category, name });
      }
    }
  }
  if (additions.length)
    changes.push({
      path: portable(relative(p.root, metaPath)),
      kind: "metadata",
      before: previous,
      after: doc.toString(),
    });
  const graph = scan(p);
  for (const issue of graph.issues)
    conflicts.push({
      path: issue.path,
      message: `Cannot check template ID collisions: ${issue.message}`,
    });
  const destinations = new Set<string>([metaPath, p.manifestPath]);
  function file(path: string, asset: Asset, kind: "node" | "skill") {
    path = bounded(p.root, path);
    if (destinations.has(path)) fail(`Duplicate template destination: ${path}`);
    destinations.add(path);
    const short = portable(relative(p.root, path));
    if (existsSync(path)) {
      if (
        !lstatSync(path).isFile() ||
        readFileSync(path, "utf8") !== asset.content
      )
        conflicts.push({
          path: short,
          message: "Existing file differs; templates never overwrite files",
        });
      else unchanged.push(short);
    } else
      changes.push({ path: short, kind, before: null, after: asset.content });
  }
  for (const asset of t.nodes) {
    const dest = mutablePath(p, join(p.roots[0], asset.path));
    const id = parseNode(
      bounded(t.directory, join("nodes", asset.path)),
      t.directory,
    ).data.id;
    if (graph.byId.get(id)?.some((n) => n.path !== dest))
      conflicts.push({
        path: portable(relative(p.root, dest)),
        message: `Node ID already exists elsewhere: ${id}`,
      });
    file(dest, asset, "node");
  }
  for (const asset of t.skills) {
    const dest = resolve(p.root, asset.path);
    if (p.roots.some((root) => inside(root, dest)))
      fail("Template skills must live outside configured knowledge roots");
    file(dest, asset, "skill");
  }
  return {
    template: t.name,
    additions,
    changes,
    unchanged,
    conflicts,
    applied: false,
  };
}
export function applyTemplate(
  p: Project,
  source: string,
  apply = false,
  options: SourceOptions = {},
) {
  return withGitSource(
    source,
    options,
    (directory, repositoryRoot, provenance) => {
      const result = applyLoadedTemplate(
        p,
        loadTemplate(directory, repositoryRoot),
        apply,
      );
      return { ...result, ...(provenance ? { source: provenance } : {}) };
    },
  );
}
function applyLoadedTemplate(p: Project, t: Template, apply: boolean) {
  if (!apply) return planTemplate(p, t);
  const lockPath = bounded(p.root, ".knowledge/template.lock");
  const lock = openSync(lockPath, "wx");
  try {
    // Re-read project state under the template lock; other editing tools have their own locks.
    p = project(p.root);
    const plan = planTemplate(p, t);
    if (plan.conflicts.length) return plan;
    const written: { path: string; content: string }[] = [];
    try {
      for (const change of plan.changes.filter((c) => c.kind !== "metadata")) {
        const path = bounded(p.root, change.path);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, change.after, { flag: "wx" });
        written.push({ path, content: change.after });
      }
      const meta = plan.changes.find((c) => c.kind === "metadata");
      if (meta)
        atomicWrite(bounded(p.root, meta.path), meta.before!, meta.after);
    } catch (error) {
      // Undo only files this operation created and which nobody has subsequently changed.
      for (const file of written.reverse()) {
        if (
          existsSync(file.path) &&
          !lstatSync(file.path).isSymbolicLink() &&
          readFileSync(file.path, "utf8") === file.content
        )
          rmSync(file.path);
      }
      throw error;
    }
    return { ...plan, applied: true };
  } finally {
    closeSync(lock);
    rmSync(lockPath);
  }
}
