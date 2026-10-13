import type { GraphNode } from "./graph-model";
export type TableSort = { field: string; descending: boolean };
export function tableValue(node: GraphNode, field: string): string {
  if (field.startsWith("dimension:"))
    return [...(node.dimensions[field.slice(10)] ?? [])].sort().join(", ");
  return field === "type"
    ? node.type
    : field === "description"
      ? node.description
      : node.title;
}
export function sortTableNodes(nodes: GraphNode[], sort: TableSort) {
  return [...nodes].sort(
    (a, b) =>
      tableValue(a, sort.field).localeCompare(
        tableValue(b, sort.field),
        undefined,
        { numeric: true, sensitivity: "base" },
      ) * (sort.descending ? -1 : 1) ||
      a.title.localeCompare(b.title) ||
      a.key.localeCompare(b.key),
  );
}
