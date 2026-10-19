#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";
import { stringify } from "yaml";
import {
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
  portable,
  project,
  scan,
  sections,
  type Data,
  type Filter,
  type Node,
  type Project,
} from "./core.js";
import { keywordSearch, keywordSearchMany, withQmd } from "./qmd.js";
import { queryTexts, rankQueryResults, RRF_K } from "./query.js";
import { sources, sourceFiles, sourceError, type Source } from "./sources.js";

import { readViews, getView, selectView } from "./views.js";
import { installSkill } from "./skill.js";
import { review } from "./review.js";

const cli = new Command()
  .exitOverride()
  .name("kw")
  .version(
    JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ).version,
  )
  .description(
    "File-based knowledge graph CLI. Types and dimensions are project-defined.",
  )
  .option(
    "--project <directory>",
    "Find configuration from this directory",
    process.cwd(),
  )
  .option("--json", "Emit one JSON result; diagnostics stay on stderr");
cli
  .command("skill")
  .description("Manage the bundled agent usage skill")
  .command("install")
  .description(
    "Install use-kw into the current repository's skills/use-kw folder",
  )
  .option(
    "--force",
    "Replace existing bundled files that differ; retain other files",
  )
  .option("--dry-run", "Preview files and conflicts without writing")
  .action((options) => out(installSkill(cli.opts().project, options)));

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
    console.log(
      data.frontmatter === undefined
        ? data.content
        : `---\n${stringify(data.frontmatter)}---\n${data.content}`,
    );
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
  if (!n.skill) mutablePath(p, n.path);
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
cli
  .command("id")
  .description("Generate a random UUID v4 without modifying files")
  .action(() => out({ id: randomUUID() }));
cli
  .command("review")
  .description(
    "Find knowledge affected by local Git changes; never store review state",
  )
  .option("--staged", "Compare the staged index with HEAD only")
  .option(
    "--base <ref>",
    "Compare the working tree with the merge-base of HEAD and ref",
  )
  .action((opts) => {
    const { p, g } = graph();
    out(review(p, g, opts));
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
      type: opts.type ?? "",
      description: opts.description,
      dimensions: dimensions(opts.dimension),
      links: [],
      files: [],
      sources: [],
    };
    out(create(load(), file, data));
  });
filterOptions(
  paging(
    cli
      .command("query [text]")
      .option(
        "--view <name>",
        "Named Boolean selection; other filters narrow it",
      )
      .description(
        "Query metadata, file references, and optional keyword text",
      ),
  ),
)
  .option(
    "--file <path>",
    "Reference to a project file; repeat for OR",
    collect,
    [],
  )
  .option(
    "--fields <names>",
    "Comma-separated card fields, e.g. title,description",
  )
  .option(
    "--also-text <text>",
    "Alternative keyword query; repeat (up to 8 distinct total)",
    collect,
    [],
  )
  .option("--explain", "Include query contributions, ranks, and match snippets")
  .action(async (text, opts) => {
    const queries = queryTexts(text, opts.alsoText);
    const fields =
      opts.fields === undefined
        ? undefined
        : opts.fields.split(",").map((field: string) => field.trim());
    const allowed = [
      "id",
      "path",
      "title",
      "type",
      "description",
      "dimensions",
      "files",
      "sources",
    ];
    if (fields?.some((field: string) => !allowed.includes(field)))
      fail(
        `fields must be a comma-separated selection of: ${allowed.join(", ")}`,
      );
    const { p, g } = graph();
    let nodes = opts.view
      ? selectView(g.nodes, getView(readViews(p), opts.view))
      : g.nodes;
    nodes = filtered(nodes, opts);
    if (opts.file.length) {
      const paths = new Set(
        opts.file.map((path: string) => resolve(p.root, path)),
      );
      nodes = nodes.filter((n) => {
        const files = Array.isArray(n.data.files)
          ? n.data.files.filter((f: unknown) => typeof f === "string")
          : [];
        return [...files, ...sourceFiles(n)].some((file: string) =>
          paths.has(resolve(p.root, file)),
        );
      });
    }
    const ranked = rankQueryResults(
      nodes,
      queries.length ? await keywordSearchMany(p, queries) : [],
    );
    const cards = ranked.map(({ node: n }) => {
      const result = card(n);
      return fields
        ? Object.fromEntries(
            fields.map((field: keyof typeof result) => [field, result[field]]),
          )
        : result;
    });
    out({
      ...page(cards, opts),
      warnings: g.issues,
      ...(opts.explain
        ? {
            retrieval: {
              mode: "keyword",
              queries,
              fusion: queries.length > 1 ? "rrf" : "none",
              ...(queries.length > 1 ? { rrfK: RRF_K } : {}),
            },
            explanations: ranked
              .slice(opts.offset, opts.offset + opts.limit)
              .map(({ node, ...explanation }, resultIndex) => ({
                resultIndex,
                ...explanation,
              })),
          }
        : {}),
    });
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
      "Use query for exact dimensions, search for text, read for sections, link show for incoming and outgoing relationships.",
      "Use doctor to inspect unresolved references. Vocabulary is defined in the metadata file.",
    ],
    metaPath: portable(relative(p.root, p.metaPath)),
    views: page(readViews(p), opts),
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
        frontmatter: n.skill ? n.doc.toJS() : n.data,
        ...(n.skill
          ? {
              graphMetadata: {
                path: n.skill.relativePath,
                entry: n.skill.key,
                data: n.skill.metadata,
              },
            }
          : {}),
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
      frontmatter: n.skill ? n.doc.toJS() : n.data,
      ...(n.skill
        ? {
            graphMetadata: {
              path: n.skill.relativePath,
              entry: n.skill.key,
              data: n.skill.metadata,
            },
          }
        : {}),
      content: output,
      totalLines: lines.length,
      nextLine: end < lines.length ? end + 1 : null,
      truncated: end < lines.length,
    });
  });
const linkCommands = cli
  .command("link")
  .description("Inspect and edit explicit graph relationships");
paging(
  linkCommands
    .command("show <id>")
    .option("--direction <direction>", "incoming, outgoing, or both", "both")
    .option("--relation <name>"),
).action((id, opts) => {
  if (!["incoming", "outgoing", "both"].includes(opts.direction))
    fail("Invalid direction");
  const { g } = graph();
  const origin = getNode(g, id);
  if (!origin.data.id || g.byId.get(origin.data.id)?.length !== 1)
    fail("Node needs a unique ID");
  const results: Data[] = [];
  for (const source of g.nodes)
    for (const edge of links(source)) {
      if (opts.relation && edge.relation !== opts.relation) continue;
      const [targetId, anchor] = edge.target.split("#");
      const outgoing = source === origin && opts.direction !== "incoming";
      const incoming =
        targetId === origin.data.id && opts.direction !== "outgoing";
      if (!outgoing && !incoming) continue;
      const targets = g.byId.get(targetId) ?? [];
      const target = targets.length === 1 ? targets[0] : undefined;
      const status = !targets.length
        ? "missing-node"
        : targets.length > 1
          ? "ambiguous-node"
          : anchor !== undefined &&
              !sections(target!).some((s) => s.id === anchor)
            ? "missing-section"
            : "resolved";
      const base = {
        source: source.data.id ?? null,
        sourcePath: source.relativePath,
        ...edge,
        status,
      };
      if (outgoing)
        results.push({
          ...base,
          direction: "outgoing",
          node: target ? card(target) : null,
        });
      if (incoming)
        results.push({ ...base, direction: "incoming", node: card(source) });
    }
  out({ origin: card(origin), ...page(results, opts), warnings: g.issues });
});
linkCommands
  .command("add <source> <relation> <target>")
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
linkCommands
  .command("remove <source> <relation> <target>")
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
