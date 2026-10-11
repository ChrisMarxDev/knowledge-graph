import { createHash } from "node:crypto";
import {
  constants,
  openSync,
  closeSync,
  readSync,
  fstatSync,
  realpathSync,
  readdirSync,
  lstatSync,
} from "node:fs";
import { basename, resolve, relative, isAbsolute } from "node:path";
import {
  doctor,
  links,
  object,
  project,
  scan,
  sections,
  type Graph,
  type Project,
} from "./core.js";

import { sources, sourceFiles } from "./sources.js";

const text = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
export function explorerSnapshot(p: Project, g: Graph = scan(p)) {
  const nodes = g.nodes.map((n) => ({
    key: n.relativePath,
    id: text(n.data.id),
    title: text(n.data.title, basename(n.path)),
    type: text(n.data.type, "Unspecified"),
    description: text(n.data.description),
    dimensions: Object.fromEntries(
      Object.entries(object(n.data.dimensions) ? n.data.dimensions : {}).map(
        ([k, v]) => [k, strings(v)],
      ),
    ),
    files: strings(n.data.files),
    sources: sources(n),
    sections: sections(n).map(({ title, id, depth, start }) => ({
      title,
      id,
      depth,
      start,
    })),
    revision: createHash("sha256").update(n.raw).digest("hex").slice(0, 16),
  }));
  const edges = g.nodes.flatMap((n) =>
    links(n).map((l, i) => {
      const [id, anchor, ...extra] = l.target.split("#");
      const targets = g.byId.get(id) ?? [];
      const target = targets.length === 1 ? targets[0] : undefined;
      const matching =
        target && anchor ? sections(target).filter((s) => s.id === anchor) : [];
      const status = !targets.length
        ? "missing"
        : targets.length > 1
          ? "ambiguous"
          : anchor !== undefined && (matching.length !== 1 || extra.length > 0)
            ? "missing-section"
            : "resolved";
      return {
        key: `${n.relativePath}:${i}`,
        source: n.relativePath,
        target: target?.relativePath ?? null,
        targetId: l.target,
        relation: l.relation,
        anchor: anchor ?? null,
        status,
      };
    }),
  );
  const data = {
    project: basename(p.root),
    nodes,
    edges,
    issues: doctor(p, g),
    meta: p.meta,
  };
  const version = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
  return { ...data, version };
}
export type ExplorerSnapshot = ReturnType<typeof explorerSnapshot>;
export function readExplorerNode(
  p: Project,
  key: string,
  start = 0,
  g = scan(p),
) {
  const node = g.nodes.find((n) => n.relativePath === key);
  if (!node) throw new Error("Node no longer exists or cannot be parsed");
  const length = 48000;
  return {
    key,
    body: node.body.slice(start, start + length),
    start,
    next: start + length < node.body.length ? start + length : null,
  };
}
/** Only explicitly referenced regular text files inside the project may be previewed. */
export function readReferencedFile(
  p: Project,
  key: string,
  start = 0,
  g = scan(p),
) {
  if (
    !g.nodes.some((n) =>
      [...strings(n.data.files), ...sourceFiles(n)].includes(key),
    )
  )
    throw new Error("File is not referenced by this graph");
  const root = realpathSync(p.root);
  const requested = resolve(p.root, key);
  const inside = (path: string) => {
    const r = relative(root, path);
    return r !== ".." && !r.startsWith("../") && !isAbsolute(r);
  };
  if (!inside(requested) || !inside(realpathSync(requested)))
    throw new Error("File preview is limited to the project directory");
  // Open the resolved target and verify the descriptor, closing the path/symlink race on Linux.
  const fd = openSync(
    realpathSync(requested),
    constants.O_RDONLY | constants.O_NONBLOCK,
  );
  try {
    if (
      process.platform === "linux" &&
      !inside(realpathSync(`/proc/self/fd/${fd}`))
    )
      throw new Error("File escaped project directory");
    const stat = fstatSync(fd);
    if (!stat.isFile()) throw new Error("Only regular files can be previewed");
    const bytes = Buffer.alloc(48000);
    const count = readSync(fd, bytes, 0, bytes.length, start);
    const chunk = bytes.subarray(0, count);
    if (chunk.includes(0)) throw new Error("Binary files cannot be previewed");
    // Do not split a UTF-8 character between pages.
    let end = count;
    if (start + count < stat.size) {
      let lead = count - 1;
      while (lead >= 0 && (chunk[lead] & 0xc0) === 0x80) lead--;
      if (lead >= 0) {
        const b = chunk[lead];
        const needed = b < 128 ? 1 : b < 224 ? 2 : b < 240 ? 3 : 4;
        if (count - lead < needed) end = lead;
      }
    }
    const content = new TextDecoder("utf-8", { fatal: true }).decode(
      chunk.subarray(0, end),
    );
    return {
      path: key,
      content,
      start,
      next: start + end < stat.size ? start + end : null,
      size: stat.size,
      backlinks: g.nodes
        .filter((n) =>
          [...strings(n.data.files), ...sourceFiles(n)].includes(key),
        )
        .map((n) => n.relativePath),
    };
  } finally {
    closeSync(fd);
  }
}
export function loadExplorer(root: string) {
  const p = project(root);
  return { p, g: scan(p) };
}

/** In-memory read cache. Stat signatures avoid reparsing unchanged Markdown on every poll. */
export function createExplorerReader(root: string) {
  let cached:
    | { signature: string; p: Project; g: Graph; snapshot: ExplorerSnapshot }
    | undefined;
  return () => {
    const p = project(root);
    const signatures: string[] = [];
    const visit = (path: string) => {
      try {
        const stat = lstatSync(path, { bigint: true });
        signatures.push(
          `${path}:${stat.ino}:${stat.mode}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`,
        );
        if (stat.isDirectory() && !stat.isSymbolicLink()) {
          for (const entry of readdirSync(path, { withFileTypes: true }).sort(
            (a, b) => a.name.localeCompare(b.name),
          )) {
            if ([".git", "node_modules", ".knowledge"].includes(entry.name))
              continue;
            if (
              entry.isDirectory() ||
              entry.isSymbolicLink() ||
              entry.name.endsWith(".md")
            )
              visit(resolve(path, entry.name));
          }
        }
      } catch {
        signatures.push(`${path}:unavailable`);
      }
    };
    p.roots.forEach(visit);
    const signature = JSON.stringify([p.manifest, p.meta, signatures]);
    if (!cached || cached.signature !== signature) {
      const g = scan(p);
      cached = { signature, p, g, snapshot: explorerSnapshot(p, g) };
    }
    return cached;
  };
}
