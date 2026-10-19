import test from "node:test";
import assert from "node:assert/strict";
import { type Node } from "../src/core.js";
import { queryTexts, rankQueryResults } from "../src/query.js";

const node = (id: string) =>
  ({ path: `/project/${id}.md`, relativePath: `${id}.md` }) as Node;
const hit = (id: string, score: number, snippet = id) => ({
  path: `/project/${id}.md`,
  score,
  snippet,
  title: id,
  source: "qmd",
});

test("alternative texts validate, trim, and deduplicate without changing legacy inputs", () => {
  assert.deepEqual(queryTexts("  term  ", []), ["  term  "]);
  assert.deepEqual(queryTexts(undefined, []), []);
  assert.deepEqual(queryTexts(" alpha ", ["beta", "alpha", " beta "]), [
    "alpha",
    "beta",
  ]);
  assert.throws(() => queryTexts(undefined, ["beta"]), /requires/);
  assert.throws(() => queryTexts("   ", ["beta"]), /requires/);
  assert.throws(() => queryTexts("alpha", [" "]), /1–500/);
  assert.throws(() => queryTexts("a".repeat(501), ["beta"]), /1–500/);
  assert.throws(
    () =>
      queryTexts(
        "a",
        Array.from({ length: 8 }, (_, i) => String(i)),
      ),
    /At most 8/,
  );
  assert.equal(queryTexts("a", Array(20).fill("a")).length, 1);
});

test("fusion filters before ranks, deduplicates paths, and chooses evidence by best rank", () => {
  const results = rankQueryResults(
    [node("a"), node("b"), node("c")],
    [
      [
        hit("excluded", 100),
        hit("a", 9, "first a"),
        hit("a", 8),
        hit("b", 7, "first b"),
      ],
      [hit("b", 2, "second b"), hit("c", 1)],
    ],
  );
  assert.deepEqual(
    results.map((r) => r.node.relativePath),
    ["b.md", "a.md", "c.md"],
  );
  assert.equal(results[0].score, 1 / 62 + 1 / 61);
  assert.deepEqual(results[0].matches, [
    { queryIndex: 0, rank: 2 },
    { queryIndex: 1, rank: 1 },
  ]);
  assert.deepEqual(results[0].snippet, {
    queryIndex: 1,
    text: "second b",
    source: "indexed-markdown",
  });
  assert.equal(results[1].score, 1 / 61);
});

test("multi-query ties use path order; single query preserves existing order and scores", () => {
  const nodes = [node("a"), node("b")];
  const list = [hit("b", 1), hit("a", 1)];
  assert.deepEqual(
    rankQueryResults(nodes, [list]).map((r) => r.node.relativePath),
    ["b.md", "a.md"],
  );
  assert.equal(rankQueryResults(nodes, [list])[0].score, 1);
  assert.deepEqual(
    rankQueryResults(nodes, [list, []]).map((r) => r.node.relativePath),
    ["a.md", "b.md"],
  );
  assert.deepEqual(
    rankQueryResults(nodes, [[hit("b", 1)], [hit("a", 1)]]).map(
      (r) => r.node.relativePath,
    ),
    ["a.md", "b.md"],
  );
});

test("metadata and no-hit results are explicit; snippets are bounded and tied ranks use first query", () => {
  assert.deepEqual(rankQueryResults([node("a")], []), [
    { node: node("a"), score: null, matches: [], snippet: null },
  ]);
  assert.deepEqual(rankQueryResults([node("a")], [[]]), []);
  const ranked = rankQueryResults(
    [node("a")],
    [[hit("a", 1, "x".repeat(900))], [hit("a", 2, "later")]],
  );
  assert.equal(ranked[0].snippet!.text.length, 500);
  assert.equal(ranked[0].snippet!.queryIndex, 0);
});
