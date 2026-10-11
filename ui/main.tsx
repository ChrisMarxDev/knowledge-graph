import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import type { ExplorerSnapshot } from "../src/explorer";
import "./style.css";

type Node = ExplorerSnapshot["nodes"][number];
type Edge = ExplorerSnapshot["edges"][number];
type Point = { x: number; y: number };
const palette = [
  "#6f71cb",
  "#3c9c89",
  "#bc8a42",
  "#568fbe",
  "#ba6d8c",
  "#868b49",
];
const hash = (s: string) =>
  [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
const assignedColors = new Map<string, string>();
function color(s: string) {
  if (!assignedColors.has(s)) {
    const start = hash(s) % palette.length;
    const available = Array.from(
      { length: palette.length },
      (_, i) => palette[(start + i) % palette.length],
    ).find((c) => ![...assignedColors.values()].includes(c));
    assignedColors.set(s, available ?? palette[start]);
  }
  return assignedColors.get(s)!;
}
const label = (s: string) => s.replaceAll("_", " ");
const dimensionValues = (n: Node, name: string): string[] => {
  const value = n.dimensions[name];
  return Array.isArray(value) ? value : [];
};
function stored(k: string, fallback: string) {
  try {
    return localStorage.getItem(k) ?? fallback;
  } catch {
    return fallback;
  }
}
function remember(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* Storage is optional. */
  }
}
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    "panel-left": (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
      </>
    ),
    "panel-right": (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M15 3v18" />
      </>
    ),
    graph: (
      <>
        <path d="m6 7 11 3M6 7l4 11m7-8-7 8" />
        <circle cx="5" cy="6" r="3" />
        <circle cx="18" cy="10" r="3" />
        <circle cx="10" cy="19" r="3" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    layers: (
      <>
        <path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4" />
      </>
    ),
    file: (
      <>
        <path d="M5 3h9l5 5v13H5V3Z" />
        <path d="M14 3v6h5M8 13h8M8 17h6" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="M19 12H5m5-5-5 5 5 5" />,
    focus: (
      <>
        <path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    fit: <path d="M9 3v6H3m12-6v6h6M3 15h6v6m6 0v-6h6" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    moon: <path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z" />,
    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5m0 3v1" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    code: (
      <>
        <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.file}
    </svg>
  );
}
async function api<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
const params = (values: Record<string, string | number>) =>
  new URLSearchParams(
    Object.entries(values).map(([k, v]) => [k, String(v)]),
  ).toString();

function App() {
  const [leftOpen, setLeftOpen] = useState(
    () => stored("kw.leftOpen", String(window.innerWidth >= 900)) === "true",
  );
  const [rightOpen, setRightOpen] = useState(
    () => stored("kw.rightOpen", String(window.innerWidth >= 900)) === "true",
  );
  const [leftWidth, setLeftWidth] = useState(
    () => Number(stored("kw.leftWidth", "228")) || 228,
  );
  const [rightWidth, setRightWidth] = useState(
    () => Number(stored("kw.rightWidth", "340")) || 340,
  );
  const [viewport, setViewport] = useState(window.innerWidth);
  useEffect(() => {
    const resize = () => setViewport(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    remember("kw.leftOpen", String(leftOpen));
    remember("kw.rightOpen", String(rightOpen));
    remember("kw.leftWidth", String(leftWidth));
    remember("kw.rightWidth", String(rightWidth));
  }, [leftOpen, rightOpen, leftWidth, rightWidth]);
  const narrow = viewport < 900;
  const leftMax = narrow
    ? Math.min(420, viewport - 32)
    : Math.min(
        420,
        viewport -
          280 -
          (rightOpen ? Math.min(rightWidth, (viewport - 280) * 0.55) : 0),
      );
  const actualLeft = Math.max(180, Math.min(leftWidth, leftMax));
  const rightMax = narrow
    ? Math.min(640, viewport - 32)
    : Math.min(640, viewport - 280 - (leftOpen ? actualLeft : 0));
  const actualRight = Math.max(260, Math.min(rightWidth, rightMax));
  useEffect(() => {
    if (narrow && leftOpen && rightOpen) setLeftOpen(false);
  }, [narrow, leftOpen, rightOpen]);
  const showReader = () => {
    setRightOpen(true);
    if (narrow) setLeftOpen(false);
  };
  const [graph, setGraph] = useState<ExplorerSnapshot>();
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState(() => stored("kw.group", "type"));
  const [type, setType] = useState("");
  const [dimension, setDimension] = useState("");
  const [relation, setRelation] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [issues, setIssues] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { key: string; snippet: string; title: string }[] | null
  >(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [theme, setTheme] = useState(() => stored("kw.theme", "light"));
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [fitKey, setFitKey] = useState(0);
  const revision = useRef<ExplorerSnapshot | undefined>(undefined);
  const searchId = useRef(0);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    remember("kw.theme", theme);
  }, [theme]);
  useEffect(() => {
    remember("kw.group", groupBy);
  }, [groupBy]);
  useEffect(() => {
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    async function refresh() {
      try {
        const r = await fetch("/api/graph", {
          signal: abort.signal,
          headers: revision.current
            ? { "If-None-Match": `"${revision.current.version}"` }
            : {},
        });
        if (r.status !== 304) {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          if (active) {
            if (revision.current) {
              const old = new Map(
                revision.current.nodes.map((n) => [n.key, n.revision]),
              );
              setChanged(
                new Set(
                  data.nodes
                    .filter((n: Node) => old.get(n.key) !== n.revision)
                    .map((n: Node) => n.key),
                ),
              );
            } else setSelected(data.nodes[0]?.key ?? null);
            revision.current = data;
            setGraph(data);
          }
        }
        if (active) {
          setError("");
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
        }
      }
      if (active) timer = setTimeout(refresh, 2500);
    }
    refresh();
    return () => {
      active = false;
      abort.abort();
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    if (!changed.size) return;
    const t = setTimeout(() => setChanged(new Set()), 6000);
    return () => clearTimeout(t);
  }, [changed]);
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const byKey = useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const selectedNode = selected ? byKey.get(selected) : undefined;
  const types = [...new Set(nodes.map((n) => n.type))].sort();
  const dims = [
    ...new Set([
      ...Object.keys(graph?.meta.dimensions ?? {}),
      ...nodes.flatMap((n) => Object.keys(n.dimensions)),
    ]),
  ].sort();
  const dimensions = dims.flatMap((d) =>
    [...new Set(nodes.flatMap((n) => dimensionValues(n, d)))]
      .sort()
      .map((v) => ({
        key: JSON.stringify([d, v]),
        title: `${label(d)}: ${label(v)}`,
      })),
  );
  useEffect(() => {
    if (
      graph &&
      groupBy !== "type" &&
      !dims.includes(groupBy.slice("dimension:".length))
    )
      setGroupBy("type");
  }, [graph, groupBy]);
  const relations = [...new Set(edges.map((e) => e.relation))].sort();
  const focusSet = useMemo(
    () =>
      new Set(
        focus
          ? [
              focus,
              ...edges
                .filter(
                  (e) =>
                    (!relation || e.relation === relation) &&
                    (e.source === focus || e.target === focus),
                )
                .flatMap((e) =>
                  [e.source, e.target].filter((v): v is string => !!v),
                ),
            ]
          : [],
      ),
    [focus, edges, relation],
  );
  const visible = nodes.filter(
    (n) =>
      (!type || n.type === type) &&
      (!dimension ||
        (() => {
          const [d, v] = JSON.parse(dimension);
          return dimensionValues(n, d).includes(v);
        })()) &&
      (!focus || focusSet.has(n.key)) &&
      (!query ||
        `${n.title} ${n.description}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!relation ||
        edges.some(
          (e) =>
            e.relation === relation &&
            (e.source === n.key || e.target === n.key),
        )),
  );
  const select = (key: string, section: string | null = null) => {
    showReader();
    setSelected(key);
    setAnchor(section);
    setFile(null);
    setIssues(false);
  };
  const locate = (key: string) => {
    select(key);
    setQuery("");
    setType("");
    setDimension("");
    setRelation("");
    setFocus(key);
    setFitKey((k) => k + 1);
  };
  const clear = () => {
    setQuery("");
    setType("");
    setDimension("");
    setRelation("");
    setFocus(null);
    setSearchResults(null);
    setSearchError("");
    setSearching(false);
    searchId.current++;
    setFitKey((k) => k + 1);
  };
  async function search() {
    if (!query.trim()) return;
    const id = ++searchId.current;
    setSearching(true);
    setSearchError("");
    try {
      const r = await api<{ results: NonNullable<typeof searchResults> }>(
        `/api/search?${params({ q: query })}`,
      );
      if (id === searchId.current) setSearchResults(r.results);
    } catch (e) {
      if (id === searchId.current) setSearchError((e as Error).message);
    } finally {
      if (id === searchId.current) setSearching(false);
    }
  }
  if (!graph)
    return (
      <div className="loading">
        <Icon name="graph" size={36} />
        <h1>{error ? "Couldn’t load the graph" : "Opening your knowledge"}</h1>
        <p>{error || "Reading local Markdown files…"}</p>
      </div>
    );
  const connected = selected
    ? edges.filter((e) => e.source === selected || e.target === selected)
    : [];
  return (
    <div
      className="app"
      style={
        {
          "--left-width": `${actualLeft}px`,
          "--right-width": `${actualRight}px`,
        } as React.CSSProperties
      }
    >
      <aside
        id="knowledge-sidebar"
        className="sidebar"
        aria-label="Knowledge navigation"
        hidden={!leftOpen}
      >
        <div className="sidebar-content">
          <div className="brand">
            <span className="brand-mark">
              <Icon name="graph" size={24} />
            </span>
            <span>
              knowledge
              <span className="brand-sub">A little more connected.</span>
            </span>
          </div>
          <div className="workspace">
            <span className="workspace-icon">
              <Icon name="layers" />
            </span>
            <div>
              <strong>{graph.project}</strong>
              <span>Local workspace</span>
            </div>
            <span className="local-dot" />
          </div>
          <div className="sidebar-label">WORKSPACE</div>
          <button className="nav-button active" onClick={clear}>
            <Icon name="graph" />
            Knowledge map <span className="count">{nodes.length}</span>
          </button>
          <button
            className={`nav-button ${issues ? "selected-nav" : ""}`}
            onClick={() => {
              setIssues((v) => !v);
              showReader();
            }}
          >
            <Icon name="alert" />
            Diagnostics <span className="count">{graph.issues.length}</span>
          </button>
          <div className="sidebar-label section-label">
            EXPLORE BY TYPE <span>{types.length}</span>
          </div>
          <button
            className={`type-row ${!type ? "type-active" : ""}`}
            onClick={() => {
              setType("");
              setFitKey((k) => k + 1);
            }}
          >
            <span className="all-dot" />
            All knowledge <span>{nodes.length}</span>
          </button>
          {types.map((t) => (
            <button
              key={t}
              className={`type-row ${type === t ? "type-active" : ""}`}
              onClick={() => {
                setType(type === t ? "" : t);
                setFitKey((k) => k + 1);
              }}
            >
              <span className="dot" style={{ background: color(t) }} />
              {label(t)}
              <span>{nodes.filter((n) => n.type === t).length}</span>
            </button>
          ))}
          <div className="filters">
            <select
              aria-label="Dimension filter"
              value={dimension}
              onChange={(e) => {
                setDimension(e.target.value);
                setFitKey((k) => k + 1);
              }}
            >
              <option value="">All dimensions</option>
              {dimensions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.title}
                </option>
              ))}
            </select>
            <select
              aria-label="Relation filter"
              value={relation}
              onChange={(e) => {
                setRelation(e.target.value);
                setFitKey((k) => k + 1);
              }}
            >
              <option value="">All relationships</option>
              {relations.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            {(query || type || dimension || relation || focus) && (
              <button className="text-button" onClick={clear}>
                <Icon name="back" size={14} />
                Reset view
              </button>
            )}
            <span className="view-count">
              {visible.length} of {nodes.length} nodes<span>·</span>
              {edges.length} relationships
            </span>
          </div>
          <div className="sidebar-label section-label">
            NODES <span>{visible.length}</span>
          </div>
          <div className="node-list">
            {visible.slice(0, 150).map((n) => (
              <button
                key={n.key}
                title={n.title}
                className={`node-row ${selected === n.key ? "node-active" : ""}`}
                onClick={() => select(n.key)}
              >
                <Icon name="file" size={15} />
                <span>{n.title}</span>
              </button>
            ))}
            {visible.length > 150 && (
              <p className="muted small">First 150 shown. Filter to narrow.</p>
            )}
            {!visible.length && (
              <p className="muted small">No matching nodes.</p>
            )}
          </div>
          <div className="sidebar-footer">
            <span className="local-dot" />
            <div>
              <strong>Yours, by design</strong>
              <span>Markdown files · Git history</span>
            </div>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </button>
          </div>
        </div>
        <PanelResize
          side="left"
          width={actualLeft}
          min={180}
          max={leftMax}
          onResize={setLeftWidth}
        />
      </aside>
      <main className="main">
        <header className="toolbar" aria-label="Map tools">
          <button
            className="panel-toggle"
            aria-label={
              leftOpen ? "Collapse left sidebar" : "Expand left sidebar"
            }
            title={leftOpen ? "Collapse left sidebar" : "Expand left sidebar"}
            aria-expanded={leftOpen}
            aria-controls="knowledge-sidebar"
            onClick={() => {
              setLeftOpen(!leftOpen);
              if (narrow && !leftOpen) setRightOpen(false);
            }}
          >
            <Icon name="panel-left" size={21} />
          </button>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <Icon name="search" size={17} />
            <input
              aria-label="Find knowledge"
              placeholder="Find a node or an idea…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchResults(null);
                searchId.current++;
                setSearching(false);
              }}
            />
            <button
              type="submit"
              title="Search document contents with QMD"
              disabled={!query.trim() || searching}
            >
              {searching ? "Searching…" : "Full text ↵"}
            </button>
          </form>
          <div className="select-control">
            <Icon name="layers" size={16} />
            <span>Group by</span>
            <select
              aria-label="Group by"
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value);
                setExpanded(new Set());
                setFitKey((k) => k + 1);
              }}
            >
              <option value="type">Type</option>
              {dims.map((d) => (
                <option key={d} value={`dimension:${d}`}>
                  {label(d)}
                </option>
              ))}
            </select>
          </div>
          <button
            className="panel-toggle"
            aria-label={
              rightOpen ? "Collapse right sidebar" : "Expand right sidebar"
            }
            title={
              rightOpen ? "Collapse right sidebar" : "Expand right sidebar"
            }
            aria-expanded={rightOpen}
            aria-controls="knowledge-reader"
            onClick={() => {
              setRightOpen(!rightOpen);
              if (narrow && !rightOpen) setLeftOpen(false);
            }}
          >
            <Icon name="panel-right" size={21} />
          </button>
        </header>
        {error && (
          <div role="alert" className="notice">
            {error} · Showing the last readable graph.
          </div>
        )}
        <div className="explorer">
          <section className="map-area" aria-label="Knowledge graph">
            {(query || type || dimension || relation || focus) && (
              <button
                className="map-reset text-button"
                onClick={clear}
                aria-label="Reset graph view"
              >
                <Icon name="back" size={14} />
                Reset view
              </button>
            )}
            {searchResults !== null || searchError ? (
              <div className="search-results">
                <div className="panel-heading">
                  <h2>Full-text results</h2>
                  <button
                    className="icon-button"
                    aria-label="Close search results"
                    onClick={() => {
                      setSearchResults(null);
                      setSearchError("");
                    }}
                  >
                    <Icon name="close" />
                  </button>
                </div>
                <p className="muted small">
                  QMD keyword search · {searchResults?.length ?? 0} results
                </p>
                {searchError && <p role="alert">{searchError}</p>}
                {searchResults?.map((r) => (
                  <button
                    className="search-result"
                    key={r.key}
                    onClick={() => {
                      locate(r.key);
                      setSearchResults(null);
                    }}
                  >
                    <strong>{byKey.get(r.key)?.title ?? r.title}</strong>
                    <p>{r.snippet}</p>
                    <span>
                      Locate in map <Icon name="arrow" size={14} />
                    </span>
                  </button>
                ))}
                {searchResults?.length === 0 && (
                  <p>No document contents match this query.</p>
                )}
              </div>
            ) : (
              <GraphView
                nodes={visible}
                edges={edges.filter(
                  (e) => !relation || e.relation === relation,
                )}
                selected={selected}
                groupBy={groupBy}
                expanded={expanded}
                setExpanded={setExpanded}
                onSelect={select}
                onFile={(path) => {
                  setFile(path);
                  showReader();
                }}
                changed={changed}
                fitKey={fitKey}
                focused={!!focus}
              />
            )}
            <div className="map-footer">
              <span>
                <Icon name="graph" size={14} />
                Explicit connections, from your files
              </span>
              <span>Scroll to zoom · Drag to pan</span>
            </div>
          </section>
          <div className="reader-panel" hidden={!rightOpen}>
            <PanelResize
              side="right"
              width={actualRight}
              min={260}
              max={rightMax}
              onResize={setRightWidth}
            />
            <aside
              id="knowledge-reader"
              className="reader"
              aria-label="Knowledge reader"
            >
              {issues ? (
                <>
                  <div className="reader-top">
                    <span>WORKSPACE HEALTH</span>
                    <button
                      className="icon-button"
                      aria-label="Close diagnostics"
                      onClick={() => setIssues(false)}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                  <div className="reader-content">
                    <h2>
                      Diagnostics{" "}
                      <span className="count">{graph.issues.length}</span>
                    </h2>
                    <p className="muted">
                      The map stays usable while you fix your files.
                    </p>
                    {!graph.issues.length && (
                      <div className="empty-card">
                        All clear. Your graph has no structural issues.
                      </div>
                    )}
                    {graph.issues.map((i, index) => (
                      <div className="issue" key={index}>
                        <span className={`issue-level ${i.severity}`}>
                          {i.severity}
                        </span>
                        <strong>{label(i.code.toLowerCase())}</strong>
                        <p>{i.message}</p>
                        <button
                          className="text-button file-path"
                          onClick={() => select(i.path)}
                        >
                          {i.path}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : file ? (
                <FileReader
                  path={file}
                  version={graph.version}
                  nodes={byKey}
                  onBack={() => setFile(null)}
                  onSelect={select}
                />
              ) : selectedNode ? (
                <NodeReader
                  key={selectedNode.key}
                  node={selectedNode}
                  anchor={anchor}
                  edges={connected}
                  nodes={byKey}
                  onSelect={select}
                  onFile={(path) => {
                    setFile(path);
                    showReader();
                  }}
                  onFocus={() => {
                    setFocus(selectedNode.key);
                    setQuery("");
                    setType("");
                    setDimension("");
                    setRelation("");
                    setFitKey((k) => k + 1);
                  }}
                  onLocate={() => locate(selectedNode.key)}
                  hidden={!visible.some((n) => n.key === selectedNode.key)}
                />
              ) : (
                <div className="reader-content empty-reader">
                  <Icon name="file" size={32} />
                  <h2>{selected ? "Node unavailable" : "Start exploring"}</h2>
                  <p>
                    {selected
                      ? "This file was removed or can no longer be parsed. Select another node or check diagnostics."
                      : "Choose a node to read its knowledge and follow its connections."}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function PanelResize({
  side,
  width,
  min,
  max,
  onResize,
}: {
  side: "left" | "right";
  width: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const clamp = (value: number) => Math.max(min, Math.min(max, value));
  return (
    <div
      className={`panel-resize resize-${side}`}
      role="separator"
      tabIndex={0}
      aria-label={`Resize ${side} sidebar`}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={Math.max(min, Math.round(max))}
      aria-valuenow={Math.round(width)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        drag.current = { x: e.clientX, width };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current)
          onResize(
            clamp(
              drag.current.width +
                (e.clientX - drag.current.x) * (side === "left" ? 1 : -1),
            ),
          );
      }}
      onPointerUp={(e) => {
        drag.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        const direction = side === "left" ? 1 : -1;
        let next: number | undefined;
        if (e.key === "ArrowLeft") next = width - 16 * direction;
        if (e.key === "ArrowRight") next = width + 16 * direction;
        if (e.key === "Home") next = min;
        if (e.key === "End") next = max;
        if (next !== undefined) {
          e.preventDefault();
          onResize(clamp(next));
        }
      }}
    />
  );
}

function GraphView({
  nodes,
  edges,
  selected,
  groupBy,
  expanded,
  setExpanded,
  onSelect,
  onFile,
  changed,
  fitKey,
  focused,
}: {
  nodes: Node[];
  edges: Edge[];
  selected: string | null;
  groupBy: string;
  expanded: Set<string>;
  setExpanded: (v: Set<string>) => void;
  onSelect: (s: string, a?: string | null) => void;
  onFile: (p: string) => void;
  changed: Set<string>;
  fitKey: number;
  focused: boolean;
}) {
  const canvas = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0, k: 1 });
  const [openNode, setOpenNode] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; camera: typeof camera } | null>(
    null,
  );
  const groups = useMemo(() => {
    const map = new Map<string, Node[]>();
    nodes.forEach((n) => {
      const values =
        groupBy === "type"
          ? [n.type]
          : dimensionValues(n, groupBy.slice("dimension:".length)).length
            ? dimensionValues(n, groupBy.slice("dimension:".length))
            : ["Unspecified"];
      new Set(values).forEach((v) => map.set(v, [...(map.get(v) ?? []), n]));
    });
    return [...map].sort(([a], [b]) => a.localeCompare(b));
  }, [nodes, groupBy]);
  const layout = useMemo(() => {
    const cols = groups.length === 1 ? 1 : groups.length > 6 ? 3 : 2;
    let ys = Array(cols).fill(32);
    let budget = 160;
    const boxes = groups.map(([name, list], i) => {
      const col = i % cols,
        x = 32 + col * 350,
        y = ys[col];
      const requested =
        expanded.has(name) || focused ? list.length : Math.min(3, list.length);
      const shown = list.slice(0, Math.min(requested, budget));
      budget -= shown.length;
      const height =
        75 + shown.length * 61 + (list.length > shown.length ? 40 : 8);
      ys[col] += height + 64;
      return { name, list, shown, x, y, width: 294, height };
    });
    const points = new Map<string, Point>();
    boxes.forEach((b) =>
      b.shown.forEach((n, i) => {
        if (!points.has(n.key))
          points.set(n.key, { x: b.x + 147, y: b.y + 89 + i * 61 });
      }),
    );
    const groupFor = (key: string) =>
      boxes.find((b) => b.list.some((n) => n.key === key));
    const pointFor = (key: string) =>
      points.get(key) ??
      (() => {
        const b = groupFor(key);
        return b ? { x: b.x + 147, y: b.y + 28 } : undefined;
      })();
    const drawn = new Map<
      string,
      { source: Point; target: Point; edges: Edge[]; active: boolean }
    >();
    for (const e of edges) {
      if (!e.target) continue;
      const s = pointFor(e.source),
        t = pointFor(e.target);
      if (!s || !t || (s.x === t.x && s.y === t.y)) continue;
      const key = `${s.x},${s.y}:${t.x},${t.y}`;
      const existing = drawn.get(key);
      if (existing) {
        existing.edges.push(e);
        existing.active ||= e.source === selected || e.target === selected;
      } else
        drawn.set(key, {
          source: s,
          target: t,
          edges: [e],
          active: e.source === selected || e.target === selected,
        });
    }
    return {
      boxes,
      points,
      drawn: [...drawn.values()],
      width: cols * 350 + 8,
      height: Math.max(...ys, 200),
      shown: 160 - budget,
    };
  }, [groups, expanded, focused, edges, selected]);
  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [nodes.length > 0]);
  const fit = () => {
    if (!size.width || !size.height) return;
    const k = Math.min(
      1.1,
      (size.width - 32) / layout.width,
      (size.height - 48) / layout.height,
    );
    setCamera({
      k: Math.max(0.12, k),
      x: (size.width - layout.width * k) / 2,
      y: (size.height - layout.height * k) / 2,
    });
  };
  // Selection and refresh never reset the camera. Explicit navigation does.
  useEffect(fit, [size.width > 0, fitKey, groupBy, expanded]);
  const previousSize = useRef(size);
  useEffect(() => {
    const previous = previousSize.current;
    if (previous.width && previous.height) {
      setCamera((c) => ({
        ...c,
        x: c.x + (size.width - previous.width) / 2,
        y: c.y + (size.height - previous.height) / 2,
      }));
    }
    previousSize.current = size;
  }, [size.width, size.height]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;
      setCamera((c) => {
        const k = Math.max(
          0.12,
          Math.min(2.5, c.k * Math.exp(-e.deltaY * 0.0015)),
        );
        return {
          k,
          x: x - ((x - c.x) * k) / c.k,
          y: y - ((y - c.y) * k) / c.k,
        };
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const neighbors = new Set(
    edges
      .filter((e) => e.source === selected || e.target === selected)
      .flatMap((e) => [e.source, e.target]),
  );
  const selectedNode = nodes.find((n) => n.key === openNode);
  const zoom = (factor: number) =>
    setCamera((c) => {
      const k = Math.max(0.12, Math.min(2.5, c.k * factor));
      return {
        k,
        x: size.width / 2 - ((size.width / 2 - c.x) * k) / c.k,
        y: size.height / 2 - ((size.height / 2 - c.y) * k) / c.k,
      };
    });
  return (
    <>
      <div className="canvas-caption">
        <span className="tiny-square" />{" "}
        {focused ? "Neighborhood" : "Project overview"}
        <span className="caption-divider" /> {groups.length} groups
      </div>
      {!nodes.length ? (
        <div className="map-empty">
          <Icon name="search" size={30} />
          <h2>No matching knowledge</h2>
          <p>Clear a filter or add Markdown nodes to your configured roots.</p>
        </div>
      ) : (
        <svg
          className="graph-canvas"
          ref={canvas}
          onPointerDown={(e) => {
            if (
              e.button !== 0 ||
              (e.target as Element).closest("[data-node], [data-group]")
            )
              return;
            drag.current = { x: e.clientX, y: e.clientY, camera };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current) {
              const d = drag.current;
              setCamera({
                ...d.camera,
                x: d.camera.x + e.clientX - d.x,
                y: d.camera.y + e.clientY - d.y,
              });
            }
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>
          <g
            transform={`translate(${camera.x},${camera.y}) scale(${camera.k})`}
          >
            {layout.boxes.map((b) => (
              <g key={b.name} className="graph-group">
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={b.height}
                  rx="14"
                  fill="var(--group-bg)"
                  stroke="var(--border)"
                />
                <rect
                  x={b.x + 18}
                  y={b.y + 22}
                  width="8"
                  height="8"
                  rx="2"
                  fill={color(b.name)}
                />
                <text x={b.x + 34} y={b.y + 32} className="group-title">
                  {label(b.name).slice(0, 26)}
                </text>
                <text
                  x={b.x + b.width - 20}
                  y={b.y + 32}
                  textAnchor="end"
                  className="group-count"
                >
                  {b.list.length}
                </text>
                <line
                  x1={b.x + 17}
                  x2={b.x + b.width - 17}
                  y1={b.y + 48}
                  y2={b.y + 48}
                  stroke="var(--border)"
                />
              </g>
            ))}
            {layout.drawn
              .slice(0, 1200)
              .sort((a, b) => Number(a.active) - Number(b.active))
              .map((d, i) => {
                const sameCol = d.source.x === d.target.x;
                const x1 =
                    d.source.x +
                    (sameCol ? 132 : d.source.x < d.target.x ? 132 : -132),
                  x2 =
                    d.target.x +
                    (sameCol ? 132 : d.source.x < d.target.x ? -132 : 132);
                const bend = sameCol ? Math.max(x1, x2) + 28 : (x1 + x2) / 2;
                const path = `M${x1},${d.source.y} C${bend},${d.source.y} ${bend},${d.target.y} ${x2},${d.target.y}`;
                const active = d.active || hover === String(i);
                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHover(String(i))}
                    onMouseLeave={() => setHover(null)}
                  >
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke={active ? "var(--accent)" : "var(--edge)"}
                      strokeWidth={active ? 1.8 : 1.15}
                      opacity={selected && !active ? 0.25 : active ? 0.8 : 0.5}
                      markerEnd="url(#arrow)"
                      strokeDasharray={
                        d.edges.some((e) => e.status !== "resolved")
                          ? "4 4"
                          : undefined
                      }
                    />
                    {active && (
                      <g>
                        <rect
                          x={bend - 47}
                          y={(d.source.y + d.target.y) / 2 - 9}
                          width="94"
                          height="19"
                          rx="5"
                          fill="var(--surface)"
                        />
                        <text
                          textAnchor="middle"
                          x={bend}
                          y={(d.source.y + d.target.y) / 2 + 4}
                          className="edge-label"
                        >
                          {d.edges.length > 1
                            ? `${d.edges.length} connections`
                            : label(d.edges[0].relation).slice(0, 19)}
                        </text>
                      </g>
                    )}
                    <title>
                      {d.edges
                        .map((e) => `${e.relation}: ${e.targetId}`)
                        .join("\n")}
                    </title>
                  </g>
                );
              })}
            {layout.boxes.map((b) => (
              <g key={b.name}>
                {b.shown.map((n, i) => {
                  const x = b.x + 15,
                    y = b.y + 63 + i * 61;
                  const active = selected === n.key;
                  const connected = neighbors.has(n.key);
                  const unresolved = edges.filter(
                    (e) => e.source === n.key && e.status !== "resolved",
                  ).length;
                  return (
                    <g
                      data-node="true"
                      key={n.key}
                      className={`graph-node ${active ? "chosen" : ""} ${changed.has(n.key) ? "recent" : ""}`}
                      role="button"
                      aria-label={`Read ${n.title}`}
                      tabIndex={0}
                      onClick={() => onSelect(n.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(n.key);
                        }
                      }}
                      opacity={selected && !active && !connected ? 0.8 : 1}
                    >
                      <rect
                        x={x}
                        y={y}
                        width="264"
                        height="49"
                        rx="8"
                        fill="var(--surface)"
                        stroke={active ? "var(--accent)" : "var(--node-border)"}
                        strokeWidth={active ? 1.8 : 1}
                      />
                      <rect
                        x={x + 13}
                        y={y + 13}
                        width="4"
                        height="23"
                        rx="2"
                        fill={color(n.type)}
                      />
                      <text x={x + 27} y={y + 22} className="node-title">
                        {n.title.length > 29
                          ? n.title.slice(0, 27) + "…"
                          : n.title}
                      </text>
                      <text x={x + 27} y={y + 37} className="node-subtitle">
                        {n.sections.length} sections ·{" "}
                        {
                          edges.filter(
                            (e) => e.source === n.key || e.target === n.key,
                          ).length
                        }{" "}
                        links{unresolved ? ` · ${unresolved} unresolved` : ""}
                      </text>
                      <title>
                        {n.title}
                        {n.description ? `\n${n.description}` : ""}
                      </title>
                      {active && (
                        <g
                          role="button"
                          aria-label={`Expand sections and files for ${n.title}`}
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenNode(openNode === n.key ? null : n.key);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              setOpenNode(openNode === n.key ? null : n.key);
                            }
                          }}
                        >
                          <rect
                            x={x + 238}
                            y={y + 11}
                            width="20"
                            height="27"
                            rx="4"
                            fill="var(--accent-soft)"
                          />
                          <text
                            x={x + 248}
                            y={y + 30}
                            textAnchor="middle"
                            fill="var(--accent)"
                          >
                            +
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
                {(b.list.length > b.shown.length || expanded.has(b.name)) && (
                  <g
                    data-group="true"
                    role="button"
                    aria-label={`${expanded.has(b.name) ? "Collapse" : "Expand"} ${b.name}`}
                    tabIndex={0}
                    className="expand-group"
                    onClick={() => {
                      const s = new Set(expanded);
                      s.has(b.name) ? s.delete(b.name) : s.add(b.name);
                      setExpanded(s);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const s = new Set(expanded);
                        s.has(b.name) ? s.delete(b.name) : s.add(b.name);
                        setExpanded(s);
                      }
                    }}
                  >
                    <rect
                      x={b.x + 16}
                      y={b.y + b.height - 36}
                      width="262"
                      height="28"
                      rx="5"
                      fill="var(--group-bg)"
                    />
                    <text
                      x={b.x + 147}
                      y={b.y + b.height - 18}
                      textAnchor="middle"
                      className="expand-label"
                    >
                      {expanded.has(b.name)
                        ? "− Collapse group"
                        : `+ ${b.list.length - b.shown.length} more nodes`}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </g>
        </svg>
      )}
      {selectedNode && (
        <div className="node-expansion">
          <div className="panel-heading">
            <strong>{selectedNode.title}</strong>
            <button
              className="icon-button"
              aria-label="Close expanded node"
              onClick={() => setOpenNode(null)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="sidebar-label">SECTIONS</div>
          {selectedNode.sections
            .filter((s) => s.id)
            .map((s) => (
              <button
                key={s.start}
                onClick={() => onSelect(selectedNode.key, s.id!)}
              >
                <span>#</span>
                {s.title}
              </button>
            ))}
          {!selectedNode.sections.some((s) => s.id) && (
            <p className="muted small">No explicit section anchors.</p>
          )}
          <div className="sidebar-label">REFERENCED FILES</div>
          {selectedNode.files.map((f) => (
            <button key={f} onClick={() => onFile(f)}>
              <Icon name="code" size={15} />
              {f}
            </button>
          ))}
          {!selectedNode.files.length && (
            <p className="muted small">No file references.</p>
          )}
        </div>
      )}
      <div className="canvas-bottom">
        <div className="legend">
          <span className="legend-line" /> Relationship
          {groupBy !== "type" && (
            <span title="A node can belong to several groups">
              · All memberships shown
            </span>
          )}
          {layout.shown < nodes.length && <span>· Expand groups for more</span>}
          {layout.shown === 160 && (
            <span>· 160-card limit; filter to narrow</span>
          )}
          {layout.drawn.length > 1200 && (
            <span>· First 1,200 connections shown</span>
          )}
        </div>
        <div className="zoom-controls">
          <button aria-label="Zoom out" onClick={() => zoom(0.8)}>
            −
          </button>
          <span>{Math.round(camera.k * 100)}%</span>
          <button aria-label="Zoom in" onClick={() => zoom(1.25)}>
            +
          </button>
          <button aria-label="Fit graph" onClick={fit}>
            <Icon name="fit" size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

function NodeReader({
  node,
  anchor,
  edges,
  nodes,
  onSelect,
  onFile,
  onFocus,
  onLocate,
  hidden,
}: {
  node: Node;
  anchor: string | null;
  edges: Edge[];
  nodes: Map<string, Node>;
  onSelect: (key: string, anchor?: string | null) => void;
  onFile: (p: string) => void;
  onFocus: () => void;
  onLocate: () => void;
  hidden: boolean;
}) {
  const [tab, setTab] = useState("overview");
  const [body, setBody] = useState("");
  const [next, setNext] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const [expanded, setExpanded] = useState(false);
  async function read(start = 0) {
    const id = ++request.current;
    setLoading(true);
    try {
      const d = await api<{ body: string; next: number | null }>(
        `/api/node?${params({ key: node.key, start })}`,
      );
      if (request.current === id) {
        setBody((b) => (start ? b + d.body : d.body));
        setNext(d.next);
        setError("");
      }
    } catch (e) {
      if (request.current === id) setError((e as Error).message);
    } finally {
      if (request.current === id) setLoading(false);
    }
  }
  useEffect(() => {
    read();
    return () => {
      request.current++;
    };
  }, [node.key, node.revision]);
  useEffect(() => {
    setTab("overview");
    setExpanded(true);
  }, [anchor]);
  const section = anchor
    ? node.sections.find((s) => s.id === anchor)
    : undefined;
  const sectionEnd = section
    ? node.sections.find(
        (s) => s.start > section.start && s.depth <= section.depth,
      )?.start
    : undefined;
  const shownBody = section ? body.slice(section.start, sectionEnd) : body;
  function follow(href: string) {
    if (href.startsWith("#")) {
      onSelect(node.key, href.slice(1));
      return;
    }
    const [path, part] = href.split("#");
    const target = [...nodes.values()].find(
      (n) =>
        n.id === path ||
        n.key === path ||
        new URL(path, "http://local/" + node.key).pathname.slice(1) === n.key,
    );
    if (target) {
      onSelect(target.key, part ?? null);
      return;
    }
    const file = node.files.find(
      (f) =>
        f === path ||
        new URL(path, "http://local/" + node.key).pathname.slice(1) === f,
    );
    if (file) onFile(file);
  }
  return (
    <>
      <div className="reader-top">
        <span>NODE DETAILS</span>
        <button
          className="icon-button"
          title="Focus neighborhood"
          aria-label="Focus neighborhood"
          onClick={onFocus}
        >
          <Icon name="focus" size={17} />
        </button>
      </div>
      <div className="reader-intro">
        <span
          className="type-pill"
          style={{
            color: color(node.type),
            background: `${color(node.type)}16`,
          }}
        >
          <span className="dot" style={{ background: color(node.type) }} />
          {label(node.type)}
        </span>
        <h2>{node.title}</h2>
        <p>{node.description || "No description yet."}</p>
        <button className="focus-button" onClick={onFocus}>
          <Icon name="focus" size={15} />
          Explore neighborhood
          <Icon name="arrow" size={15} />
        </button>
        {hidden && (
          <button className="text-button" onClick={onLocate}>
            Outside current filters · Locate in map
          </button>
        )}
      </div>
      <div className="tabs">
        <button
          className={tab === "overview" ? "tab-active" : ""}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={tab === "connections" ? "tab-active" : ""}
          onClick={() => setTab("connections")}
        >
          Connections <span>{edges.length}</span>
        </button>
      </div>
      <div className="reader-content">
        {tab === "overview" ? (
          <>
            <div className="detail-label">DIMENSIONS</div>
            {Object.entries(node.dimensions).length ? (
              <div className="dimension-list">
                {Object.entries(node.dimensions).map(([d, values]) => (
                  <div key={d}>
                    <span>{label(d)}</span>
                    <div>
                      {values.map((v) => (
                        <span className="tag" key={v}>
                          {label(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No dimensions set.</p>
            )}
            <div className="detail-label contents-label">
              IN THIS NODE <span>{node.sections.length}</span>
            </div>
            <div className="contents">
              {node.sections.map((s) => (
                <button
                  key={s.start}
                  className={anchor === s.id ? "current-section" : ""}
                  onClick={() => {
                    if (s.id) onSelect(node.key, s.id);
                    else {
                      setExpanded(true);
                      onSelect(node.key, null);
                    }
                  }}
                >
                  <span>#</span>
                  {s.title}
                  <Icon name="chevron" size={13} />
                </button>
              ))}
            </div>
            {section && (
              <button
                className="text-button"
                onClick={() => onSelect(node.key, null)}
              >
                <Icon name="back" size={13} />
                Whole document
              </button>
            )}
            <div className="document-heading">
              <span className="detail-label">
                {section ? "SECTION" : "DOCUMENT"}
              </span>
              <button
                className="text-button"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Collapse" : "Read"}
              </button>
            </div>
            {error && (
              <p role="alert" className="notice">
                {error}
              </p>
            )}
            {loading && !body && <p className="muted">Reading file…</p>}
            <div className={`markdown ${expanded ? "" : "excerpt"}`}>
              <Markdown
                skipHtml
                components={{
                  img: ({ alt }) => (
                    <span className="muted">
                      [Image: {alt || "embedded image"}]
                    </span>
                  ),
                  a: ({ href, children }) =>
                    href && /^https?:\/\//.test(href) ? (
                      <a href={href} target="_blank" rel="noreferrer">
                        {children} ↗
                      </a>
                    ) : (
                      <button
                        className="inline-link"
                        onClick={() => follow(href ?? "")}
                      >
                        {children}
                      </button>
                    ),
                }}
              >
                {shownBody.replace(/\s*\{#[A-Za-z0-9_-]+\}(?=\s*$)/gm, "")}
              </Markdown>
            </div>
            {next !== null && (
              <button
                className="load-more"
                disabled={loading}
                onClick={() => read(next)}
              >
                {loading ? "Loading…" : "Read next 48,000 characters"}
              </button>
            )}
            <div className="detail-label contents-label">
              REFERENCED FILES <span>{node.files.length}</span>
            </div>
            {node.files.length ? (
              node.files.map((f) => (
                <button
                  className="file-reference"
                  key={f}
                  onClick={() => onFile(f)}
                >
                  <Icon name="code" size={16} />
                  <span>{f}</span>
                  <Icon name="chevron" size={14} />
                </button>
              ))
            ) : (
              <p className="muted small">No files referenced.</p>
            )}
            <div className="detail-label contents-label">
              SOURCES <span>{node.sources.length}</span>
            </div>
            {node.sources.length ? (
              node.sources.map((source, index) => (
                <div className="source-reference" key={index}>
                  {source.kind === "url" ? (
                    <a href={source.target} target="_blank" rel="noreferrer">
                      {source.title || source.target} ↗
                    </a>
                  ) : source.kind === "file" ? (
                    <button
                      className="text-button"
                      onClick={() => onFile(source.target)}
                    >
                      {source.title || source.target}
                    </button>
                  ) : (
                    <strong>{source.title || source.target}</strong>
                  )}
                  {source.title && (
                    <p className="muted small">{source.target}</p>
                  )}
                  {source.locator && <p className="small">{source.locator}</p>}
                  {source.note && <p className="small">{source.note}</p>}
                </div>
              ))
            ) : (
              <p className="muted small">No sources cited.</p>
            )}
            <details className="metadata">
              <summary>Source & identity</summary>
              <p>{node.key}</p>
              <code>{node.id || "No ID assigned"}</code>
            </details>
          </>
        ) : (
          <>
            <p className="muted small">
              Follow explicit links between nodes and sections.
            </p>
            {edges.map((e) => {
              const outgoing = e.source === node.key;
              const key = outgoing ? e.target : e.source;
              const other = key ? nodes.get(key) : undefined;
              return (
                <button
                  className="connection"
                  key={e.key}
                  disabled={!other}
                  onClick={() =>
                    other && onSelect(other.key, outgoing ? e.anchor : null)
                  }
                >
                  <span className="connection-direction">
                    {outgoing ? "OUTGOING" : "INCOMING"}
                    <Icon name={outgoing ? "arrow" : "back"} size={13} />
                  </span>
                  <span className="relation-name">{label(e.relation)}</span>
                  <strong>{other?.title ?? e.targetId}</strong>
                  {e.anchor && <span className="muted"># {e.anchor}</span>}
                  {e.status !== "resolved" && (
                    <span className="unresolved">{label(e.status)}</span>
                  )}
                </button>
              );
            })}
            {!edges.length && (
              <div className="empty-card">No explicit relationships yet.</div>
            )}
          </>
        )}
      </div>
    </>
  );
}
function FileReader({
  path,
  version,
  nodes,
  onBack,
  onSelect,
}: {
  path: string;
  version: string;
  nodes: Map<string, Node>;
  onBack: () => void;
  onSelect: (key: string) => void;
}) {
  const [data, setData] = useState<{
    content: string;
    size: number;
    next: number | null;
    backlinks: string[];
  }>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  async function read(start = 0) {
    const id = ++request.current;
    setLoading(true);
    try {
      const d = await api<NonNullable<typeof data>>(
        `/api/file?${params({ path, start })}`,
      );
      if (id === request.current) {
        setData((old) => ({
          ...d,
          content: start ? (old?.content ?? "") + d.content : d.content,
        }));
        setError("");
      }
    } catch (e) {
      if (id === request.current) {
        setError((e as Error).message);
        setData(undefined);
      }
    } finally {
      if (id === request.current) setLoading(false);
    }
  }
  useEffect(() => {
    setData(undefined);
    read();
    return () => {
      request.current++;
    };
  }, [path, version]);
  return (
    <>
      <div className="reader-top">
        <button className="text-button" onClick={onBack}>
          <Icon name="back" size={15} />
          Back to node
        </button>
        <span>FILE PREVIEW</span>
      </div>
      <div className="reader-content">
        <span className="type-pill">
          <Icon name="code" size={15} />
          Referenced file
        </span>
        <h2 className="file-path">{path.split("/").pop()}</h2>
        <p className="muted file-path small">{path}</p>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {loading && !data && <p>Reading file…</p>}
        {data && (
          <>
            <pre className="file-code">
              <code>{data.content}</code>
            </pre>
            <p className="muted small">
              {data.size.toLocaleString()} bytes · Read only
            </p>
            {data.next !== null && (
              <button
                className="load-more"
                disabled={loading}
                onClick={() => read(data.next!)}
              >
                Read next 48 KB
              </button>
            )}
            <div className="detail-label contents-label">REFERENCED BY</div>
            {data.backlinks.map((k) => (
              <button
                className="file-reference"
                key={k}
                onClick={() => onSelect(k)}
              >
                <Icon name="file" size={15} />
                {nodes.get(k)?.title ?? k}
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
