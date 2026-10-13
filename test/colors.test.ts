import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { metadataColors } from "../src/colors.js";
import { init, project, scan, doctor } from "../src/core.js";
import { explorerSnapshot } from "../src/explorer.js";
import { color } from "../ui/graph-color.js";
import { dimensionColor, dimensionMarkers } from "../ui/dimension-markers.js";

test("metadata color overrides accept arbitrary vocabulary and reject unsafe SVG/CSS values", () => {
  const { colors, colorWarning } = metadataColors({
    types: {
      "any type": { color: "#123abc" },
      bad: { color: '<svg onload="alert(1)">' },
    },
    dimensions: { area: { color: "#ABCDEF" } },
  });
  assert.equal(color("any type", colors), "#123abc");
  assert.equal(dimensionColor("area", "frontend", colors), "#ABCDEF");
  assert.equal(dimensionColor("area", "backend", colors), "#ABCDEF");
  assert.match(colorWarning!, /types.bad.color/);
  assert.equal(Object.hasOwn(colors.types, "bad"), false);
  assert.match(color("toString", colors), /^#[0-9a-f]{6}$/i);
});

test("default signatures do not depend on encounter order, filtering, or value", () => {
  const original = color("guide");
  for (let i = 0; i < 200; i++) color(`other-${i}`);
  assert.equal(color("guide"), original);
  assert.equal(dimensionColor("area", "one"), dimensionColor("area", "two"));
});

test("metadata changes update explorer revision; invalid colors become doctor warnings and valid entries survive", (t) => {
  const root = mkdtempSync(join(tmpdir(), "kw-colors-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  init(root);
  const before = explorerSnapshot(project(root));
  const p = project(root);
  writeFileSync(
    p.metaPath,
    'types:\n  guide:\n    color: "#123456"\ndimensions:\n  area:\n    color: red\nrelations: {}\n',
  );
  const current = project(root);
  const after = explorerSnapshot(current);
  assert.notEqual(after.version, before.version);
  assert.equal(after.colors.types.guide, "#123456");
  assert.equal(after.colors.dimensions.area, undefined);
  assert.ok(
    doctor(current, scan(current)).some(
      (i) => i.code === "INVALID_COLOR" && i.severity === "warning",
    ),
  );
  const svg = decodeURIComponent(
    dimensionMarkers({ dimensions: { area: ["frontend"] } } as any, {
      types: {},
      dimensions: { area: "#123456" },
    }),
  );
  assert.ok(svg.includes('fill="#123456"'));
});
