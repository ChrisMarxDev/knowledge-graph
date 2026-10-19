import test from "node:test";
import assert from "node:assert/strict";
import { sortTableNodes } from "../ui/node-table.js";
import type { GraphNode } from "../ui/graph-model.js";

test("table headers sort text, type, and multi-value dimensions in both directions without mutating nodes", () => {
  const nodes = [
    {
      key: "a",
      title: "Node 10",
      description: "Zulu",
      type: "guide",
      dimensions: { area: ["web", "api"] },
    },
    {
      key: "b",
      title: "Node 2",
      description: "Alpha",
      type: "rule",
      dimensions: {},
    },
    {
      key: "c",
      title: "Node 1",
      description: "Beta",
      type: "concept",
      dimensions: { area: ["mobile"] },
    },
  ] as unknown as GraphNode[];
  const sorted = (field: string, descending = false) =>
    sortTableNodes(nodes, { field, descending }).map((n) => n.key);
  assert.deepEqual(sorted("title"), ["c", "b", "a"]);
  assert.deepEqual(sorted("title", true), ["a", "b", "c"]);
  assert.deepEqual(sorted("description"), ["b", "c", "a"]);
  assert.deepEqual(sorted("type"), ["c", "a", "b"]);
  assert.deepEqual(sorted("dimension:area"), ["b", "a", "c"]);
  assert.deepEqual(sorted("dimension:area", true), ["c", "a", "b"]);
  assert.deepEqual(
    nodes.map((n) => n.key),
    ["a", "b", "c"],
  );
  assert.deepEqual(nodes[0].dimensions.area, ["web", "api"]);
});
