import test from "node:test";
import assert from "node:assert/strict";
import {
  graphModel,
  nodeId,
  type GraphNode,
  type GraphEdge,
} from "../ui/graph-model.js";
const node = (key: string, values: string[]): GraphNode => ({
  key,
  id: key,
  title: key,
  type: "concept",
  dimensions: { area: values },
  description: "",
  sections: [],
  files: [],
  sources: [],
  revision: "1",
});
const edge = (
  key: string,
  source: string,
  target: string | null,
  status = "resolved",
): GraphEdge => ({
  key,
  source,
  target,
  status,
  relation: "uses",
  targetId: target ?? "missing",
  anchor: null,
});
const nodes = [
  node("a", ["web", "server"]),
  node("b", ["server", "web", "web"]),
  node("c", ["server"]),
];
const edges = [
  edge("1", "a", "c"),
  edge("2", "b", "c"),
  edge("3", "a", "b"),
  edge("4", "c", null, "missing"),
];
test("network has one visual node per document and retains every membership and explicit edge", () => {
  const m = graphModel(nodes, edges, "dimension:area", false, new Set());
  assert.equal(m.vertices.length, 3);
  assert.deepEqual(m.vertices.find((n) => n.key === "a")?.values, [
    "server",
    "web",
  ]);
  assert.equal(m.connections.length, 3);
  assert.equal(m.unresolved, 1);
  assert.ok(m.connections.every((e) => e.source.startsWith("node:")));
});
test("overview groups exact membership sets and conserves directed edge counts including internal edges", () => {
  const m = graphModel(nodes, edges, "dimension:area", true, new Set());
  assert.equal(m.vertices.length, 2);
  assert.equal(
    m.connections.reduce((n, e) => n + e.count, 0),
    3,
  );
  assert.equal(m.connections.find((e) => e.source !== e.target)?.count, 2);
  assert.equal(m.connections.find((e) => e.source === e.target)?.count, 1);
  const group = m.groups.find((g) => g.nodes.length === 2)!;
  const expanded = graphModel(
    nodes,
    edges,
    "dimension:area",
    true,
    new Set([group.id]),
  );
  assert.equal(expanded.vertices.length, 3);
  assert.ok(expanded.vertices.some((n) => n.id === nodeId("a")));
  assert.equal(
    expanded.connections.reduce((n, e) => n + e.count, 0),
    3,
  );
});
test("filtered endpoints are omitted; unresolved section links remain visibly marked", () => {
  const m = graphModel(
    nodes.slice(0, 1),
    [
      ...edges,
      { ...edge("section", "a", "a", "missing-section"), anchor: "absent" },
    ],
    "type",
    false,
    new Set(),
  );
  assert.equal(m.connections.length, 1);
  assert.equal(m.connections[0].unresolved, true);
  assert.equal(m.unresolved, 1);
});

test("force layout produces finite positions and respects pinned nodes", async () => {
  const { forceLayout } = await import("../ui/layout.js");
  const result = forceLayout({
    nodes: [
      { id: "a", x: 50, y: 75, width: 120, height: 40, pinned: true },
      { id: "b", x: 70, y: 80, width: 120, height: 40, pinned: false },
      { id: "isolated", x: 0, y: 0, width: 80, height: 30, pinned: false },
    ],
    edges: [{ id: "ab", source: "a", target: "b" }],
  });
  assert.deepEqual(
    result.find((n) => n.id === "a"),
    { id: "a", x: 50, y: 75 },
  );
  assert.ok(result.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)));
  assert.notDeepEqual(
    result.find((n) => n.id === "b"),
    { id: "b", x: 70, y: 80 },
  );
});
