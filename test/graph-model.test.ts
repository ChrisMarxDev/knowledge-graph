import test from "node:test";
import assert from "node:assert/strict";
import {
  graphModel,
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
  const m = graphModel(nodes, edges, "dimension:area");
  assert.equal(m.vertices.length, 3);
  assert.deepEqual(m.vertices.find((n) => n.key === "a")?.values, [
    "server",
    "web",
  ]);
  assert.equal(m.connections.length, 3);
  assert.equal(m.unresolved, 1);
  assert.ok(m.connections.every((e) => e.source.startsWith("node:")));
});
test("filtered endpoints are omitted; unresolved section links remain visibly marked", () => {
  const m = graphModel(
    nodes.slice(0, 1),
    [
      ...edges,
      { ...edge("section", "a", "a", "missing-section"), anchor: "absent" },
    ],
    "type",
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

test("layout packs disconnected nodes with room between their footprints", async () => {
  const { forceLayout } = await import("../ui/layout.js");
  const nodes = Array.from({ length: 12 }, (_, i) => ({
    id: `isolated-${i}`,
    x: i * 10,
    y: i * 7,
    width: 48,
    height: 48,
    pinned: false,
  }));
  const result = forceLayout({ nodes, edges: [] });
  assert.equal(result.length, nodes.length);
  for (let i = 0; i < result.length; i++) {
    assert.ok(Number.isFinite(result[i].x) && Number.isFinite(result[i].y));
    for (let j = i + 1; j < result.length; j++) {
      assert.ok(
        Math.abs(result[i].x - result[j].x) >= 48 + 89 ||
          Math.abs(result[i].y - result[j].y) >= 48 + 89,
      );
    }
  }
});

test("parallel and reverse relationships do not multiply layout attraction", async () => {
  const { forceLayout } = await import("../ui/layout.js");
  const nodes = Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    x: Math.cos(i) * 200,
    y: Math.sin(i) * 200,
    width: 48,
    height: 48,
    pinned: false,
  }));
  const edges = nodes
    .slice(1)
    .map((n) => ({ id: `e${n.id}`, source: "0", target: n.id }));
  const single = forceLayout({ nodes, edges });
  const repeated = forceLayout({
    nodes,
    edges: [
      ...edges,
      ...edges.map((e) => ({
        id: `reverse${e.id}`,
        source: e.target,
        target: e.source,
      })),
      { id: "self", source: "0", target: "0" },
    ],
  });
  assert.deepEqual(repeated, single);
  assert.equal(edges.length, 4);
});
