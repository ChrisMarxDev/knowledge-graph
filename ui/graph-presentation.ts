export type LabelCandidate = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** Screen-space policy only; never changes graph data or node positions. */
export function visibleLabels(candidates: LabelCandidate[], zoom: number) {
  const ordered = [...candidates].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const accepted: LabelCandidate[] = [];
  const visible = new Set<string>();
  // A sparse graph can show all titles sooner. Dense overviews retain landmarks.
  const fraction = Math.min(1, Math.max(0, (zoom - 0.35) / 0.75));
  const budget =
    zoom < 0.35 ? 0 : Math.max(3, Math.ceil(candidates.length * fraction));
  for (const candidate of ordered) {
    if (
      visible.size >= budget ||
      accepted.some(
        (other) =>
          candidate.x1 < other.x2 + 6 &&
          candidate.x2 + 6 > other.x1 &&
          candidate.y1 < other.y2 + 6 &&
          candidate.y2 + 6 > other.y1,
      )
    )
      continue;
    accepted.push(candidate);
    visible.add(candidate.id);
  }
  return visible;
}
