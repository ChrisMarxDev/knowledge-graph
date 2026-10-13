import { metadataColors } from "./colors.js";
import { randomUUID } from "node:crypto";
import { sources, analyzeSources } from "./sources.js";
import { analyzeSchema } from "./schema.js";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  openSync,
  closeSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parseDocument, stringify, isMap } from "yaml";
import { fromMarkdown } from "mdast-util-from-markdown";

export type Data = Record<string, any>;
export type Issue = {
  code: string;
  severity: "error" | "warning";
  path: string;
  message: string;
};
export type Project = {
  root: string;
  manifestPath: string;
  manifest: Data;
  roots: string[];
  metaPath: string;
  meta: Data;
};
export type Link = { relation: string; target: string };
export type Node = {
  path: string;
  relativePath: string;
  raw: string;
  data: Data;
  body: string;
  prefix: string;
  suffix: string;
  yaml: string;
  doc: ReturnType<typeof parseDocument>;
};
export type Graph = {
  nodes: Node[];
  byId: Map<string, Node[]>;
  issues: Issue[];
};
export const object = (x: unknown): x is Data =>
  !!x && typeof x === "object" && !Array.isArray(x);
export const portable = (p: string) => p.split(sep).join("/");
export function fail(message: string): never {
  throw new Error(message);
}
export function readYaml(path: string): Data {
  const doc = parseDocument(readFileSync(path, "utf8"));
  if (doc.errors.length)
    fail(`${path}: ${doc.errors.map((e) => e.message).join("; ")}`);
  const data = doc.toJS();
  if (!object(data)) fail(`${path}: expected a YAML mapping`);
  return data;
}
export function project(start = process.cwd()): Project {
  let root = resolve(start);
  while (!existsSync(join(root, ".knowledge", "config.yaml"))) {
    const parent = dirname(root);
    if (parent === root)
      fail("No .knowledge/config.yaml found. Run kw init first.");
    root = parent;
  }
  const manifestPath = join(root, ".knowledge", "config.yaml");
  const manifest = readYaml(manifestPath);
  if (manifest.version !== 1) fail("Unsupported manifest version (expected 1)");
  if (
    !Array.isArray(manifest.roots) ||
    !manifest.roots.length ||
    manifest.roots.some((r: unknown) => typeof r !== "string")
  )
    fail("Manifest roots must be a nonempty list of directory paths");
  if (typeof manifest.meta !== "string")
    fail("Manifest meta must be a file path");
  const metaPath = resolve(root, manifest.meta);
  const meta = readYaml(metaPath);
  for (const key of ["types", "dimensions", "relations"])
    if (!object(meta[key])) fail(`Metadata ${key} must be a mapping`);
  return {
    root,
    manifestPath,
    manifest,
    roots: manifest.roots.map((r: string) => resolve(root, r)),
    metaPath,
    meta,
  };
}
export function init(root: string) {
  root = resolve(root);
  const config = join(root, ".knowledge", "config.yaml");
  const meta = join(root, "knowledge", "meta.yaml");
  if (existsSync(config) || existsSync(meta))
    fail(
      "Configuration or metadata already exists; init will not overwrite it",
    );
  mkdirSync(join(root, "knowledge", "nodes"), { recursive: true });
  mkdirSync(dirname(config), { recursive: true });
  writeFileSync(
    config,
    stringify({
      version: 1,
      roots: ["knowledge/nodes"],
      meta: "knowledge/meta.yaml",
    }),
    { flag: "wx" },
  );
  writeFileSync(
    meta,
    "# Define your own vocabulary. Descriptions help agents choose it.\n" +
      stringify({ types: {}, dimensions: {}, relations: {} }),
    { flag: "wx" },
  );
  const ignore = join(root, ".knowledge", ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "cache/\n*.lock\n");
  return { root, config, meta };
}
export function parseNode(path: string, root: string): Node {
  const raw = readFileSync(path, "utf8");
  const match = /^(\uFEFF?---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/.exec(raw);
  if (!match) fail("Missing YAML frontmatter");
  const doc = parseDocument(match[2], { keepSourceTokens: true });
  if (doc.errors.length) fail(doc.errors.map((e) => e.message).join("; "));
  const data = doc.toJS();
  if (!object(data)) fail("Frontmatter must be a mapping");
  return {
    path,
    relativePath: portable(relative(root, path)),
    raw,
    data,
    body: raw.slice(match[0].length),
    prefix: match[1],
    yaml: match[2],
    suffix: match[3],
    doc,
  };
}
export function scan(p: Project): Graph {
  const nodes: Node[] = [],
    issues: Issue[] = [],
    seen = new Set<string>();
  const report = (path: string, message: string) =>
    issues.push({
      code: "PARSE_ERROR",
      severity: "error",
      path: portable(relative(p.root, path)),
      message,
    });
  function visit(path: string) {
    if (seen.has(path)) return;
    seen.add(path);
    try {
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        report(
          path,
          "Symbolic links are not scanned; configure the real directory explicitly",
        );
        return;
      }
      if (stat.isDirectory()) {
        for (const name of readdirSync(path).sort())
          if (![".git", "node_modules", ".knowledge"].includes(name))
            visit(join(path, name));
      } else if (path.endsWith(".md")) nodes.push(parseNode(path, p.root));
    } catch (e) {
      report(path, (e as Error).message);
    }
  }
  for (const root of p.roots) visit(root);
  nodes.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const byId = new Map<string, Node[]>();
  for (const node of nodes)
    if (typeof node.data.id === "string")
      byId.set(node.data.id, [...(byId.get(node.data.id) ?? []), node]);
  return { nodes, byId, issues };
}
export function getNode(g: Graph, id: string): Node {
  const matches =
    g.byId.get(id) ??
    g.nodes.filter((n) => n.relativePath === id || n.path === resolve(id));
  if (matches.length !== 1)
    fail(matches.length ? `Ambiguous node: ${id}` : `Node not found: ${id}`);
  return matches[0];
}
export function links(n: Node): Link[] {
  return Array.isArray(n.data.links)
    ? n.data.links.filter(
        (l: any) =>
          object(l) &&
          typeof l.relation === "string" &&
          typeof l.target === "string",
      )
    : [];
}
function nodeText(n: any): string {
  return n.value ?? (n.children ?? []).map(nodeText).join("");
}
export function sections(node: Node) {
  const headings = fromMarkdown(node.body).children.filter(
    (n) => n.type === "heading",
  );
  return headings.map((heading, i) => {
    const text = nodeText(heading);
    const anchor = /\s*\{#([A-Za-z0-9_-]+)\}\s*$/.exec(text);
    const end =
      headings.slice(i + 1).find((h) => h.depth <= heading.depth)?.position
        ?.start.offset ?? node.body.length;
    return {
      title: text.replace(/\s*\{#[A-Za-z0-9_-]+\}\s*$/, ""),
      id: anchor?.[1],
      depth: heading.depth,
      start: heading.position!.start.offset!,
      end,
    };
  });
}
export function card(n: Node) {
  return {
    id: n.data.id ?? null,
    path: n.relativePath,
    title: n.data.title ?? null,
    type: n.data.type ?? null,
    description: n.data.description ?? "",
    dimensions: n.data.dimensions ?? {},
    files: n.data.files ?? [],
    sources: sources(n),
  };
}
export function doctor(p: Project, g: Graph): Issue[] {
  const issues = [...g.issues];
  const { colorWarning } = metadataColors(p.meta);
  if (colorWarning)
    issues.push({
      code: "INVALID_COLOR",
      severity: "warning",
      path: portable(relative(p.root, p.metaPath)),
      message: colorWarning,
    });
  if (
    p.manifest.guidance !== undefined &&
    (!Array.isArray(p.manifest.guidance) || p.manifest.guidance.length)
  )
    issues.push({
      code: "OBSOLETE_GUIDANCE",
      severity: "warning",
      path: portable(relative(p.root, p.manifestPath)),
      message:
        "guidance is no longer used. Move file associations into node files/sources and retrieve with query --file; remove guidance after reviewing its intent.",
    });

  for (const n of g.nodes) {
    issues.push(...analyzeSources(p, n));
    const add = (
      code: string,
      message: string,
      severity: Issue["severity"] = "error",
    ) => issues.push({ code, message, severity, path: n.relativePath });
    if (
      typeof n.data.id !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(n.data.id)
    )
      add(
        "INVALID_ID",
        "id must be a nonempty identifier using letters, numbers, underscores or hyphens",
      );
    else if (g.byId.get(n.data.id)!.length > 1)
      add("DUPLICATE_ID", `Duplicate ID: ${n.data.id}`);
    if (typeof n.data.title !== "string" || !n.data.title.trim())
      add("MISSING_TITLE", "title must be nonempty text");
    if (n.data.type !== undefined && typeof n.data.type !== "string")
      add("INVALID_TYPE", "type must be text");
    else if (n.data.type && !Object.hasOwn(p.meta.types, n.data.type))
      add(
        "UNDECLARED_TYPE",
        `Type is absent from metadata: ${n.data.type}`,
        "warning",
      );
    if (
      n.data.description !== undefined &&
      typeof n.data.description !== "string"
    )
      add("INVALID_DESCRIPTION", "description must be text");
    if (n.data.dimensions !== undefined && !object(n.data.dimensions))
      add("INVALID_DIMENSIONS", "dimensions must be a mapping");
    if (object(n.data.dimensions))
      for (const [key, value] of Object.entries(n.data.dimensions)) {
        if (!Object.hasOwn(p.meta.dimensions, key))
          add(
            "UNDECLARED_DIMENSION",
            `Dimension is absent from metadata: ${key}`,
            "warning",
          );
        if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
          add(
            "INVALID_DIMENSION_VALUE",
            `${key} must be a list of text values`,
          );
      }
    if (
      n.data.links !== undefined &&
      (!Array.isArray(n.data.links) || n.data.links.length !== links(n).length)
    )
      add("INVALID_LINKS", "links must contain relation and target strings");
    for (const l of links(n)) {
      if (!Object.hasOwn(p.meta.relations, l.relation))
        add(
          "UNDECLARED_RELATION",
          `Relation is absent from metadata: ${l.relation}`,
          "warning",
        );
      const [id, anchor, ...extra] = l.target.split("#");
      const targets = g.byId.get(id) ?? [];
      if (!targets.length) add("DANGLING_ID", `Unresolved link: ${l.target}`);
      else if (targets.length > 1)
        add("AMBIGUOUS_TARGET", `Target ID is duplicated: ${id}`);
      else if (
        extra.length ||
        (anchor !== undefined &&
          !sections(targets[0]).some((s) => s.id === anchor))
      )
        add("DANGLING_SECTION", `Unresolved section: ${l.target}`);
    }
    const anchors = sections(n)
      .map((s) => s.id)
      .filter(Boolean);
    if (new Set(anchors).size !== anchors.length)
      add(
        "DUPLICATE_SECTION_ID",
        "Explicit section IDs must be unique within the file",
      );
    if (
      n.data.files !== undefined &&
      (!Array.isArray(n.data.files) ||
        n.data.files.some((f: any) => typeof f !== "string"))
    )
      add("INVALID_FILES", "files must be a list of project-relative paths");
    else
      for (const file of n.data.files ?? [])
        if (!existsSync(resolve(p.root, file)))
          add("BROKEN_FILE_LINK", `File does not exist: ${file}`, "warning");
  }
  return [...issues, ...analyzeSchema(p, g)];
}
export function mutablePath(p: Project, path: string): string {
  const full = resolve(p.root, path);
  let parent = full;
  while (!existsSync(parent)) parent = dirname(parent);
  const real = resolve(realpathSync(parent), relative(parent, full));
  if (
    !p.roots.some((root) => {
      const r = existsSync(root) ? realpathSync(root) : root;
      return real.startsWith(r + sep);
    })
  )
    fail("Node writes must stay inside configured knowledge roots");
  if (!full.endsWith(".md")) fail("Knowledge nodes must use .md filenames");
  if (existsSync(full) && lstatSync(full).isSymbolicLink())
    fail("Refusing to edit a symbolic link");
  return full;
}
export function atomicWrite(path: string, previous: string, next: string) {
  const lockPath = path + ".kw-lock";
  let lock: number;
  try {
    lock = openSync(lockPath, "wx");
  } catch {
    fail(`File is locked: ${path}`);
  }
  const tmp = path + `.kw-${randomUUID()}.tmp`;
  try {
    if (readFileSync(path, "utf8") !== previous)
      fail(`File changed since reading: ${path}`);
    writeFileSync(tmp, next, { mode: statSync(path).mode });
    if (readFileSync(path, "utf8") !== previous)
      fail(`File changed while preparing edit: ${path}`);
    renameSync(tmp, path);
  } finally {
    rmSync(tmp, { force: true });
    closeSync(lock!);
    rmSync(lockPath, { force: true });
  }
}
// Patch only changed top-level YAML pairs. Preserve the body and unrelated pairs byte-for-byte.
export function edit(n: Node, changes: Data, dryRun = false) {
  if (!isMap(n.doc.contents)) fail("Frontmatter must be a mapping");
  const edits: { start: number; end: number; text: string }[] = [];
  const eol = n.prefix.includes("\r\n") ? "\r\n" : "\n";
  for (const [key, value] of Object.entries(changes)) {
    const pair = n.doc.contents.items.find(
      (pair) => String((pair.key as any)?.value) === key,
    );
    const text =
      stringify({ [key]: value })
        .trimEnd()
        .replace(/\n/g, eol) + eol;
    if (pair) {
      const start = (pair.key as any).range?.[0];
      const end =
        (pair.value as any)?.range?.[2] ?? (pair.key as any).range?.[2];
      if (start === undefined || end === undefined)
        fail(`Cannot safely edit field ${key}`);
      // Whole-line block pairs only; flow mappings require manual editing.
      if (n.yaml.slice(n.yaml.lastIndexOf("\n", start - 1) + 1, start).trim())
        fail("Editing flow-style frontmatter is not supported");
      edits.push({ start, end, text });
    } else
      edits.push({
        start: n.yaml.length,
        end: n.yaml.length,
        text: (n.yaml.endsWith("\n") ? "" : eol) + text,
      });
  }
  let yaml = n.yaml;
  for (const e of edits.sort((a, b) => b.start - a.start))
    yaml = yaml.slice(0, e.start) + e.text + yaml.slice(e.end);
  const checked = parseDocument(yaml);
  if (checked.errors.length) fail("Edit would produce invalid YAML");
  const next = n.prefix + yaml.replace(/\r?\n$/, "") + n.suffix + n.body;
  if (!dryRun) atomicWrite(n.path, n.raw, next);
  return { path: n.relativePath, before: n.raw, after: next, applied: !dryRun };
}
export function create(p: Project, path: string, data: Data) {
  const full = mutablePath(p, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, `---\n${stringify(data)}---\n\n# ${data.title}\n`, {
    flag: "wx",
  });
  return { id: data.id, path: portable(relative(p.root, full)) };
}
export type Filter = {
  field?: string;
  op: "eq" | "in" | "exists" | "and" | "or" | "not";
  value?: any;
  filters?: Filter[];
};
export function matches(n: Node, f: Filter): boolean {
  if (!object(f)) fail("Filter must be an object");
  if (f.op === "and" || f.op === "or") {
    if (!Array.isArray(f.filters)) fail(`${f.op} requires filters`);
    const results = f.filters.map((x) => matches(n, x));
    return f.op === "and" ? results.every(Boolean) : results.some(Boolean);
  }
  if (f.op === "not") {
    if (f.filters?.length !== 1) fail("not requires exactly one filter");
    return !matches(n, f.filters[0]);
  }
  if (!["eq", "in", "exists"].includes(f.op) || typeof f.field !== "string")
    fail("Invalid filter operator or field");
  const key = f.field.startsWith("dimensions.") ? f.field.slice(11) : f.field;
  const record = f.field.startsWith("dimensions.") ? n.data.dimensions : n.data;
  const value =
    object(record) && Object.hasOwn(record, key) ? record[key] : undefined;
  if (f.op === "exists") {
    if (typeof f.value !== "boolean") fail("exists requires a boolean value");
    return (value !== undefined) === f.value;
  }
  if (f.op === "in" && !Array.isArray(f.value))
    fail("in requires an array value");
  const actual = Array.isArray(value) ? value : [value];
  return (
    value !== undefined &&
    actual.some((v) => (f.op === "eq" ? v === f.value : f.value.includes(v)))
  );
}
