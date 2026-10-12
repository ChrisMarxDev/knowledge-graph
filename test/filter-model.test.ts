import test from "node:test";
import assert from "node:assert/strict";
import { matchesFacets, facetOptions, type Facet } from "../ui/filter-model.js";
import type { GraphNode } from "../ui/graph-model.js";
const n = {
  type: "guide",
  dimensions: { area: ["web", "server"], audience: ["agent"] },
} as GraphNode;
const f = (field: string, value: string, exclude = false): Facet => ({
  field,
  value,
  exclude,
});
test("facets OR values within fields and AND distinct fields", () => {
  assert.equal(
    matchesFacets(n, [
      f("type", "rule"),
      f("type", "guide"),
      f("dimensions.area", "web"),
      f("dimensions.audience", "agent"),
    ]),
    true,
  );
  assert.equal(
    matchesFacets(n, [
      f("dimensions.area", "web"),
      f("dimensions.audience", "human"),
    ]),
    false,
  );
  assert.equal(matchesFacets(n, []), true);
});
test("exclusions override inclusions and keep nodes missing an excluded dimension", () => {
  assert.equal(
    matchesFacets(n, [
      f("dimensions.area", "web"),
      f("dimensions.area", "server", true),
    ]),
    false,
  );
  assert.equal(
    matchesFacets(n, [f("type", "guide"), f("type", "guide", true)]),
    false,
  );
  assert.equal(matchesFacets(n, [f("dimensions.missing", "x", true)]), true);
  assert.equal(matchesFacets(n, [f("dimensions.missing", "x")]), false);
});
test("vocabulary preserves arbitrary names and values, removes duplicates", () => {
  const nodes = [
    n,
    n,
    { ...n, type: "other", dimensions: { "a.b": ["x:y", "x:y"] } },
  ];
  const options = facetOptions(nodes);
  assert.equal(
    options.filter((x) => x.field === "type" && x.value === "guide").length,
    1,
  );
  assert.ok(
    options.some((x) => x.field === "dimensions.a.b" && x.value === "x:y"),
  );
  assert.equal(matchesFacets(nodes[2], [f("dimensions.a.b", "x:y")]), true);
});
