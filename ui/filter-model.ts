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

const quoteTagPart = (value: string) =>
  /^[^\s:"]+$/.test(value) ? value : JSON.stringify(value);
/** Round-trippable text for arbitrary project vocabulary. */
export function formatTag(facet: Facet): string {
  const field = facet.field === "type" ? "type" : facet.field.slice(11);
  // Quoted "type" denotes a dimension literally named type.
  const name =
    facet.field === "dimensions.type" ? '"type"' : quoteTagPart(field);
  return `${facet.exclude ? "NOT " : ""}${name}:${quoteTagPart(facet.value)}`;
}

export function parseTag(input: string): Facet | null {
  let source = input.trim();
  const exclude = /^not\s+/i.test(source);
  if (exclude) source = source.replace(/^not\s+/i, "");
  const match = source.match(
    /^("(?:\\.|[^"\\])*"|[^\s:"]+)\s*:\s*("(?:\\.|[^"\\])*"|[^\s"]+)$/,
  );
  if (!match) return null;
  try {
    const decode = (part: string): string =>
      part.startsWith('"') ? JSON.parse(part) : part;
    const field = decode(match[1]);
    const value = decode(match[2]);
    if (!field || !value) return null;
    return {
      field: match[1] === "type" ? "type" : `dimensions.${field}`,
      value,
      exclude,
    };
  } catch {
    return null;
  }
}

/** Toggle a positive type facet, replacing a contradictory exclusion. */
export function toggleTypeFilter(filters: Facet[], value: string): Facet[] {
  const active = filters.some(
    (f) => f.field === "type" && f.value === value && !f.exclude,
  );
  const remaining = filters.filter(
    (f) => f.field !== "type" || f.value !== value,
  );
  return active
    ? remaining
    : [...remaining, { field: "type", value, exclude: false }];
}
