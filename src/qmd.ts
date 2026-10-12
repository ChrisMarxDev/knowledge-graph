import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Project } from "./core.js";

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
    p.roots.map((path) => [
      collectionName(path),
      { path: resolve(path), pattern: "**/*.md" },
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
export async function keywordSearch(
  p: Project,
  query: string,
  limit: number | "all" = 20,
) {
  const { extractSnippet } = await import("@tobilu/qmd");
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
    const results = (
      await Promise.all(
        p.roots.map((path) =>
          store.searchLex(query, {
            limit: resultLimit,
            collection: collectionName(path),
          }),
        ),
      )
    )
      .flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, resultLimit);
    return results.map((r) => {
      const root = p.roots.find(
        (path) => collectionName(path) === r.collectionName,
      )!;
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
    });
  });
}
