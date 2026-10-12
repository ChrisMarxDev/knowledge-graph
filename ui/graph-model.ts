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
  overview: boolean,
  expanded: Set<string>,
) {
  const groups = new Map<
    string,
    { id: string; values: string[]; nodes: GraphNode[] }
  >();
  const endpoints = new Map<string, string>();
  for (const node of nodes) {
    const values = memberships(node, dimension);
    const id = `group:${dimension}:${JSON.stringify(values)}`;
    if (!groups.has(id)) groups.set(id, { id, values, nodes: [] });
    groups.get(id)!.nodes.push(node);
  }
  const vertices: {
    id: string;
    key?: string;
    label: string;
    values: string[];
    count: number;
    group?: string;
  }[] = [];
  for (const group of groups.values()) {
    const collapsed = overview && !expanded.has(group.id);
    if (collapsed)
      vertices.push({
        id: group.id,
        label: `${group.values.join(" + ") || "Unspecified"}\n${group.nodes.length} nodes`,
        values: group.values,
        count: group.nodes.length,
        group: group.id,
      });
    for (const node of group.nodes) {
      endpoints.set(node.key, collapsed ? group.id : nodeId(node.key));
      if (!collapsed)
        vertices.push({
          id: nodeId(node.key),
          key: node.key,
          label: node.title,
          values: group.values,
          count: 1,
        });
    }
  }
  const connections = new Map<
    string,
    {
      id: string;
      source: string;
      target: string;
      label: string;
      count: number;
      anchor: string | null;
      targetKey: string | null;
      aggregated: boolean;
      unresolved: boolean;
    }
  >();
  let unresolved = 0;
  for (const edge of edges) {
    const source = endpoints.get(edge.source),
      target = edge.target && endpoints.get(edge.target);
    if (source && edge.status !== "resolved") unresolved++;
    if (!source || !target) continue;
    const aggregated =
      source.startsWith("group:") || target.startsWith("group:");
    const id = aggregated
      ? `aggregate:${JSON.stringify([source, target, edge.relation, edge.status])}`
      : `edge:${edge.key}`;
    const existing = connections.get(id);
    if (existing) {
      existing.count++;
      existing.label = `${edge.relation} × ${existing.count}`;
    } else
      connections.set(id, {
        id,
        source,
        target,
        label: edge.relation,
        count: 1,
        anchor: edge.anchor,
        targetKey: edge.target,
        aggregated,
        unresolved: edge.status !== "resolved",
      });
  }
  return {
    vertices,
    connections: [...connections.values()],
    groups: [...groups.values()],
    unresolved,
  };
}
