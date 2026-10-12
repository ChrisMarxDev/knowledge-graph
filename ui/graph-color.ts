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
const assignedColors = new Map<string, string>();
export function color(s: string) {
  if (!assignedColors.has(s)) {
    const start = hash(s) % palette.length;
    const available = Array.from(
      { length: palette.length },
      (_, i) => palette[(start + i) % palette.length],
    ).find((c) => ![...assignedColors.values()].includes(c));
    assignedColors.set(s, available ?? palette[start]);
  }
  return assignedColors.get(s)!;
}
