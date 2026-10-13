import React, { useEffect, useState } from "react";
import type { ExplorerSnapshot } from "../src/explorer";
import { color } from "./graph-color";
import { dimensionEntries } from "./dimension-markers";

export function NodeList({
  nodes,
  colors,
  selected,
  onSelect,
  snippets,
}: {
  nodes: ExplorerSnapshot["nodes"];
  colors: ExplorerSnapshot["colors"];
  selected: string | null;
  onSelect: (key: string) => void;
  snippets: Map<string, string>;
}) {
  const [sort, setSort] = useState("title");
  const [page, setPage] = useState(0);
  const key = nodes.map((n) => n.key).join("\n");
  useEffect(() => setPage(0), [key, sort]);
  const sorted = [...nodes].sort(
    (a, b) =>
      (sort === "type" ? a.type.localeCompare(b.type) : 0) ||
      a.title.localeCompare(b.title) ||
      a.key.localeCompare(b.key),
  );
  const pages = Math.max(1, Math.ceil(nodes.length / 50));
  const current = Math.min(page, pages - 1);
  return (
    <section className="node-table" aria-label="Knowledge list">
      <div className="list-controls">
        <span>{nodes.length} nodes</span>
        <label>
          Sort by{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="title">Title</option>
            <option value="type">Type</option>
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Title & description</th>
              <th scope="col">Type</th>
              <th scope="col">Dimensions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(current * 50, (current + 1) * 50).map((n) => (
              <tr
                key={n.key}
                className={selected === n.key ? "selected-row" : ""}
              >
                <td>
                  <button
                    className="node-title"
                    aria-pressed={selected === n.key}
                    onClick={() => onSelect(n.key)}
                  >
                    {n.title}
                  </button>
                  {n.description && <p>{n.description}</p>}
                  {snippets.has(n.key) && (
                    <p className="search-snippet">{snippets.get(n.key)}</p>
                  )}
                </td>
                <td>
                  <span className="type-pill">
                    <span
                      className="dot"
                      style={{ background: color(n.type, colors) }}
                    />
                    {n.type || "Unspecified"}
                  </span>
                </td>
                <td>
                  <div className="list-dimensions">
                    {dimensionEntries(n, colors).map((d) => (
                      <span
                        className="type-pill"
                        key={JSON.stringify([d.name, d.value])}
                      >
                        <span className="dot" style={{ background: d.color }} />
                        {d.name}: {d.value}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!nodes.length && (
          <p className="empty-card">
            No matching nodes. Try clearing filters or choosing another view.
          </p>
        )}
      </div>
      {pages > 1 && (
        <nav className="list-pagination" aria-label="List pages">
          <button disabled={!current} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <span>
            Page {current + 1} of {pages}
          </span>
          <button
            disabled={current + 1 === pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
