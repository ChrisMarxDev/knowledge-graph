import React, { useEffect, useState } from "react";
import type { ExplorerSnapshot } from "../src/explorer";
import { color } from "./graph-color";
import { dimensionColor } from "./dimension-markers";
import { sortTableNodes, type TableSort } from "./node-table";

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
  const [sort, setSort] = useState<TableSort>({
    field: "title",
    descending: false,
  });
  const [page, setPage] = useState(0);
  const key = nodes.map((n) => n.key).join("\n");
  useEffect(() => setPage(0), [key, sort]);
  const dimensions = [
    ...new Set(nodes.flatMap((n) => Object.keys(n.dimensions))),
  ].sort();
  const columns = [
    { field: "title", label: "Name" },
    { field: "description", label: "Description" },
    { field: "type", label: "Type" },
    ...dimensions.map((name) => ({ field: `dimension:${name}`, label: name })),
  ];
  const sorted = sortTableNodes(nodes, sort);
  const pages = Math.max(1, Math.ceil(nodes.length / 50));
  const current = Math.min(page, pages - 1);
  return (
    <section className="node-table" aria-label="Knowledge list">
      <div className="table-scroll">
        <table>
          <colgroup>
            {columns.map((c) => (
              <col
                key={c.field}
                className={
                  c.field === "title"
                    ? "name-column"
                    : c.field === "description"
                      ? "description-column"
                      : "property-column"
                }
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.field}
                  scope="col"
                  aria-sort={
                    sort.field === c.field
                      ? sort.descending
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  <button
                    className="sort-header"
                    onClick={() =>
                      setSort({
                        field: c.field,
                        descending: sort.field === c.field && !sort.descending,
                      })
                    }
                  >
                    <span>{c.label}</span>
                    <span aria-hidden="true">
                      {sort.field === c.field
                        ? sort.descending
                          ? "↓"
                          : "↑"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
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
                    title={n.title}
                    aria-pressed={selected === n.key}
                    onClick={() => onSelect(n.key)}
                  >
                    <span aria-hidden="true" className="table-document-icon">
                      ▤
                    </span>
                    {n.title}
                  </button>
                </td>
                <td>
                  <div className="cell-text" title={n.description}>
                    {n.description || "—"}
                  </div>
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
                {dimensions.map((name) => (
                  <td key={name}>
                    <div className="list-dimensions">
                      {[...new Set(n.dimensions[name] ?? [])]
                        .sort()
                        .map((value) => (
                          <span className="type-pill" key={value}>
                            <span
                              className="dot"
                              style={{
                                background: dimensionColor(name, value, colors),
                              }}
                            />
                            {value}
                          </span>
                        ))}
                    </div>
                  </td>
                ))}
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
      <nav className="list-pagination" aria-label="List pages">
        <span>{nodes.length} nodes</span>
        {pages > 1 && (
          <>
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
          </>
        )}
      </nav>
    </section>
  );
}
