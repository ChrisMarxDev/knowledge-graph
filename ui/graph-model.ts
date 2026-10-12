import type { ExplorerSnapshot } from "../src/explorer";
export type GraphNode = ExplorerSnapshot["nodes"][number];
export type GraphEdge = ExplorerSnapshot["edges"][number];
export function memberships(node: GraphNode, dimension: string): string[] {
  const values =
    dimension === "type"
      ? [node.type]
      : (node.dimensions[dimension.slice(10)] ?? []);
  return [...new Set(values)].sort();
}
export const nodeId = (key: string) => `node:${key}`;
export function graphModel(
  nodes: GraphNode[],
  edges: GraphEdge[],
  dimension: string,
) {
  const keys = new Set(nodes.map((node) => node.key));
  const vertices = nodes.map((node) => ({
    id: nodeId(node.key),
    key: node.key,
    label: node.title,
    values: memberships(node, dimension),
  }));
  const connections = edges
    .filter(
      (edge) => keys.has(edge.source) && edge.target && keys.has(edge.target),
    )
    .map((edge) => ({
      id: `edge:${edge.key}`,
      source: nodeId(edge.source),
      target: nodeId(edge.target!),
      label: edge.relation,
      anchor: edge.anchor,
      targetKey: edge.target!,
      unresolved: edge.status !== "resolved",
    }));
  return {
    vertices,
    connections,
    unresolved: edges.filter(
      (edge) => keys.has(edge.source) && edge.status !== "resolved",
    ).length,
  };
}
