import type { ColorConfig } from "../src/colors";
const palette = [
  "#6f71cb",
  "#3c9c89",
  "#bc8a42",
  "#568fbe",
  "#ba6d8c",
  "#868b49",
];
const hash = (s: string) =>
  [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
export function color(s: string, config?: ColorConfig) {
  return Object.hasOwn(config?.types ?? {}, s)
    ? config!.types[s]
    : palette[hash(s) % palette.length];
}
