import { mkdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { scan, type Project } from "./core.js";

// Keep the SDK behind this boundary; ordinary graph/file commands never import inference code.
export async function withQmd<T>(
  p: Project,
  work: (
    store: Awaited<ReturnType<(typeof import("@tobilu/qmd"))["createStore"]>>,
  ) => Promise<T>,
): Promise<T> {
  const { createStore } = await import("@tobilu/qmd");
  const cache = join(p.root, ".knowledge", "cache");
  mkdirSync(cache, { recursive: true });
  const collections = Object.fromEntries(
    searchCollections(p).map((c) => [
      c.name,
      { path: c.path, pattern: c.pattern },
    ]),
  );
  const store = await createStore({
    dbPath: join(cache, "qmd.sqlite"),
    config: { collections },
  });
  try {
    return await work(store);
  } finally {
    await store.close();
  }
}
function collectionName(path: string) {
  return (
    "root-" +
    createHash("sha256").update(resolve(path)).digest("hex").slice(0, 16)
  );
}
/** Exact skill entry points are indexed; sibling references and scripts are not imported. */
export function searchCollections(p: Project) {
  const roots = p.roots.map((path) => ({
    name: collectionName(path),
    path: resolve(path),
    pattern: "**/*.md",
  }));
  if (p.manifest.skillNodes === undefined) return roots;
  const skills = scan(p)
    .nodes.filter(
      (n) => n.skill && !p.roots.some((root) => n.path.startsWith(root + sep)),
    )
    .map((n) => ({
      name: collectionName(n.path),
      path: dirname(n.path),
      pattern: "SKILL.md",
    }));
  return [...roots, ...skills];
}

export async function keywordSearch(
  p: Project,
  query: string,
  limit: number | "all" = 20,
) {
  return (await keywordSearchMany(p, [query], limit))[0];
}

/** Refresh once, then execute independent lexical queries in the same store. */
export async function keywordSearchMany(
  p: Project,
  queries: string[],
  limit: number | "all" = "all",
) {
  const { extractSnippet } = await import("@tobilu/qmd");
  const collections = searchCollections(p);
  return withQmd(p, async (store) => {
    // Refresh before querying so direct Markdown edits and removals are reflected.
    // No update hooks are passed; no model loading or downloads are requested.
    await store.update();
    // Query filters and paginates after ranking. Count indexed documents, not
    // parsed nodes, because malformed Markdown can also occupy search results.
    const resultLimit =
      limit === "all"
        ? Math.max((await store.getStatus()).totalDocuments, 1)
        : limit;
    // Restrict every search to current roots: SDK config synchronization alone can
    // leave indexed documents from removed collections in the database.
    const lists = [];
    for (const query of queries) {
      const results = (
        await Promise.all(
          collections.map((collection) =>
            store.searchLex(query, {
              limit: resultLimit,
              collection: collection.name,
            }),
          ),
        )
      )
        .flat()
        .sort((a, b) => b.score - a.score)
        .slice(0, resultLimit);
      lists.push(
        results.map((r) => {
          const root = collections.find(
            (c) => c.name === r.collectionName,
          )!.path;
          const prefix = `${r.collectionName}/`;
          const file = r.displayPath.startsWith(prefix)
            ? r.displayPath.slice(prefix.length)
            : r.displayPath;
          return {
            path: resolve(root, file),
            score: r.score,
            title: r.title,
            snippet: r.body ? extractSnippet(r.body, query, 500).snippet : "",
            source: "qmd",
          };
        }),
      );
    }
    return lists;
  });
}
