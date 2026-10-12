import type { GraphNode } from "./graph-model";
export type Facet = { field: string; value: string; exclude: boolean };
export const facetKey = (f: Facet) =>
  JSON.stringify([f.field, f.value, f.exclude]);
/** OR within an included field, AND across fields, exclusions always subtract. */
export function matchesFacets(node: GraphNode, filters: Facet[]): boolean {
  const groups = new Map<string, Facet[]>();
  for (const f of filters) {
    const matches =
      f.field === "type"
        ? node.type === f.value
        : (node.dimensions[f.field.slice(11)] ?? []).includes(f.value);
    if (f.exclude && matches) return false;
    if (!f.exclude) groups.set(f.field, [...(groups.get(f.field) ?? []), f]);
  }
  return [...groups.values()].every((fs) =>
    fs.some((f) =>
      f.field === "type"
        ? node.type === f.value
        : (node.dimensions[f.field.slice(11)] ?? []).includes(f.value),
    ),
  );
}
export function facetOptions(nodes: GraphNode[]): Omit<Facet, "exclude">[] {
  const entries = new Map<string, Omit<Facet, "exclude">>();
  for (const node of nodes) {
    for (const [field, values] of [
      ["type", [node.type]],
      ...Object.entries(node.dimensions).map(([k, v]) => [
        `dimensions.${k}`,
        v,
      ]),
    ] as [string, string[]][]) {
      for (const value of values)
        entries.set(JSON.stringify([field, value]), { field, value });
    }
  }
  return [...entries.values()].sort(
    (a, b) => a.field.localeCompare(b.field) || a.value.localeCompare(b.value),
  );
}
