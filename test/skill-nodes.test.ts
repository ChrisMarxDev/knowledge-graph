import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  renameSync,
  symlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { stringify, parse } from "yaml";
import {
  init,
  project,
  scan,
  doctor,
  card,
  getNode,
  edit,
  matches,
} from "../src/core.js";
import {
  explorerSnapshot,
  createExplorerReader,
  readExplorerNode,
  readReferencedFile,
} from "../src/explorer.js";
import { searchCollections, keywordSearch } from "../src/qmd.js";

const skill =
  "---\nname: example\ndescription: How to deploy carefully.\nmetadata:\n  owner: team\n---\n\n# Deployment\n\nRead references/checklist.md before deploying.\n";
const path = "skills/example/SKILL.md";
function fixture(t: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), "kw-skill-nodes-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  init(root);
  mkdirSync(join(root, "skills/example/references"), { recursive: true });
  writeFileSync(join(root, path), skill);
  writeFileSync(
    join(root, "skills/example/references/checklist.md"),
    "# Checklist\nSupporting reference, not a node.",
  );
  writeFileSync(
    join(root, "knowledge/meta.yaml"),
    stringify({
      types: { skill: {} },
      dimensions: {},
      relations: { depends_on: {} },
    }),
  );
  const config = join(root, ".knowledge/config.yaml");
  writeFileSync(
    config,
    readFileSync(config, "utf8") + "skillNodes: .knowledge/skills.yaml\n",
  );
  const registry = join(root, ".knowledge/skills.yaml");
  writeFileSync(
    registry,
    stringify({
      [path]: {
        id: "deploy",
        type: "skill",
        files: ["skills/example/references/checklist.md"],
      },
    }),
  );
  return { root, registry, p: project(root) };
}

test("registered skills are original, searchable graph nodes; supporting files stay resources", (t) => {
  const { p, root } = fixture(t);
  const g = scan(p);
  assert.equal(g.nodes.length, 1);
  assert.deepEqual(doctor(p, g), []);
  const n = getNode(g, "deploy");
  assert.equal(card(n).title, "example");
  assert.equal(card(n).path, path);
  assert.equal(n.body, skill.split("---\n")[2]);
  assert.equal(matches(n, { field: "type", op: "eq", value: "skill" }), true);
  assert.equal(readExplorerNode(p, path).body, n.body);
  assert.match(
    readReferencedFile(p, "skills/example/references/checklist.md").content,
    /Checklist/,
  );
  assert.equal(explorerSnapshot(p).nodes[0].title, "example");
  assert.deepEqual(
    searchCollections(p)
      .filter((c) => c.pattern === "SKILL.md")
      .map((c) => c.path),
    [join(root, "skills/example")],
  );
  assert.equal(readFileSync(join(root, path), "utf8"), skill);
});

test("metadata edits write only registry and detect stale entries; unrelated entry edits are retained", (t) => {
  const { p, registry, root } = fixture(t);
  const n = getNode(scan(p), "deploy");
  const before = readFileSync(registry, "utf8");
  const preview = edit(
    n,
    { links: [{ relation: "depends_on", target: "deploy" }] },
    true,
  );
  assert.equal(preview.path, ".knowledge/skills.yaml");
  assert.equal(readFileSync(registry, "utf8"), before);
  writeFileSync(registry, before + "skills/other/SKILL.md:\n  id: other\n");
  edit(n, { links: [{ relation: "depends_on", target: "deploy" }] });
  assert.equal(
    parse(readFileSync(registry, "utf8"))["skills/other/SKILL.md"].id,
    "other",
  );
  assert.equal(readFileSync(join(root, path), "utf8"), skill);
  assert.throws(() => edit(n, { title: "Stale" }), /changed since reading/);
  assert.throws(
    () => edit(getNode(scan(p), "deploy"), { description: "copy" }),
    /Cannot edit skill field/,
  );
});

test("explorer refreshes skill content and graph metadata, with stable IDs across explicit moves", (t) => {
  const { root, registry } = fixture(t);
  const read = createExplorerReader(root);
  const first = read().snapshot;
  writeFileSync(join(root, path), skill + "\nChanged guidance.\n");
  assert.notEqual(read().snapshot.version, first.version);
  const second = read().snapshot;
  const data = parse(readFileSync(registry, "utf8"));
  data[path].title = "Deployment workflow";
  writeFileSync(registry, stringify(data));
  assert.equal(read().snapshot.nodes[0].title, "Deployment workflow");
  assert.notEqual(read().snapshot.nodes[0].revision, second.nodes[0].revision);
  renameSync(join(root, "skills/example"), join(root, "skills/renamed"));
  assert.equal(read().snapshot.nodes.length, 0);
  assert.ok(read().snapshot.issues.some((i) => i.code === "PARSE_ERROR"));
  data["skills/renamed/SKILL.md"] = { ...data[path], files: [] };
  delete data[path];
  writeFileSync(registry, stringify(data));
  assert.equal(read().snapshot.nodes[0].id, "deploy");
});

test("registration validates scope and shape and does not scan sibling Markdown", (t) => {
  const { root, registry, p } = fixture(t);
  for (const [key, data] of [
    ["../SKILL.md", { id: "bad" }],
    ["skills/example/references/checklist.md", {}],
    [path, { description: "duplicated" }],
    [path, "wrong shape"],
  ] as const) {
    writeFileSync(registry, stringify({ [key]: data }));
    assert.equal(scan(p).nodes.length, 0);
    assert.ok(scan(p).issues.length);
  }
  writeFileSync(registry, "[invalid registry]");
  assert.ok(scan(p).issues.some((i) => i.code === "PARSE_ERROR"));
  symlinkSync(join(root, "skills/example"), join(root, "skills/alias"));
  writeFileSync(
    registry,
    stringify({ "skills/alias/SKILL.md": { id: "bad" } }),
  );
  assert.match(scan(p).issues[0].message, /symbolic links/);
});

test("root overlap emits one skill node and diagnostic checks cover registration IDs", (t) => {
  const { p, registry, root } = fixture(t);
  p.roots.push(join(root, "skills/example"));
  const g = scan(p);
  assert.equal(g.nodes.filter((n) => n.relativePath === path).length, 1);
  assert.equal(g.nodes.find((n) => n.relativePath === path)?.data.id, "deploy");
  // Explicit broad roots still diagnose ordinary reference Markdown.
  assert.ok(g.issues.some((i) => i.path.endsWith("checklist.md")));
  writeFileSync(registry, stringify({ [path]: { type: "skill" } }));
  assert.ok(doctor(p, scan(p)).some((i) => i.code === "INVALID_ID"));
  edit(getNode(scan(p), path), { id: "assigned" });
  assert.equal(getNode(scan(p), "assigned").data.id, "assigned");
});

test("CLI read preserves actual skill frontmatter and link writes target the registry", (t) => {
  const { root, registry } = fixture(t);
  const cli = (...args: string[]) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          resolve("src/cli.ts"),
          "--project",
          root,
          "--json",
          ...args,
        ],
        { encoding: "utf8" },
      ),
    );
  const result = cli("read", "deploy");
  assert.equal(result.frontmatter.name, "example");
  assert.equal(result.frontmatter.id, undefined);
  assert.equal(result.graphMetadata.data.id, "deploy");
  assert.equal(result.graphMetadata.path, ".knowledge/skills.yaml");
  assert.equal(cli("query", "--type", "skill").results[0].id, "deploy");
  assert.equal(
    cli("link", "add", "deploy", "depends_on", "deploy").path,
    ".knowledge/skills.yaml",
  );
  assert.equal(cli("link", "show", "deploy").total, 2);
  assert.equal(
    parse(readFileSync(registry, "utf8"))[path].links[0].target,
    "deploy",
  );
  assert.equal(readFileSync(join(root, path), "utf8"), skill);
});

test("keyword search indexes the selected skill body and forgets removed registrations", async (t) => {
  const { root, registry, p } = fixture(t);
  writeFileSync(join(root, path), skill + "\nuniqueskillmarker\n");
  writeFileSync(
    join(root, "skills/example/references/checklist.md"),
    "uniquereferencemarker",
  );
  const hits = await keywordSearch(p, "uniqueskillmarker");
  assert.deepEqual(
    hits.map((hit) => hit.path),
    [join(root, path)],
  );
  assert.deepEqual(await keywordSearch(p, "uniquereferencemarker"), []);
  writeFileSync(registry, "{}\n");
  assert.deepEqual(await keywordSearch(project(root), "uniqueskillmarker"), []);
});

test("safe fixes and source mutations update multiple entries without changing skill files", (t) => {
  const { root, registry } = fixture(t);
  const other = "skills/second/SKILL.md";
  mkdirSync(join(root, "skills/second"));
  writeFileSync(
    join(root, other),
    skill.replace("name: example", "name: second"),
  );
  writeFileSync(
    registry,
    stringify({ [path]: { type: "skill" }, [other]: { type: "skill" } }),
  );
  const cli = (...args: string[]) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          resolve("src/cli.ts"),
          "--project",
          root,
          "--json",
          ...args,
        ],
        { encoding: "utf8" },
      ),
    );
  cli("fix", "--safe");
  const registered = parse(readFileSync(registry, "utf8"));
  assert.ok(registered[path].id);
  assert.ok(registered[other].id);
  assert.notEqual(registered[path].id, registered[other].id);
  cli(
    "source",
    "add",
    registered[path].id,
    "reference",
    "User-approved workflow",
  );
  assert.equal(
    cli("read", registered[path].id).graphMetadata.data.sources[0].target,
    "User-approved workflow",
  );
  cli(
    "source",
    "remove",
    registered[path].id,
    "reference",
    "User-approved workflow",
  );
  assert.deepEqual(
    cli("read", registered[path].id).graphMetadata.data.sources,
    [],
  );
  assert.equal(readFileSync(join(root, path), "utf8"), skill);
});

test("review covers skill registry and resource changes", async (t) => {
  const { root, registry, p } = fixture(t);
  const { review } = await import("../src/review.js");
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
  git("init", "-q");
  git("add", ".");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-qm",
    "Initial skill",
  );
  writeFileSync(
    registry,
    readFileSync(registry, "utf8") + "# Changed registry\n",
  );
  writeFileSync(
    join(root, "skills/example/references/checklist.md"),
    "Updated checklist",
  );
  const result = review(p, scan(p));
  assert.equal(result.results[0].id, "deploy");
  assert.equal(result.results[0].knowledgeChanged, true);
  assert.equal(
    result.results[0].changedFiles[0].path,
    "skills/example/references/checklist.md",
  );
  assert.equal(result.unmappedFiles.length, 0);
});
