import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";
import { readerMarkdown } from "./reader-markdown";
import type { ExplorerSnapshot } from "../src/explorer";
import "./style.css";
import { AnnotationMode } from "./AnnotationMode";
import { GraphView } from "./GraphView";
import { color } from "./graph-color";
import { dimensionColor } from "./dimension-markers";
import { FilterCombobox } from "./FilterCombobox";
import { matchesFacets, facetKey, type Facet } from "./filter-model";

type Node = ExplorerSnapshot["nodes"][number];
type Edge = ExplorerSnapshot["edges"][number];
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
  const [savedView, setSavedView] = useState("");
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
  const leftMax = Math.min(420, viewport - 32);
  const actualLeft = Math.max(180, Math.min(leftWidth, leftMax));
  const rightMax = Math.min(640, viewport - 32);
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
  const [filters, setFilters] = useState<Facet[]>([]);
  const [groupBy, setGroupBy] = useState(() => stored("kw.group", "type"));
  const [type, setType] = useState("");
  const [dimension, setDimension] = useState("");
  const [relation, setRelation] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [issues, setIssues] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { key: string; snippet: string; title: string }[] | null
  >(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [annotating, setAnnotating] = useState(false);
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
        const r = await fetch(
          savedView
            ? `/api/graph?view=${encodeURIComponent(savedView)}`
            : "/api/graph",
          {
            signal: abort.signal,
            headers: revision.current
              ? { "If-None-Match": `"${revision.current.version}"` }
              : {},
          },
        );
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
            }
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
  }, [savedView]);
  useEffect(() => {
    if (!changed.size) return;
    const t = setTimeout(() => setChanged(new Set()), 6000);
    return () => clearTimeout(t);
  }, [changed]);
  const activeView = graph?.views.find((view) => view.name === graph.view);
  const pageTitle = activeView?.title ?? "Knowledge map";
  useEffect(() => {
    document.title = graph ? `${pageTitle} · ${graph.project}` : "Knowledge";
  }, [pageTitle, graph?.project]);
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
  const effectiveFilters: Facet[] = [
    ...new Map(
      [
        ...filters,
        ...(type ? [{ field: "type", value: type, exclude: false }] : []),
        ...(dimension
          ? [
              {
                field: `dimensions.${JSON.parse(dimension)[0]}`,
                value: JSON.parse(dimension)[1],
                exclude: false,
              },
            ]
          : []),
      ].map((f) => [facetKey(f), f]),
    ).values(),
  ];
  const eligible = nodes.filter(
    (n) =>
      matchesFacets(n, effectiveFilters) &&
      (!focus || focusSet.has(n.key)) &&
      (!relation ||
        edges.some(
          (e) =>
            e.relation === relation &&
            (e.source === n.key || e.target === n.key),
        )),
  );
  const visible = eligible.filter(
    (n) =>
      !query ||
      `${n.title} ${n.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const eligibleKeys = new Set(eligible.map((n) => n.key));
  const filteredResults =
    searchResults?.filter((r) => eligibleKeys.has(r.key)) ?? null;
  const resetSearch = () => {
    setSearchResults(null);
    setSearchError("");
    searchId.current++;
    setSearching(false);
  };
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
    setFilters([]);
    setType("");
    setDimension("");
    setRelation("");
    setFocus(key);
    setFitKey((k) => k + 1);
  };
  const clear = () => {
    setQuery("");
    setFilters([]);
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
  const chooseView = (name: string) => {
    revision.current = undefined;
    setSavedView(name);
    setSelected(null);
    setFile(null);
    setIssues(false);
    clear();
  };
  async function search(term = query) {
    if (!term.trim()) return;
    const id = ++searchId.current;
    setSearching(true);
    setSearchError("");
    try {
      const r = await api<{ results: NonNullable<typeof searchResults> }>(
        `/api/search?${params({ q: term })}`,
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
      <button
        className="panel-toggle top-left-toggle"
        aria-label={leftOpen ? "Collapse left sidebar" : "Expand left sidebar"}
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
      <button
        className="panel-toggle top-right-toggle"
        disabled={!issues && !file && !selectedNode}
        aria-label={
          rightOpen && (issues || file || selectedNode)
            ? "Collapse right sidebar"
            : "Expand right sidebar"
        }
        title={
          rightOpen && (issues || file || selectedNode)
            ? "Collapse right sidebar"
            : "Expand right sidebar"
        }
        aria-expanded={!!(rightOpen && (issues || file || selectedNode))}
        aria-controls="knowledge-reader"
        onClick={() => {
          setRightOpen(!rightOpen);
          if (narrow && !rightOpen) setLeftOpen(false);
        }}
      >
        <Icon name="panel-right" size={21} />
      </button>
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
          <div className="sidebar-label">WORKSPACE</div>
          <button
            className={`nav-button ${!savedView ? "active" : ""}`}
            onClick={() => chooseView("")}
          >
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
          <section className="views-section" aria-labelledby="views-heading">
            <h2 id="views-heading" className="sidebar-label section-label">
              VIEWS <span>{graph.views.length}</span>
            </h2>
            <button
              className={`nav-button view-button ${!savedView ? "active" : ""}`}
              aria-pressed={!savedView}
              onClick={() => chooseView("")}
            >
              <Icon name="graph" size={16} />
              <span className="view-copy">
                <strong>All knowledge</strong>
              </span>
            </button>
            {graph.views.map((view) => (
              <button
                key={view.name}
                className={`nav-button view-button ${savedView === view.name ? "active" : ""}`}
                aria-pressed={savedView === view.name}
                onClick={() => chooseView(view.name)}
              >
                <Icon name="layers" size={16} />
                <span className="view-copy">
                  <strong>{view.title}</strong>
                  {view.description && <span>{view.description}</span>}
                </span>
              </button>
            ))}
            {!graph.views.length && (
              <p className="views-empty">No saved views in this project yet.</p>
            )}
          </section>
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
            All types <span>{nodes.length}</span>
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
            {(query ||
              filters.length ||
              type ||
              dimension ||
              relation ||
              focus) && (
              <button className="text-button" onClick={clear}>
                <Icon name="back" size={14} />
                Clear filters
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
          <button
            className="annotation-toggle"
            aria-pressed={annotating}
            onClick={() => setAnnotating(!annotating)}
          >
            Annotate UI
          </button>
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
        <div className="map-heading">
          <nav aria-label="Breadcrumb" className="map-breadcrumb">
            <span>{graph.project}</span>
            <span aria-hidden="true">/</span>
            {activeView ? (
              <>
                <button onClick={() => chooseView("")}>Knowledge map</button>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{activeView.title}</span>
              </>
            ) : (
              <span aria-current="page">Knowledge map</span>
            )}
          </nav>
          {activeView?.description && <p>{activeView.description}</p>}
        </div>
        <header className="toolbar" aria-label="Map tools">
          <FilterCombobox
            nodes={nodes}
            filters={effectiveFilters}
            query={query}
            onFilters={(value) => {
              setFilters(value);
              setType("");
              setDimension("");
              resetSearch();
              setFitKey((k) => k + 1);
            }}
            onQuery={(value) => {
              setQuery(value);
              resetSearch();
              setFitKey((k) => k + 1);
            }}
            onSearch={search}
            searching={searching}
            key={graph.view ?? "all-knowledge"}
          />
          <div className="select-control">
            <Icon name="layers" size={16} />
            <span>Color by</span>
            <select
              aria-label="Color by"
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value);
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
        </header>
        {error && (
          <div role="alert" className="notice">
            {error} · Showing the last readable graph.
          </div>
        )}
        <div className="explorer">
          <section className="map-area" aria-label="Knowledge graph">
            {(query ||
              filters.length ||
              type ||
              dimension ||
              relation ||
              focus) && (
              <button
                className="map-reset text-button"
                onClick={clear}
                aria-label="Clear graph filters"
              >
                <Icon name="back" size={14} />
                Clear filters
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
                  QMD keyword search · {filteredResults?.length ?? 0} results
                </p>
                {searchError && <p role="alert">{searchError}</p>}
                {filteredResults?.map((r) => (
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
                {filteredResults?.length === 0 && (
                  <p>No document contents match this query.</p>
                )}
              </div>
            ) : (
              <GraphView
                key={graph.projectKey}
                nodes={visible}
                edges={edges.filter(
                  (e) => !relation || e.relation === relation,
                )}
                selected={selected}
                groupBy={groupBy}
                onSelect={select}
                onClear={() => setSelected(null)}
                changed={changed}
                fitKey={fitKey}
                theme={theme}
                project={graph.projectKey}
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
        </div>
      </main>
      <div
        className="reader-panel"
        hidden={!(rightOpen && (issues || file || selectedNode))}
      >
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
                setFilters([]);
                setType("");
                setDimension("");
                setRelation("");
              }}
              onLocate={() => locate(selectedNode.key)}
              hidden={!visible.some((n) => n.key === selectedNode.key)}
            />
          ) : null}
        </aside>
      </div>
      {annotating && (
        <AnnotationMode
          key={graph.projectKey}
          projectKey={graph.projectKey}
          project={graph.project}
          onClose={() => setAnnotating(false)}
        />
      )}
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
      <div className="reader-top node-reader-top">
        <div className="tabs" role="tablist" aria-label="Node information">
          <button
            role="tab"
            aria-selected={tab === "overview"}
            className={tab === "overview" ? "tab-active" : ""}
            onClick={() => setTab("overview")}
          >
            Details
          </button>
          <button
            role="tab"
            aria-selected={tab === "connections"}
            className={tab === "connections" ? "tab-active" : ""}
            onClick={() => setTab("connections")}
          >
            Connections <span>{edges.length}</span>
          </button>
        </div>
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
        <div className="reader-chips">
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
          {Object.entries(node.dimensions).flatMap(([dimension, values]) =>
            values.map((value) => (
              <span
                className="type-pill dimension-chip"
                key={JSON.stringify([dimension, value])}
                title={`${dimension}: ${value}`}
              >
                <span
                  className="dot"
                  style={{ background: dimensionColor(dimension, value) }}
                />
                <span className="muted">{label(dimension)}:</span>{" "}
                {label(value)}
              </span>
            )),
          )}
        </div>
        <h2>{node.title}</h2>
        {node.description && <p>{node.description}</p>}
        {hidden && (
          <button className="text-button" onClick={onLocate}>
            Outside current filters · Locate in map
          </button>
        )}
      </div>
      <div className="reader-content">
        {tab === "overview" ? (
          <>
            {section && (
              <button
                className="text-button"
                onClick={() => onSelect(node.key, null)}
              >
                <Icon name="back" size={13} />
                Whole document
              </button>
            )}
            {error && (
              <p role="alert" className="notice">
                {error}
              </p>
            )}
            {loading && !body && <p className="muted">Reading file…</p>}
            <div className="markdown">
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
                {readerMarkdown(shownBody, node.title)}
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
