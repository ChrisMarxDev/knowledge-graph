import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { create, doctor, init, project, scan } from "../src/core.js";
import {
  applyTemplate,
  listTemplates,
  showTemplate,
} from "../src/templates.js";
function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-template-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  init(root);
  return project(root);
}
function custom(root: string) {
  const directory = join(root, "bundle");
  mkdirSync(join(directory, "nodes"), { recursive: true });
  mkdirSync(join(directory, "skills", "local-skill"), { recursive: true });
  writeFileSync(
    join(directory, "template.yaml"),
    stringify({
      version: 1,
      name: "local",
      description: "Local setup",
      nodes: ["sample.md"],
      skills: ["local-skill"],
    }),
  );
  writeFileSync(
    join(directory, "meta.yaml"),
    stringify({
      types: { custom: { description: "Custom" } },
      dimensions: {},
      relations: {},
    }),
  );
  writeFileSync(
    join(directory, "nodes/sample.md"),
    "---\nid: local-sample\ntitle: Sample\ntype: custom\n---\nBody\n",
  );
  writeFileSync(
    join(directory, "skills/local-skill/SKILL.md"),
    "---\nname: local-skill\ndescription: A local workflow.\n---\nRead the project.\n",
  );
  return directory;
}
test("coding template previews, installs complete skills and linked starter nodes, and is idempotent", (t) => {
  const p = fixture(t);
  assert.ok(listTemplates().some((t) => t.name === "coding"));
  const shown = showTemplate("coding");
  assert.ok(
    shown.skills.some((s) => s.path === "skills/use-kw/references/cli.md"),
  );
  const before = readFileSync(p.metaPath, "utf8");
  const preview = applyTemplate(p, "coding");
  assert.equal(preview.applied, false);
  assert.deepEqual(preview.conflicts, []);
  assert.equal(readFileSync(p.metaPath, "utf8"), before);
  assert.equal(existsSync(join(p.root, "skills")), false);
  assert.equal(scan(p).nodes.length, 0);
  const applied = applyTemplate(p, "coding", true);
  assert.equal(applied.applied, true);
  const loaded = project(p.root);
  const graph = scan(loaded);
  assert.equal(graph.nodes.length, 3);
  assert.deepEqual(doctor(loaded, graph), []);
  for (const asset of shown.skills)
    assert.equal(readFileSync(join(p.root, asset.path), "utf8"), asset.content);
  const again = applyTemplate(loaded, "coding", true);
  assert.deepEqual(again.changes, []);
  assert.deepEqual(again.conflicts, []);
  assert.equal(existsSync(join(p.root, "AGENTS.md")), false);
});
test("metadata, file, and ID conflicts stop all template writes", (t) => {
  const p = fixture(t);
  writeFileSync(
    p.metaPath,
    "# Keep this\ntypes:\n  concept:\n    description: Existing definition\ndimensions: {}\nrelations: {}\n",
  );
  create(p, "knowledge/nodes/custom.md", {
    id: "coding-project-template",
    title: "Mine",
  });
  mkdirSync(join(p.root, "skills/retro"), { recursive: true });
  writeFileSync(join(p.root, "skills/retro/SKILL.md"), "Mine\n");
  const before = readFileSync(p.metaPath, "utf8");
  const result = applyTemplate(project(p.root), "coding", true);
  assert.equal(result.applied, false);
  assert.equal(result.conflicts.length, 3);
  assert.equal(readFileSync(p.metaPath, "utf8"), before);
  assert.equal(scan(p).nodes.length, 1);
  assert.equal(existsSync(join(p.root, "skills/capture-intent")), false);
  assert.equal(
    readFileSync(join(p.root, "skills/retro/SKILL.md"), "utf8"),
    "Mine\n",
  );
});
test("template application preserves unrelated YAML and uses the first configured root", (t) => {
  const p = fixture(t);
  mkdirSync(join(p.root, "notes"));
  writeFileSync(
    p.manifestPath,
    stringify({
      version: 1,
      roots: ["notes", "knowledge/nodes"],
      meta: "knowledge/meta.yaml",
    }),
  );
  writeFileSync(
    p.metaPath,
    "# Vocabulary comment\ntypes:\n  custom: # Keep this comment\n    description: 'Keep this quoting'\ndimensions: {}\nrelations: {}\nextra: keep\n",
  );
  applyTemplate(project(p.root), "coding", true);
  assert.ok(existsSync(join(p.root, "notes/coding-project-template.md")));
  const text = readFileSync(p.metaPath, "utf8");
  assert.ok(text.includes("# Keep this comment"));
  assert.ok(text.includes("'Keep this quoting'"));
  assert.equal(project(p.root).meta.extra, "keep");
});
test("custom bundles copy their own vocabulary, nodes and skills", (t) => {
  const p = fixture(t);
  const source = custom(p.root);
  const result = applyTemplate(p, source, true);
  assert.equal(result.applied, true);
  const loaded = project(p.root);
  assert.deepEqual(doctor(loaded, scan(loaded)), []);
  assert.ok(existsSync(join(p.root, "skills/local-skill/SKILL.md")));
});
test("templates reject escaping paths, symlink assets, and symlink destinations without mutation", (t) => {
  const p = fixture(t);
  const source = custom(p.root);
  const manifest = join(source, "template.yaml");
  writeFileSync(
    manifest,
    stringify({
      version: 1,
      name: "local",
      description: "Local",
      nodes: ["../outside.md"],
      skills: [],
    }),
  );
  assert.throws(() => showTemplate(source), /Invalid template node path/);
  custom(p.root);
  rmSync(join(source, "nodes/sample.md"));
  symlinkSync(p.metaPath, join(source, "nodes/sample.md"));
  assert.throws(() => showTemplate(source), /symbolic/);
  rmSync(join(source, "nodes/sample.md"));
  custom(p.root);
  mkdirSync(join(p.root, "elsewhere"));
  symlinkSync(join(p.root, "elsewhere"), join(p.root, "skills"));
  assert.throws(() => applyTemplate(p, source, true), /symbolic/);
  assert.equal(scan(p).nodes.length, 0);
  assert.equal(existsSync(join(p.root, ".knowledge/template.lock")), false);
});
test("failed metadata write rolls back new files and retains existing content", (t) => {
  const p = fixture(t);
  const source = custom(p.root);
  const before = readFileSync(p.metaPath, "utf8");
  writeFileSync(p.metaPath + ".kw-lock", "Other writer\n");
  assert.throws(() => applyTemplate(p, source, true), /locked/);
  assert.equal(readFileSync(p.metaPath, "utf8"), before);
  assert.equal(existsSync(join(p.root, "knowledge/nodes/sample.md")), false);
  assert.equal(existsSync(join(p.root, "skills/local-skill/SKILL.md")), false);
  assert.equal(existsSync(join(p.root, ".knowledge/template.lock")), false);
  assert.equal(readFileSync(p.metaPath + ".kw-lock", "utf8"), "Other writer\n");
});
