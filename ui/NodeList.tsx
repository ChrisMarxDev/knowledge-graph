import React, { useEffect, useRef, useState } from "react";
import type { ExplorerSnapshot } from "../src/explorer";
import { color } from "./graph-color";
import { dimensionEntries } from "./dimension-markers";
import { sortTableNodes } from "./node-table";

type Node = ExplorerSnapshot["nodes"][number];

export function NodeList({
  nodes,
  allNodes,
  colors,
  selected,
  onSelect,
  snippets,
}: {
  nodes: Node[];
  allNodes: Node[];
  colors: ExplorerSnapshot["colors"];
  selected: string | null;
  onSelect: (key: string) => void;
  snippets: Map<string, string>;
}) {
  const dimensions = [
    ...new Set(allNodes.flatMap((n) => Object.keys(n.dimensions))),
  ].sort();
  const available = [
    "title",
    "type",
    "description",
    ...dimensions.map((d) => `dimension:${d}`),
  ];
  const [widths, setWidths] = useState<Record<string, number>>({});
  const resizing = useRef<{ column: string; x: number; width: number } | null>(
    null,
  );
  const columnWidth = (column: string) =>
    widths[column] ??
    (column === "title" ? 240 : column === "description" ? 380 : 140);
  const resizeColumn = (column: string, width: number) =>
    setWidths((previous) => ({
      ...previous,
      [column]: Math.max(90, Math.min(1200, Math.round(width))),
    }));
  const [order, setOrder] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [sort, setSort] = useState("title");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(0);
  const key = nodes.map((n) => n.key).join("\n");
  useEffect(() => setPage(0), [key, sort, descending]);
  const columns = [
    ...order.filter((c) => available.includes(c)),
    ...available.filter((c) => !order.includes(c)),
  ];
  const visible = columns.filter((c) => !hidden.includes(c));
  const label = (c: string) =>
    c.startsWith("dimension:") ? c.slice(10) : c[0].toUpperCase() + c.slice(1);
  const value = (n: Node, c: string): string =>
    c.startsWith("dimension:")
      ? (n.dimensions[c.slice(10)] ?? []).join(", ")
      : c === "type"
        ? n.type
        : c === "description"
          ? n.description
          : n.title;
  const sorted = sortTableNodes(nodes, { field: sort, descending });
  const pages = Math.max(1, Math.ceil(nodes.length / 50));
  const current = Math.min(page, pages - 1);
  function move(c: string, delta: number) {
    const next = [...columns];
    const i = next.indexOf(c);
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    setOrder(next);
  }
  return (
    <section className="node-table" aria-label="Knowledge table">
      <div className="list-controls">
        <span>
          {nodes.length} nodes{" "}
          <span className="table-hint">· Filter with the toolbar above</span>
        </span>
        <details className="column-picker">
          <summary>Columns</summary>
          <div className="column-menu">
            {columns.map((c, i) => (
              <div className="column-option" key={c}>
                <label>
                  <input
                    type="checkbox"
                    checked={!hidden.includes(c)}
                    disabled={c === "title"}
                    onChange={(e) =>
                      setHidden(
                        e.target.checked
                          ? hidden.filter((h) => h !== c)
                          : [...hidden, c],
                      )
                    }
                  />
                  {label(c)}
                </label>
                <button
                  aria-label={`Move ${label(c)} column left`}
                  disabled={i === 0}
                  onClick={() => move(c, -1)}
                >
                  ←
                </button>
                <button
                  aria-label={`Move ${label(c)} column right`}
                  disabled={i === columns.length - 1}
                  onClick={() => move(c, 1)}
                >
                  →
                </button>
              </div>
            ))}
          </div>
        </details>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Knowledge rows, scroll horizontally for more columns"
      >
        <table
          style={{
            width: visible.reduce((total, c) => total + columnWidth(c), 0),
          }}
        >
          <colgroup>
            {visible.map((c) => (
              <col key={c} style={{ width: columnWidth(c) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {visible.map((c) => (
                <th
                  key={c}
                  scope="col"
                  aria-sort={
                    sort === c
                      ? descending
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  <button
                    className="column-heading"
                    onClick={() => {
                      if (sort === c) setDescending(!descending);
                      else {
                        setSort(c);
                        setDescending(false);
                      }
                    }}
                  >
                    {label(c)}{" "}
                    <span aria-hidden="true">
                      {sort === c ? (descending ? "↓" : "↑") : "↕"}
                    </span>
                  </button>
                  <div
                    className="column-resize"
                    role="separator"
                    tabIndex={0}
                    aria-label={`Resize ${label(c)} column`}
                    aria-orientation="vertical"
                    aria-valuemin={90}
                    aria-valuemax={1200}
                    aria-valuenow={columnWidth(c)}
                    title="Drag to resize; use arrow keys when focused"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      resizing.current = {
                        column: c,
                        x: e.clientX,
                        width: columnWidth(c),
                      };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const start = resizing.current;
                      if (start?.column === c)
                        resizeColumn(c, start.width + e.clientX - start.x);
                    }}
                    onPointerUp={(e) => {
                      resizing.current = null;
                      if (e.currentTarget.hasPointerCapture(e.pointerId))
                        e.currentTarget.releasePointerCapture(e.pointerId);
                    }}
                    onPointerCancel={() => {
                      resizing.current = null;
                    }}
                    onLostPointerCapture={() => {
                      resizing.current = null;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                        e.preventDefault();
                        resizeColumn(
                          c,
                          columnWidth(c) +
                            (e.key === "ArrowRight" ? 1 : -1) *
                              (e.shiftKey ? 50 : 10),
                        );
                      }
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(current * 50, (current + 1) * 50).map((n) => (
              <tr
                key={n.key}
                onClick={() => onSelect(n.key)}
                className={selected === n.key ? "selected-row" : ""}
              >
                {visible.map((c) => (
                  <td
                    key={c}
                    className={`cell-${c.startsWith("dimension:") ? "dimension" : c}`}
                  >
                    {c === "title" ? (
                      <>
                        <button
                          className="node-title"
                          title={n.title}
                          aria-pressed={selected === n.key}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(n.key);
                          }}
                        >
                          {n.title}
                        </button>
                        {snippets.has(n.key) && (
                          <p className="search-snippet">
                            {snippets.get(n.key)}
                          </p>
                        )}
                      </>
                    ) : c === "type" ? (
                      <span className="type-pill">
                        <span
                          className="dot"
                          style={{ background: color(n.type, colors) }}
                        />
                        {n.type || "Unspecified"}
                      </span>
                    ) : c === "description" ? (
                      <span
                        className="cell-description-text"
                        title={n.description}
                      >
                        {n.description || "—"}
                      </span>
                    ) : (
                      <div className="list-dimensions">
                        {dimensionEntries(n, colors)
                          .filter((d) => d.name === c.slice(10))
                          .map((d) => (
                            <span className="type-pill" key={d.value}>
                              <span
                                className="dot"
                                style={{ background: d.color }}
                              />
                              {d.value}
                            </span>
                          ))}
                        {!n.dimensions[c.slice(10)]?.length && "—"}
                      </div>
                    )}
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
