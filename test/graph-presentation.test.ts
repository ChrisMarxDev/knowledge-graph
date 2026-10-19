import test from "node:test";
import assert from "node:assert/strict";
import {
  visibleLabels,
  type LabelCandidate,
} from "../ui/graph-presentation.js";

const candidate = (id: string, x: number): LabelCandidate => ({
  id,
  x1: x,
  x2: x + 80,
  y1: 0,
  y2: 30,
});

test("zoom reveals more non-overlapping labels without modifying candidates", () => {
  const nodes = Array.from({ length: 20 }, (_, i) =>
    candidate(String(i), i * 100),
  );
  const before = structuredClone(nodes);
  assert.equal(visibleLabels(nodes, 0.2).size, 0);
  assert.ok(visibleLabels(nodes, 0.6).size < visibleLabels(nodes, 1.2).size);
  assert.equal(visibleLabels(nodes, 1.2).size, 20);
  assert.deepEqual(nodes, before);
});

test("baseline labels use stable identity regardless of input order", () => {
  const nodes = [
    candidate("b", 0),
    candidate("a", 0),
    candidate("distant", 1000),
  ];
  assert.deepEqual([...visibleLabels(nodes, 2)], ["a", "distant"]);
  assert.deepEqual(
    [...visibleLabels([...nodes].reverse(), 2)],
    ["a", "distant"],
  );
});
