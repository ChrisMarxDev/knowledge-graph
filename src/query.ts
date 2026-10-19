import { fail, type Node } from "./core.js";
import type { keywordSearch } from "./qmd.js";

type Hit = Awaited<ReturnType<typeof keywordSearch>>[number];
export const RRF_K = 60;

export function queryTexts(text: string | undefined, alternatives: string[]) {
  // Preserve legacy single-query input and ordering when expansion isn't requested.
  if (!alternatives.length) return text ? [text] : [];
  if (!text?.trim())
    fail("--also-text requires nonempty positional query text");
  const queries = [text, ...alternatives].map((q) => q.trim());
  if (queries.some((q) => !q.length || q.length > 500))
    fail("Expanded query texts must contain 1–500 characters each");
  const distinct = [...new Set(queries)];
  if (distinct.length > 8) fail("At most 8 distinct query texts are supported");
  return distinct;
}

/** Eligibility precedes ranking; fusion precedes pagination/projection. */
export function rankQueryResults(nodes: Node[], lists: Hit[][]) {
  type Ranked = {
    node: Node;
    score: number | null;
    matches: { queryIndex: number; rank: number }[];
    snippet: {
      queryIndex: number;
      text: string;
      source: "indexed-markdown";
    } | null;
  };
  if (!lists.length)
    return nodes.map((node): Ranked => ({
      node,
      score: null,
      matches: [],
      snippet: null,
    }));
  const candidates = new Map(nodes.map((n) => [n.path, n]));
  const ranked = new Map<string, Ranked>();
  const bestRank = new Map<string, number>();
  const multi = lists.length > 1;
  lists.forEach((hits, queryIndex) => {
    const seen = new Set<string>();
    const eligible = hits.filter((hit) => candidates.has(hit.path));
    if (multi)
      eligible.sort((a, b) => b.score - a.score || comparePath(a.path, b.path));
    let rank = 0;
    for (const hit of eligible) {
      if (seen.has(hit.path)) continue;
      seen.add(hit.path);
      rank++;
      const entry = ranked.get(hit.path) ?? {
        node: candidates.get(hit.path)!,
        score: 0,
        matches: [],
        snippet: null,
      };
      entry.score = multi ? entry.score! + 1 / (RRF_K + rank) : hit.score;
      entry.matches.push({ queryIndex, rank });
      // Equal ranks keep the earlier query. A missing winning snippet stays null.
      if (rank < (bestRank.get(hit.path) ?? Infinity)) {
        bestRank.set(hit.path, rank);
        entry.snippet = hit.snippet
          ? {
              queryIndex,
              text: hit.snippet.slice(0, 500),
              source: "indexed-markdown",
            }
          : null;
      }
      ranked.set(hit.path, entry);
    }
  });
  const results = [...ranked.values()];
  if (multi)
    results.sort(
      (a, b) =>
        b.score! - a.score! ||
        comparePath(a.node.relativePath, b.node.relativePath),
    );
  return results;
}

function comparePath(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
