#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { parseDocument } from "yaml";
import { minimatch } from "minimatch";
import {
  atomicWrite,
  card,
  create,
  doctor,
  edit,
  fail,
  getNode,
  init,
  links,
  matches,
  mutablePath,
  object,
  parseNode,
  portable,
  project,
  scan,
  sections,
  traverse,
  type Data,
  type Filter,
  type Node,
  type Project,
} from "./core.js";
import { keywordSearch, withQmd } from "./qmd.js";
import { sources, sourceFiles, sourceError, type Source } from "./sources.js";
import { listTemplates, showTemplate, applyTemplate } from "./templates.js";

const cli = new Command()
  .exitOverride()
  .name("kw")
  .version("0.1.0")
  .description(
    "File-based knowledge graph CLI. Types and dimensions are project-defined.",
  )
  .option(
    "--project <directory>",
    "Find configuration from this directory",
    process.cwd(),
  )
  .option("--json", "Emit one JSON result; diagnostics stay on stderr");
const int = (value: string) => {
  if (!/^\d+$/.test(value) || Number(value) > 1000000)
    throw new InvalidArgumentError("Expected an integer between 0 and 1000000");
  return Number(value);
};
const collect = (v: string, old: string[]) => [...old, v];
const load = () => project(cli.opts().project);
function out(data: any) {
  if (cli.opts().json) console.log(JSON.stringify({ ok: true, ...data }));
  else if (data.content !== undefined) {
    console.log(data.content);
    if (data.nextLine)
      console.error(`Continue at --from-line ${data.nextLine}`);
    if (data.truncated)
      console.error(
        "Output truncated; raise --max-bytes if a line does not fit.",
      );
  } else console.log(JSON.stringify(data, null, 2));
}
function positive(value: string) {
  const n = int(value);
  if (n < 1) throw new InvalidArgumentError("Expected a positive integer");
  return n;
}
function paging(command: Command) {
  return command
    .option("--limit <count>", "Maximum records", positive, 20)
    .option("--offset <count>", "Skip records", int, 0);
}
function page(items: any[], opts: Data) {
  return {
    results: items.slice(opts.offset, opts.offset + opts.limit),
    total: items.length,
    nextOffset:
      opts.offset + opts.limit < items.length ? opts.offset + opts.limit : null,
  };
}
function graph() {
  const p = load();
  return { p, g: scan(p) };
}
function writable(p: Project, n: Node) {
  mutablePath(p, n.path);
  return n;
}
function dimensions(values: string[]): Data {
  const result: Data = Object.create(null);
  for (const value of values) {
    const at = value.indexOf("=");
    if (at < 1) fail("Dimension must be name=value");
    const key = value.slice(0, at);
    result[key] = [...(result[key] ?? []), value.slice(at + 1)];
  }
  return result;
}
function filterOptions(command: Command) {
  return command
    .option("--type <type>", "Exact type")
    .option(
      "--dimension <name=value>",
      "Dimension membership; repeat for AND",
      collect,
      [],
    )
    .option(
      "--missing <field>",
      "Field must be absent; dimensions.NAME supported",
    )
    .option("--filter <json>", "Filter AST: eq, in, exists, and, or, not");
}
function filtered(nodes: Node[], opts: Data) {
  const filters: Filter[] = [];
  if (opts.type) filters.push({ field: "type", op: "eq", value: opts.type });
  for (const [key, values] of Object.entries(dimensions(opts.dimension ?? [])))
    for (const value of values as string[])
      filters.push({ field: `dimensions.${key}`, op: "eq", value });
  if (opts.missing)
    filters.push({ field: opts.missing, op: "exists", value: false });
  if (opts.filter) filters.push(JSON.parse(opts.filter));
  // Validate filters even if there are no nodes or no matches.
  for (const filter of filters) matches({ data: {} } as Node, filter);
  return nodes.filter((n) => filters.every((f) => matches(n, f)));
}
cli
  .command("init")
  .description(
    "Initialize configuration and an empty vocabulary; never overwrite existing knowledge",
  )
  .action(() => out(init(cli.opts().project)));
const templates = cli
  .command("template")
  .description("Inspect and apply optional knowledge setups");
templates
  .command("list")
  .description("List bundled templates")
  .action(() => out({ templates: listTemplates() }));
templates
  .command("show <source>")
  .description(
    "Show a bundled, local, or Git template/knowledge folder, including contents",
  )
  .option("--ref <ref>", "Git branch, tag, or commit (default HEAD)")
  .option(
    "--folder <path>",
    "Folder inside the Git repository (default repository root)",
  )
  .action((source, opts) => out(showTemplate(source, opts)));
templates
  .command("apply <source>")
  .description(
    "Add vocabulary, nodes, and skills to an initialized project; preview by default",
  )
  .option("--ref <ref>", "Git branch, tag, or commit (default HEAD)")
  .option(
    "--folder <path>",
    "Folder inside the Git repository (default repository root)",
  )
  .option("--apply", "Write additions when there are no conflicts")
  .option("--dry-run", "Preview additions and conflicts; overrides --apply")
  .action((source, opts) => {
    const result = applyTemplate(
      load(),
      source,
      !!opts.apply && !opts.dryRun,
      opts,
    );
    out(result);
    if (result.conflicts.length) process.exitCode = 1;
  });
const ids = cli
  .command("id")
  .description("Generate and assign stable node IDs");
ids.command("generate").action(() => out({ id: randomUUID() }));
ids
  .command("assign <file>")
  .option("--dry-run")
  .action((file, opts) => {
    const p = load(),
      n = parseNode(mutablePath(p, file), p.root);
    if (n.data.id !== undefined)
      fail("File already has an id; assignment will not replace it");
    out(edit(n, { id: randomUUID() }, opts.dryRun));
  });
cli
  .command("create <file>")
  .requiredOption("--title <title>")
  .option("--type <type>")
  .option("--description <text>", "", "")
  .option(
    "--dimension <name=value>",
    "Repeat for multiple dimensions/values",
    collect,
    [],
  )
  .action((file, opts) => {
    const data = {
      id: randomUUID(),
      title: opts.title,
      ...(opts.type ? { type: opts.type } : {}),
      description: opts.description,
      dimensions: dimensions(opts.dimension),
      links: [],
      files: [],
    };
    out(create(load(), file, data));
  });
filterOptions(
  paging(
    cli
      .command("query")
      .description(
        "Filter current files directly; no database or model required",
      ),
  ),
).action((opts) => {
  const { g } = graph();
  out({ ...page(filtered(g.nodes, opts).map(card), opts), warnings: g.issues });
});
paging(
  cli
    .command("map")
    .description("Discover vocabulary and a bounded list of node descriptions"),
).action((opts) => {
  const { p, g } = graph();
  const entries = Object.entries(p.meta).flatMap(([category, entries]) =>
    object(entries)
      ? Object.entries(entries).map(([name, definition]) => ({
          category,
          name,
          definition,
        }))
      : [],
  );
  out({
    instructions: [
      "Use query for exact dimensions, search for text, read for sections, related for graph traversal.",
      "Use doctor to inspect unresolved references. Vocabulary is defined in the metadata file.",
    ],
    metaPath: portable(relative(p.root, p.metaPath)),
    vocabulary: page(entries, opts),
    nodes: page(g.nodes.map(card), opts),
    warnings: g.issues,
  });
});
cli
  .command("read <id>")
  .option("--detail <level>", "overview or full", "full")
  .option("--section <anchor-or-heading>")
  .option("--from-line <line>", "First body line, 1-based", int, 1)
  .option("--lines <count>", "Maximum lines", int, 200)
  .option("--max-bytes <bytes>", "Maximum UTF-8 body bytes", int, 16000)
  .action((id, opts) => {
    const { g } = graph();
    const [nodeId, anchor] = id.split("#");
    const n = getNode(g, nodeId);
    if (!["overview", "full"].includes(opts.detail))
      fail("detail must be overview or full");
    if (opts.detail === "overview") {
      out({
        node: card(n),
        sections: sections(n),
        links: links(n),
        warnings: g.issues,
      });
      return;
    }
    if (opts.fromLine < 1) fail("from-line must be at least 1");
    let content = n.body;
    if (opts.section || anchor) {
      const selected = sections(n).filter(
        (s) =>
          s.id === (opts.section ?? anchor) ||
          s.title === (opts.section ?? anchor),
      );
      if (selected.length !== 1)
        fail(
          selected.length
            ? "Section heading is ambiguous; use its explicit ID"
            : "Section not found",
        );
      content = content.slice(selected[0].start, selected[0].end);
    }
    const lines = content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const begin = opts.fromLine - 1;
    let end = begin,
      bytes = 0,
      output = "";
    while (
      end < lines.length &&
      end - begin < opts.lines &&
      bytes + Buffer.byteLength(lines[end]) <= opts.maxBytes
    ) {
      output += lines[end];
      bytes += Buffer.byteLength(lines[end++]);
    }
    out({
      node: card(n),
      content: output,
      totalLines: lines.length,
      nextLine: end < lines.length ? end + 1 : null,
      truncated: end < lines.length,
    });
  });
cli
  .command("related <id>")
  .option("--direction <direction>", "outgoing, incoming, or both", "both")
  .option("--depth <count>", "Maximum hops", int, 1)
  .option("--relation <name>")
  .option("--limit <count>", "Maximum neighboring nodes", int, 50)
  .action((id, opts) => {
    if (!["incoming", "outgoing", "both"].includes(opts.direction))
      fail("Invalid direction");
    const { g } = graph();
    out({
      ...traverse(g, id, opts.depth, opts.direction, opts.relation, opts.limit),
      warnings: g.issues,
    });
  });
cli
  .command("link <source> <relation> <target>")
  .option("--dry-run")
  .action((source, relation, target, opts) => {
    const { p, g } = graph();
    const n = writable(p, getNode(g, source)),
      [id, anchor, ...extra] = target.split("#");
    const dest = getNode(g, id);
    if (extra.length) fail("Target must contain at most one section separator");
    if (typeof dest.data.id !== "string" || !dest.data.id)
      fail("Target node needs an ID before linking");
    target = dest.data.id + (anchor === undefined ? "" : `#${anchor}`);
    if (anchor !== undefined && !sections(dest).some((s) => s.id === anchor))
      fail("Target section ID does not exist");
    if (
      n.data.links !== undefined &&
      (!Array.isArray(n.data.links) || links(n).length !== n.data.links.length)
    )
      fail("Repair malformed links before adding one");
    if (links(n).some((l) => l.relation === relation && l.target === target)) {
      out({ changed: false });
      return;
    }
    out(
      edit(
        n,
        { links: [...(n.data.links ?? []), { relation, target }] },
        opts.dryRun,
      ),
    );
  });
cli
  .command("unlink <source> <relation> <target>")
  .option("--dry-run")
  .action((source, relation, target, opts) => {
    const { p, g } = graph();
    const n = writable(p, getNode(g, source));
    if (!Array.isArray(n.data.links)) fail("links must be a list");
    out(
      edit(
        n,
        {
          links: n.data.links.filter(
            (l: any) => !(l?.relation === relation && l?.target === target),
          ),
        },
        opts.dryRun,
      ),
    );
  });
const sourceCommands = cli
  .command("source")
  .description(
    "Manage evidence references separately from graph relationships",
  );
sourceCommands.command("list <id>").action((id) => {
  const { p, g } = graph();
  const n = getNode(g, id);
  out({
    id: n.data.id,
    sources: sources(n),
    issues: doctor(p, g).filter(
      (i) => i.path === n.relativePath && i.code.includes("SOURCE"),
    ),
  });
});
sourceCommands
  .command("add <id> <kind> <target>")
  .description("Add or update a URL, project file, or bibliographic reference")
  .option("--title <text>")
  .option("--locator <text>", "Section, page, or other human-readable location")
  .option("--note <text>", "What this source supports")
  .option("--dry-run")
  .action((id, kind, target, opts) => {
    const { p, g } = graph(),
      n = writable(p, getNode(g, id));
    if (
      n.data.sources !== undefined &&
      (!Array.isArray(n.data.sources) ||
        n.data.sources.some((s: unknown) => sourceError(s)))
    )
      fail("Repair malformed sources before adding a reference");
    const refs = sources(n);
    const index = refs.findIndex(
      (s) =>
        s.kind === kind && s.target === target && s.locator === opts.locator,
    );
    const ref = {
      ...(index >= 0 ? refs[index] : {}),
      kind,
      target,
      ...(opts.title !== undefined ? { title: opts.title } : {}),
      ...(opts.locator !== undefined ? { locator: opts.locator } : {}),
      ...(opts.note !== undefined ? { note: opts.note } : {}),
    };
    const error = sourceError(ref);
    if (error) fail(error);
    if (index >= 0) refs[index] = ref as Source;
    else refs.push(ref as Source);
    out(edit(n, { sources: refs }, opts.dryRun));
  });
sourceCommands
  .command("remove <id> <kind> <target>")
  .option(
    "--locator <text>",
    "Match this exact locator; omitted matches only sources without a locator",
  )
  .option("--dry-run")
  .action((id, kind, target, opts) => {
    const { p, g } = graph(),
      n = writable(p, getNode(g, id));
    if (n.data.sources !== undefined && !Array.isArray(n.data.sources))
      fail("sources must be a list");
    out(
      edit(
        n,
        {
          sources: (n.data.sources ?? []).filter(
            (s: any) =>
              !(
                object(s) &&
                s.kind === kind &&
                s.target === target &&
                s.locator === opts.locator
              ),
          ),
        },
        opts.dryRun,
      ),
    );
  });
cli
  .command("set <id> <field> <json-value>")
  .description("Set a top-level field or dimensions.NAME; value is JSON")
  .option("--dry-run")
  .action((id, field, value, opts) => {
    if (field === "id")
      fail("IDs are stable; use id assign only for files without an ID");
    if (["__proto__", "constructor", "prototype"].includes(field))
      fail("Invalid field");
    const { p, g } = graph(),
      n = writable(p, getNode(g, id));
    const parsed = JSON.parse(value);
    const changes = field.startsWith("dimensions.")
      ? {
          dimensions: {
            ...(n.data.dimensions ?? {}),
            [field.slice(11)]: parsed,
          },
        }
      : { [field]: parsed };
    out(edit(n, changes, opts.dryRun));
  });
cli
  .command("rename <id> <file>")
  .option("--dry-run")
  .action((id, file, opts) => {
    const { p, g } = graph();
    const n = writable(p, getNode(g, id));
    const dest = mutablePath(p, file);
    if (existsSync(dest)) fail("Destination already exists");
    if (!opts.dryRun) {
      mkdirSync(dirname(dest), { recursive: true });
      renameSync(n.path, dest);
    }
    out({
      id: n.data.id,
      from: n.relativePath,
      to: portable(relative(p.root, dest)),
      applied: !opts.dryRun,
      note: "ID links remain valid. Raw file-path references may need updating; run doctor.",
    });
  });
cli
  .command("doctor")
  .description(
    "Analyze graph integrity and optional vocabulary schema; never modify files",
  )
  .action(() => {
    const { p, g } = graph();
    const issues = doctor(p, g);
    out({
      issues,
      nodes: g.nodes.length,
      errors: issues.filter((i) => i.severity === "error").length,
    });
    if (issues.length) process.exitCode = 1;
  });
cli
  .command("fix")
  .option("--dry-run", "Preview repairs (the default)")
  .option(
    "--safe",
    "Apply only structural repairs: missing IDs and scalar dimension lists",
  )
  .action((opts) => {
    const { p, g } = graph();
    const changes = [];
    for (const n of g.nodes) {
      const patch: Data = {};
      if (n.data.id === undefined) patch.id = randomUUID();
      if (object(n.data.dimensions)) {
        const dims = { ...n.data.dimensions };
        let changed = false;
        for (const [key, value] of Object.entries(dims))
          if (typeof value === "string") {
            dims[key] = [value];
            changed = true;
          }
        if (changed) patch.dimensions = dims;
      }
      if (Object.keys(patch).length)
        changes.push(edit(writable(p, n), patch, !opts.safe || opts.dryRun));
    }
    out({
      changes,
      issues: doctor(p, scan(p)),
      note: "Unknown vocabulary and ambiguous references are never guessed.",
    });
  });
const meta = cli
  .command("meta")
  .description("Inspect and reconcile the vocabulary map");
meta.command("show").action(() => {
  const p = load();
  out({ path: p.metaPath, metadata: p.meta });
});
meta
  .command("sync")
  .option("--dry-run", "Preview additions (the default)")
  .option("--apply", "Register observed vocabulary with empty descriptions")
  .action((opts) => {
    const { p, g } = graph();
    const previous = readFileSync(p.metaPath, "utf8"),
      doc = parseDocument(previous);
    const additions: Data[] = [];
    function add(category: string, name: unknown) {
      if (typeof name !== "string" || !name || doc.hasIn([category, name]))
        return;
      doc.setIn([category, name], { description: "" });
      additions.push({ category, name });
    }
    for (const n of g.nodes) {
      add("types", n.data.type);
      if (object(n.data.dimensions))
        for (const key of Object.keys(n.data.dimensions))
          add("dimensions", key);
      for (const l of links(n)) add("relations", l.relation);
    }
    if (opts.apply && !opts.dryRun && additions.length)
      atomicWrite(p.metaPath, previous, doc.toString());
    out({
      additions,
      applied: !!opts.apply && !opts.dryRun,
      warning:
        "Inspect new spellings; sync does not distinguish typos from intentional vocabulary.",
      scanIssues: g.issues,
    });
  });
cli
  .command("search <text>")
  .option("--limit <count>", "Maximum matches", int, 20)
  .action(async (text, opts) => {
    if (opts.limit < 1) fail("limit must be positive");
    const { p, g } = graph(),
      results = await keywordSearch(p, text, opts.limit);
    out({
      results: results.map((r) => ({
        ...r,
        path: portable(relative(p.root, r.path)),
        id: g.nodes.find((n) => n.path === r.path)?.data.id ?? null,
      })),
      warnings: g.issues,
    });
  });
cli
  .command("index")
  .description(
    "Refresh the project-local QMD keyword index; no embeddings or model downloads",
  )
  .action(async () =>
    out({ update: await withQmd(load(), (store) => store.update()) }),
  );
cli
  .command("context [text]")
  .description(
    "Select cards by explicit file scope, text hits, and one-hop links; no semantic inference",
  )
  .option(
    "--file <path>",
    "Affected project-relative file; repeatable",
    collect,
    [],
  )
  .option(
    "--max-bytes <bytes>",
    "Budget for serialized context cards",
    int,
    12000,
  )
  .option("--limit <count>", "Maximum text candidates", int, 20)
  .action(async (text, opts) => {
    const { p, g } = graph();
    const selected = new Map<Node, { reasons: string[]; required: boolean }>();
    const unresolved: string[] = [];
    const add = (n: Node, reason: string, required = false) => {
      const prev = selected.get(n);
      selected.set(n, {
        reasons: [...(prev?.reasons ?? []), reason],
        required: required || !!prev?.required,
      });
    };
    for (const n of g.nodes)
      if (
        Array.isArray(n.data.files) &&
        n.data.files.some(
          (f: any) =>
            typeof f === "string" &&
            opts.file.some(
              (path: string) => resolve(p.root, path) === resolve(p.root, f),
            ),
        )
      )
        add(n, "file-link");
    for (const n of g.nodes)
      if (
        sourceFiles(n).some((file) =>
          opts.file.some(
            (path: string) => resolve(p.root, path) === resolve(p.root, file),
          ),
        )
      )
        add(n, "source-file");
    for (const rule of p.manifest.guidance ?? []) {
      if (
        !object(rule) ||
        !Array.isArray(rule.files) ||
        !Array.isArray(rule.nodes) ||
        rule.files.some((s: any) => typeof s !== "string") ||
        rule.nodes.some((s: any) => typeof s !== "string")
      )
        fail("guidance entries require files and nodes string lists");
      if (
        rule.files.some((glob: string) =>
          opts.file.some((f: string) =>
            minimatch(portable(relative(p.root, resolve(p.root, f))), glob),
          ),
        )
      )
        for (const id of rule.nodes) {
          const ns = g.byId.get(id);
          if (ns?.length === 1) add(ns[0], "configured-guidance", true);
          else unresolved.push(id);
        }
    }
    if (text)
      for (const result of await keywordSearch(p, text, opts.limit)) {
        const n = g.nodes.find((n) => n.path === result.path);
        if (n) add(n, "keyword-match");
      }
    for (const n of [...selected.keys()])
      for (const link of links(n)) {
        const neighbors = g.byId.get(link.target.split("#")[0]);
        if (neighbors?.length === 1)
          add(neighbors[0], `link:${n.data.id}:${link.relation}`);
        else unresolved.push(link.target);
      }
    const items = [...selected].sort(
      (a, b) => Number(b[1].required) - Number(a[1].required),
    );
    const results: Data[] = [],
      omitted: Data[] = [];
    let bytes = 2;
    for (const [n, why] of items) {
      const item = { ...card(n), ...why };
      const size =
        Buffer.byteLength(JSON.stringify(item)) + (results.length ? 1 : 0);
      if (bytes + size <= opts.maxBytes) {
        results.push(item);
        bytes += size;
      } else omitted.push({ id: n.data.id, required: why.required });
    }
    out({
      results,
      bytes,
      omitted,
      unresolved,
      budgetConflict: omitted.some((n) => n.required),
      warnings: g.issues,
      note: "Context contains discovery cards. Read selected nodes for full guidance; no completeness guarantee.",
    });
  });
cli
  .command("history <id>")
  .option("--limit <count>", "Commits", int, 10)
  .action((id, opts) => {
    const { p, g } = graph();
    const n = getNode(g, id);
    const log = execFileSync(
      "git",
      [
        "-C",
        p.root,
        "log",
        "--follow",
        `--max-count=${opts.limit}`,
        "--format=%H%x09%aI%x09%s",
        "--",
        n.relativePath,
      ],
      { encoding: "utf8" },
    );
    out({
      id: n.data.id,
      commits: log.trim()
        ? log
            .trim()
            .split("\n")
            .map((line) => {
              const [hash, date, ...subject] = line.split("\t");
              return { hash, date, subject: subject.join("\t") };
            })
        : [],
    });
  });
cli
  .command("view")
  .description("Serve the read-only knowledge explorer on localhost")
  .option("--no-open", "Do not open the default browser")
  .option(
    "--port <number>",
    "Local port (0 chooses an available port)",
    int,
    4317,
  )
  .action(async (opts) => {
    if (opts.port > 65535) throw new Error("Port must be between 0 and 65535");
    const { startExplorer } = await import("./server.js");
    const { server, url } = await startExplorer(load().root, opts.port);
    out({ url, readOnly: true });
    const stop = () => {
      server.close();
      server.closeIdleConnections();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    if (opts.open) {
      const { openBrowser } = await import("./browser.js");
      void openBrowser(url).catch((error: Error) => {
        console.error(
          `Could not open the browser: ${error.message}. Open ${url} manually.`,
        );
      });
    }
  });
cli.exitOverride();
try {
  await cli.parseAsync();
} catch (e) {
  const err = e as Error & { code?: string; exitCode?: number };
  if (err.code?.startsWith("commander.")) {
    process.exitCode = err.exitCode === 0 ? 0 : 2;
    if (process.exitCode && cli.opts().json)
      console.log(
        JSON.stringify({
          ok: false,
          error: { code: err.code, message: err.message },
        }),
      );
  } else {
    if (cli.opts().json)
      console.log(
        JSON.stringify({
          ok: false,
          error: { code: "COMMAND_FAILED", message: err.message },
        }),
      );
    else console.error(`Error: ${err.message}`);
    process.exitCode = 2;
  }
}
