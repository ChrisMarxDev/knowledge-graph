import type { ColorConfig } from "../src/colors";
import type { GraphNode } from "./graph-model";
export function dimensionColor(
  name: string,
  value: string,
  config?: ColorConfig,
) {
  if (Object.hasOwn(config?.dimensions ?? {}, name))
    return config!.dimensions[name];
  const hash = [...name].reduce(
    (h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
  return `hsl(${hash % 360}, 65%, 57%)`;
}
export function dimensionEntries(node: GraphNode, config?: ColorConfig) {
  return Object.entries(node.dimensions)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([name, values]) =>
      [...new Set(values)].sort().map((value) => ({
        name,
        value,
        color: dimensionColor(name, value, config),
      })),
    );
}
/** Decorative pixels only: dimensions never become graph nodes or edges. */
export function dimensionMarkers(node: GraphNode, config?: ColorConfig) {
  const entries = dimensionEntries(node, config);
  if (!entries.length) return "none";
  const count = Math.min(entries.length, 4);
  const dots = entries
    .slice(0, 4)
    .map((d, i) => {
      const x = 16 + (i - (count - 1) / 2) * 7;
      return entries.length > 4 && i === 3
        ? `<circle cx="${x}" cy="16" r="2.6" fill="#343946" stroke="#fff" stroke-width="1"/><path d="M${x - 1.5} 16h3M${x} 14.5v3" stroke="#fff" stroke-width=".8"/>`
        : `<circle cx="${x}" cy="16" r="2.6" fill="${d.color}" stroke="#fff" stroke-width="1"/>`;
    })
    .join("");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${dots}</svg>`)}`;
}
