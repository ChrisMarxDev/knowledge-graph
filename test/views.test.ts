import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { init, project, create, scan } from "../src/core.js";
import { readViews, getView, selectView } from "../src/views.js";
import { createExplorerReader, explorerSnapshot } from "../src/explorer.js";
import { startExplorer } from "../src/server.js";

function fixture(t: any) {
  const root = mkdtempSync(join(tmpdir(), "kw-views-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  init(root);
  const p = project(root);
  p.manifest.viewFiles = [".knowledge/views.yaml"];
  writeFileSync(p.manifestPath, stringify(p.manifest));
  const filter = {
    op: "and",
    filters: [
      {
        op: "or",
        filters: [
          {
            op: "and",
            filters: [
              { field: "dimensions.module", op: "eq", value: "mobile" },
              { field: "type", op: "eq", value: "rule" },
            ],
          },
          { field: "id", op: "eq", value: "extra" },
        ],
      },
      { op: "not", filters: [{ field: "id", op: "eq", value: "weird" }] },
    ],
  };
  const save = (views: unknown) =>
    writeFileSync(
      join(root, ".knowledge/views.yaml"),
      stringify({ version: 1, views }),
    );
  save({ mobile: { title: "Mobile rules", filter } });
  for (const id of ["normal", "weird", "extra", "other"])
    create(p, `knowledge/nodes/${id}.md`, {
      id,
      title: id,
      ...(id === "extra"
        ? {}
        : {
            type: "rule",
            dimensions: { module: [id === "other" ? "web" : "mobile"] },
          }),
      links:
        id === "normal"
          ? [
              { relation: "uses", target: "extra" },
              { relation: "uses", target: "weird" },
            ]
          : [],
    });
  return { root, p: project(root), save };
}
test("nested Boolean views include exceptions and exclude at the chosen scope", (t) => {
  const { p } = fixture(t);
  const views = readViews(p);
  assert.deepEqual(
    selectView(scan(p).nodes, getView(views, "mobile")).map((n) => n.data.id),
    ["extra", "normal"],
  );
  const snapshot = explorerSnapshot(p, scan(p), "mobile");
  assert.equal(snapshot.edges.length, 1);
  assert.equal(snapshot.edges[0].targetId, "extra");
  assert.throws(() => getView(views, "missing"), /Unknown view/);
});
test("view files refresh the explorer and malformed definitions fail even on empty collections", (t) => {
  const { root, p, save } = fixture(t);
  const read = createExplorerReader(root);
  const before = read().snapshot.version;
  save({ empty: { filter: { op: "or", filters: [] } } });
  assert.notEqual(read().snapshot.version, before);
  assert.equal(explorerSnapshot(p, scan(p), "empty").nodes.length, 0);
  for (const filter of [
    undefined,
    { op: "not", filters: [] },
    { op: "eq", field: "id" },
    { op: "and", filters: [{ op: "typo" }] },
  ]) {
    save({ broken: { filter } });
    assert.throws(() => readViews(p));
  }
  save({ duplicate: { filter: { op: "and", filters: [] } } });
  p.manifest.views = { duplicate: { filter: { op: "and", filters: [] } } };
  assert.throws(() => readViews(p), /duplicate view/);
});
test("HTTP lists views, filters the graph, and invalidates ETags after config edits", async (t) => {
  const { root, save } = fixture(t);
  const assets = join(root, "assets");
  mkdirSync(assets);
  writeFileSync(join(assets, "index.html"), "test");
  const { server, url } = await startExplorer(root, 0, assets);
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const list = await (await fetch(`${url}/api/views`)).json();
  assert.equal(list.views[0].name, "mobile");
  const first = await fetch(`${url}/api/graph?view=mobile`);
  assert.equal((await first.json()).nodes.length, 2);
  const etag = first.headers.get("etag")!;
  assert.equal(
    (
      await fetch(`${url}/api/graph?view=mobile`, {
        headers: { "If-None-Match": etag },
      })
    ).status,
    304,
  );
  save({ mobile: { filter: { op: "or", filters: [] } } });
  const next = await fetch(`${url}/api/graph?view=mobile`, {
    headers: { "If-None-Match": etag },
  });
  assert.equal(next.status, 200);
  assert.equal((await next.json()).nodes.length, 0);
  assert.equal((await fetch(`${url}/api/graph?view=unknown`)).status, 400);
});
