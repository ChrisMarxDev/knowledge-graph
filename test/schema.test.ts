import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import {
  create,
  doctor,
  edit,
  getNode,
  init,
  project,
  scan,
} from "../src/core.js";

function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-schema-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  init(root);
  const p = project(root);
  p.meta = {
    types: {
      concept: { schema: { required: ["description", "dimensions.evidence"] } },
      rejected: {},
      constraint: {},
    },
    dimensions: { evidence: { schema: { values: ["confirmed", "unknown"] } } },
    relations: {
      uses: {
        schema: {
          from: ["concept"],
          to: ["concept", "constraint", "rejected"],
          forbidden: [{ from: "concept", to: "rejected" }],
          allowSelf: false,
          maxOutgoing: 1,
        },
      },
    },
  };
  writeFileSync(p.metaPath, stringify(p.meta));
  return p;
}
test("schema analysis finds required, value, endpoint, forbidden, self and cardinality violations without edits", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    type: "concept",
    description: " ",
    dimensions: { evidence: ["guess"] },
    links: [
      { relation: "uses", target: "b#reason" },
      { relation: "uses", target: "a" },
    ],
  });
  create(p, "knowledge/nodes/b.md", {
    id: "b",
    title: "B",
    type: "rejected",
    links: [{ relation: "uses", target: "untyped" }],
  });
  create(p, "knowledge/nodes/c.md", { id: "untyped", title: "Untyped" });
  const b = getNode(scan(p), "b");
  writeFileSync(b.path, b.raw + "\n## Reason {#reason}\n");
  const before = scan(p).nodes.map((n) => n.raw);
  const issues = doctor(p, scan(p));
  assert.deepEqual(
    new Set(issues.map((i) => i.code)),
    new Set([
      "SCHEMA_REQUIRED",
      "SCHEMA_DIMENSION_VALUE",
      "SCHEMA_CARDINALITY",
      "SCHEMA_SELF_LINK",
      "SCHEMA_FORBIDDEN_LINK",
      "SCHEMA_RELATION_SOURCE",
      "SCHEMA_RELATION_TARGET",
    ]),
  );
  assert.ok(issues.every((i) => i.severity === "warning"));
  assert.ok(
    issues
      .find((i) => i.code === "SCHEMA_FORBIDDEN_LINK")
      ?.message.includes("b#reason"),
  );
  assert.deepEqual(
    scan(p).nodes.map((n) => n.raw),
    before,
  );
});
test("schema is optional and does not gate authoring or reinterpret structural fixes", (t) => {
  const p = fixture(t);
  create(p, "knowledge/nodes/a.md", { id: "a", title: "A", type: "concept" });
  edit(getNode(scan(p), "a"), { dimensions: { evidence: ["guess"] } });
  assert.ok(doctor(p, scan(p)).some((i) => i.code === "SCHEMA_REQUIRED"));
  p.meta.types.concept = {};
  p.meta.dimensions.evidence = {};
  assert.deepEqual(doctor(p, scan(p)), []);
});
test("invalid schemas are findings, skipped per definition, and do not hide other valid analyses", (t) => {
  const p = fixture(t);
  p.meta.types.concept.schema = { required: ["dimensions.missing"] };
  p.meta.types.rejected.schema = null;
  p.meta.dimensions.evidence.schema = { values: "confirmed" };
  p.meta.relations.uses.schema = {
    from: ["missing"],
    forbidden: [{ from: "concept", to: "missing" }],
    allowSelf: "no",
    maxOutgoing: -1,
    typo: true,
  };
  p.meta.types.constraint.schema = { required: ["description"] };
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    type: "constraint",
  });
  const issues = doctor(p, scan(p));
  assert.equal(issues.filter((i) => i.code === "INVALID_SCHEMA").length, 4);
  assert.ok(
    issues
      .filter((i) => i.code === "INVALID_SCHEMA")
      .every((i) => i.path === "knowledge/meta.yaml"),
  );
  assert.equal(issues.filter((i) => i.code === "SCHEMA_REQUIRED").length, 1);
  assert.ok(issues.some((i) => i.message.includes("unknown rule typo")));
});
test("unresolved and ambiguous target types are not guessed; duplicates count once for cardinality", (t) => {
  const p = fixture(t);
  const data = {
    id: "a",
    title: "A",
    type: "concept",
    description: "A",
    dimensions: { evidence: ["confirmed"] },
    links: [
      { relation: "uses", target: "missing" },
      { relation: "uses", target: "missing" },
    ],
  };
  create(p, "knowledge/nodes/a.md", data);
  assert.deepEqual(
    new Set(doctor(p, scan(p)).map((i) => i.code)),
    new Set(["DANGLING_ID"]),
  );
  create(p, "knowledge/nodes/b.md", {
    id: "missing",
    title: "B",
    type: "rejected",
  });
  create(p, "knowledge/nodes/c.md", {
    id: "missing",
    title: "C",
    type: "rejected",
  });
  assert.deepEqual(
    new Set(doctor(p, scan(p)).map((i) => i.code)),
    new Set(["DUPLICATE_ID", "AMBIGUOUS_TARGET"]),
  );
});
test("empty required fields and empty endpoint allowlists have explicit semantics", (t) => {
  const p = fixture(t);
  p.meta.types.concept.schema.required = [
    "description",
    "dimensions.evidence",
    "custom",
    "flag",
  ];
  p.meta.relations.uses.schema = { from: [], to: [] };
  create(p, "knowledge/nodes/a.md", {
    id: "a",
    title: "A",
    type: "concept",
    description: "",
    dimensions: { evidence: [] },
    custom: {},
    flag: false,
    links: [{ relation: "uses", target: "b" }],
  });
  create(p, "knowledge/nodes/b.md", {
    id: "b",
    title: "B",
    type: "constraint",
  });
  const issues = doctor(p, scan(p));
  assert.equal(issues.filter((i) => i.code === "SCHEMA_REQUIRED").length, 3);
  assert.ok(issues.some((i) => i.code === "SCHEMA_RELATION_SOURCE"));
  assert.ok(issues.some((i) => i.code === "SCHEMA_RELATION_TARGET"));
});
