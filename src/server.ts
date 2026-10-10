import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createExplorerReader,
  readExplorerNode,
  readReferencedFile,
} from "./explorer.js";
import { keywordSearch } from "./qmd.js";

export async function startExplorer(
  root: string,
  port = 4317,
  assets = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/ui"),
) {
  // Fail before listening if project configuration or the built UI is unavailable.
  const readState = createExplorerReader(root);
  readState();
  const index = readFileSync(resolve(assets, "index.html"));
  let searchQueue = Promise.resolve();
  const server = createServer(async (req, res) => {
    const json = (status: number, data: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(data));
    };
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    try {
      const address = server.address();
      const actualPort =
        typeof address === "object" && address ? address.port : port;
      const hosts = new Set([
        `127.0.0.1:${actualPort}`,
        `localhost:${actualPort}`,
      ]);
      if (!hosts.has(req.headers.host ?? ""))
        return json(403, { error: "Local requests only" });
      if (
        req.headers.origin &&
        ![
          `http://127.0.0.1:${actualPort}`,
          `http://localhost:${actualPort}`,
        ].includes(req.headers.origin)
      )
        return json(403, { error: "Cross-origin requests are disabled" });
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return json(405, { error: "This explorer is read-only" });
      }
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${actualPort}`);
      const startValue = url.searchParams.get("start") ?? "0";
      if (
        !/^\d+$/.test(startValue) ||
        !Number.isSafeInteger(Number(startValue))
      )
        return json(400, { error: "Invalid start offset" });
      const start = Number(startValue);
      if (url.pathname.startsWith("/api/")) {
        const { p, g, snapshot } = readState();
        if (url.pathname === "/api/graph") {
          const etag = `"${snapshot.version}"`;
          res.setHeader("ETag", etag);
          if (req.headers["if-none-match"] === etag) {
            res.writeHead(304);
            res.end();
            return;
          }
          return json(200, snapshot);
        }
        if (url.pathname === "/api/node")
          return json(
            200,
            readExplorerNode(p, url.searchParams.get("key") ?? "", start, g),
          );
        if (url.pathname === "/api/file")
          return json(
            200,
            readReferencedFile(p, url.searchParams.get("path") ?? "", start, g),
          );
        if (url.pathname === "/api/search") {
          const query = url.searchParams.get("q")?.trim();
          if (!query || query.length > 500)
            return json(400, { error: "Search needs 1–500 characters" });
          const task = searchQueue.then(() => keywordSearch(p, query, 30));
          searchQueue = task.then(
            () => undefined,
            () => undefined,
          );
          const results = await task;
          return json(200, {
            results: results
              .map((r) => ({
                ...r,
                key: g.nodes.find((n) => n.path === r.path)?.relativePath,
              }))
              .filter((r) => r.key),
          });
        }
        return json(404, { error: "Unknown API route" });
      }
      if (url.pathname === "/") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(index);
        return;
      }
      const path = resolve(assets, "." + decodeURIComponent(url.pathname));
      if (!path.startsWith(resolve(assets) + sep))
        return json(403, { error: "Invalid asset path" });
      const types: Record<string, string> = {
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
      };
      if (!types[extname(path)]) return json(404, { error: "Not found" });
      res.setHeader("Content-Type", types[extname(path)]);
      res.end(readFileSync(path));
    } catch (e) {
      json(400, { error: (e as Error).message });
    }
  });
  await new Promise<void>((ok, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", fail);
      ok();
    });
  });
  const address = server.address() as { port: number };
  return { server, url: `http://127.0.0.1:${address.port}` };
}
