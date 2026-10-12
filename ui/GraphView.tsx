import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core } from "cytoscape";
import {
  graphModel,
  memberships,
  nodeId,
  type GraphNode,
  type GraphEdge,
} from "./graph-model";
import { color } from "./graph-color";
type Saved = Record<string, { x: number; y: number; pinned?: boolean }>;
function readPositions(key: string): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "{}");
    return Object.fromEntries(
      Object.entries(raw).filter(([, p]) => {
        const point = p as Saved[string];
        return point && Number.isFinite(point.x) && Number.isFinite(point.y);
      }),
    ) as Saved;
  } catch {
    return {};
  }
}
export function GraphView({
  nodes,
  edges,
  selected,
  groupBy,
  onSelect,
  onClear,
  changed,
  fitKey,
  theme,
  project,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selected: string | null;
  groupBy: string;
  onSelect: (key: string, anchor?: string | null) => void;
  onClear: () => void;
  changed: Set<string>;
  fitKey: number;
  theme: string;
  project: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<Core | null>(null);
  const storageKey = `kw.positions.v1:${project}`;
  const saved = useRef<Saved>(readPositions(storageKey));
  const callbacks = useRef({ onSelect, onClear });
  callbacks.current = { onSelect, onClear };
  const [overview, setOverview] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pins, setPins] = useState(0);
  const [error, setError] = useState("");
  const [hover, setHover] = useState("");
  const model = useMemo(
    () => graphModel(nodes, edges, groupBy, overview, expanded),
    [nodes, edges, groupBy, overview, expanded],
  );
  const persist = () => {
    const cy = instance.current;
    cy?.nodes().forEach((n) => {
      saved.current[n.id()] = { ...n.position(), pinned: n.locked() };
    });
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved.current));
    } catch {
      /* Optional storage. */
    }
    setPins(cy?.nodes().filter((n) => n.locked()).length ?? 0);
  };
  const worker = useRef<Worker | null>(null);
  const [arranging, setArranging] = useState(false);
  const cancelLayout = () => {
    worker.current?.terminate();
    worker.current = null;
    setArranging(false);
  };
  const runLayout = (fit: boolean) => {
    const cy = instance.current;
    cancelLayout();
    if (!cy || !cy.nodes().length) return;
    setError("");
    setArranging(true);
    try {
      const job = new Worker(new URL("./layout.worker.ts", import.meta.url));
      worker.current = job;
      job.onmessage = ({ data }) => {
        if (worker.current !== job || cy.destroyed()) return;
        if (data.error) setError(`Layout could not finish. ${data.error}`);
        else {
          cy.batch(() => {
            for (const p of data.positions) {
              const n = cy.getElementById(p.id);
              if (
                n.length &&
                !n.locked() &&
                Number.isFinite(p.x) &&
                Number.isFinite(p.y)
              )
                n.position({ x: p.x, y: p.y });
            }
          });
          if (fit) cy.fit(undefined, 65);
          persist();
        }
        cancelLayout();
      };
      job.onerror = () => {
        setError("Layout could not finish. Try Arrange again.");
        cancelLayout();
      };
      job.postMessage({
        nodes: cy.nodes().map((n) => {
          const size = n.layoutDimensions({
            nodeDimensionsIncludeLabels: true,
          });
          return {
            id: n.id(),
            ...n.position(),
            width: size.w,
            height: size.h,
            pinned: n.locked(),
          };
        }),
        edges: cy.edges().map((e) => ({
          id: e.id(),
          source: e.source().id(),
          target: e.target().id(),
        })),
      });
    } catch (e) {
      setError(`Layout could not start. ${String(e)}`);
      cancelLayout();
    }
  };
  useEffect(() => {
    const cy = cytoscape({
      container: host.current!,
      elements: [],
      layout: { name: "preset" },
      minZoom: 0.08,
      maxZoom: 3,
      selectionType: "single",
      boxSelectionEnabled: false,
    });
    instance.current = cy;
    saved.current = readPositions(storageKey);
    cy.on("tap", (e) => {
      if (e.target === cy) {
        callbacks.current.onClear();
        setHighlight(null);
      }
    });
    cy.on("tap", "node", (e) => {
      const key = e.target.data("key"),
        group = e.target.data("group");
      if (group) setExpanded((prev) => new Set([...prev, group]));
      else if (key) callbacks.current.onSelect(key);
    });
    cy.on("tap", "edge", (e) => {
      if (!e.target.data("aggregated") && e.target.data("targetKey"))
        callbacks.current.onSelect(
          e.target.data("targetKey"),
          e.target.data("anchor"),
        );
    });
    cy.on("grab", "node", cancelLayout);
    cy.on("dragfree", "node", (e) => {
      e.target.lock();
      persist();
    });
    cy.on("mouseover", "node, edge", (e) => {
      e.target.addClass("hovered");
      setHover(
        e.target.isNode()
          ? `${e.target.data("label")} · ${(e.target.data("values") as string[]).join(" + ") || "Unspecified"}`
          : e.target.data("label"),
      );
    });
    cy.on("mouseout", "node, edge", (e) => {
      e.target.removeClass("hovered");
      setHover("");
    });
    cy.on("zoom", () => setZoom(cy.zoom()));
    const observer = new ResizeObserver(() => {
      const oldWidth = cy.width(),
        oldHeight = cy.height(),
        pan = cy.pan();
      cy.resize();
      cy.pan({
        x: pan.x + (cy.width() - oldWidth) / 2,
        y: pan.y + (cy.height() - oldHeight) / 2,
      });
    });
    observer.observe(host.current!);
    return () => {
      worker.current?.terminate();
      persist();
      observer.disconnect();
      cy.destroy();
      instance.current = null;
    };
  }, [storageKey]);
  useEffect(() => {
    const cy = instance.current!;
    const dark = theme === "dark";
    cy.style([
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          width: 24,
          height: 24,
          label: "data(label)",
          color: dark ? "#dddfe9" : "#353946",
          "font-size": 12,
          "text-valign": "bottom",
          "text-margin-y": 9,
          "text-wrap": "ellipsis",
          "text-max-width": "160px",
          "text-outline-color": dark ? "#16171d" : "#f7f8fa",
          "text-outline-width": 3,
          "min-zoomed-font-size": 9,
          "border-width": 2,
          "border-color": dark ? "#262937" : "#fff",
        },
      },
      {
        selector: "node[?multi]",
        style: {
          "border-style": "double",
          "border-width": 5,
          "border-color": "data(color)",
        },
      },
      {
        selector: "node[group]",
        style: {
          shape: "round-rectangle",
          width: 125,
          height: 65,
          "background-opacity": 0.15,
          "border-color": "data(color)",
          "text-valign": "center",
          "text-margin-y": 0,
          "text-wrap": "wrap",
          "text-max-width": "115px",
          "font-size": 13,
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.2,
          "line-color": dark ? "#555b74" : "#c3c8d9",
          "target-arrow-color": dark ? "#555b74" : "#c3c8d9",
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.65,
          "curve-style": "bezier",
          opacity: 0.65,
          "font-size": 10,
          color: dark ? "#dddfe9" : "#53596c",
          "text-background-color": dark ? "#16171d" : "#fff",
          "text-background-opacity": 1,
          "text-background-padding": "3px",
          "text-rotation": "autorotate",
        },
      },
      {
        selector: "edge[?aggregated]",
        style: { label: "data(label)", width: 2, "min-zoomed-font-size": 9 },
      },
      {
        selector: "edge[?unresolved]",
        style: { "line-style": "dashed", "line-color": "#c19143" },
      },
      { selector: ".muted", style: { opacity: 0.12 } },
      {
        selector: "node.active, node.hovered",
        style: {
          "border-width": 4,
          "border-color": dark ? "#fff" : "#373964",
          "min-zoomed-font-size": 0,
          "z-index": 10,
        },
      },
      {
        selector: "edge.active, edge.hovered",
        style: {
          label: "data(label)",
          opacity: 1,
          width: 2,
          "line-color": "#8587d8",
          "target-arrow-color": "#8587d8",
          "z-index": 10,
        },
      },
      { selector: "node:locked", style: { shape: "diamond" } },
      {
        selector: "node.recent",
        style: { "border-color": "#37a68d", "border-width": 5 },
      },
    ]);
  }, [theme]);
  const previousView = useRef("");
  // Diff by identity: metadata refreshes, selection, and color changes never rerun layout.
  useEffect(() => {
    const cy = instance.current!;
    const wanted = new Set(
      [...model.vertices, ...model.connections].map((v) => v.id),
    );
    const wasEmpty = cy.nodes().empty();
    const view = JSON.stringify([
      overview,
      overview ? groupBy : "",
      overview ? [...expanded].sort() : [],
    ]);
    const fit = wasEmpty || previousView.current !== view;
    previousView.current = view;
    let added = false;
    if (cy.elements().filter((e) => !wanted.has(e.id())).length) cancelLayout();
    cy.batch(() => {
      cy.elements()
        .filter((e) => !wanted.has(e.id()))
        .remove();
      model.vertices.forEach((v, i) => {
        const existing = cy.getElementById(v.id);
        const values = v.values;
        const data = {
          ...v,
          color: color(values[0] ?? "Unspecified"),
          label: v.label,
          multi: values.length > 1,
        };
        if (existing.length) existing.data(data);
        else {
          added = true;
          const position = saved.current[v.id] ?? {
            x: Math.cos(i * 2.399) * 100 * Math.sqrt(i + 1),
            y: Math.sin(i * 2.399) * 100 * Math.sqrt(i + 1),
          };
          const n = cy.add({
            group: "nodes",
            data,
            position: { x: position.x, y: position.y },
          });
          if (saved.current[v.id]?.pinned) n.lock();
        }
      });
      model.connections.forEach((e) => {
        const old = cy.getElementById(e.id);
        if (old.length) old.data(e);
        else cy.add({ group: "edges", data: e });
      });
    });
    const allSaved = model.vertices.every((v) => saved.current[v.id]);
    if (added && !allSaved) runLayout(fit);
    else if (fit) cy.fit(undefined, 65);
    setPins(cy.nodes().filter((n) => n.locked()).length);
  }, [model]);
  useEffect(() => {
    const cy = instance.current!;
    cy.batch(() => {
      cy.elements().removeClass("muted active recent");
      const chosen = selected
        ? cy.getElementById(nodeId(selected))
        : cy.collection();
      if (highlight !== null) {
        const matches = cy
          .nodes()
          .filter((n) => (n.data("values") as string[]).includes(highlight));
        cy.elements().addClass("muted");
        matches.removeClass("muted").addClass("active");
        matches.edgesWith(matches).removeClass("muted");
      } else if (chosen.length) {
        cy.elements().addClass("muted");
        chosen.closedNeighborhood().removeClass("muted");
        chosen.addClass("active");
        chosen.connectedEdges().addClass("active");
      }
      cy.nodes()
        .filter((n) => changed.has(n.data("key")))
        .addClass("recent");
    });
  }, [selected, highlight, changed, model]);
  useEffect(() => {
    setHighlight(null);
    setExpanded(new Set());
  }, [groupBy]);
  useEffect(() => {
    instance.current?.fit(undefined, 65);
  }, [fitKey]);
  const selectedElement = selected
    ? instance.current?.getElementById(nodeId(selected))
    : undefined;
  const selectedNode = nodes.find((n) => n.key === selected);
  const legend = [...new Set(model.vertices.flatMap((n) => n.values))].sort();
  return (
    <>
      <div
        className="network-canvas"
        ref={host}
        role="img"
        aria-label={`Knowledge network: ${nodes.length} nodes. Use the node list to navigate by keyboard.`}
      />
      <div className="network-tools">
        <div className="network-modes" aria-label="Graph layout mode">
          <button
            aria-pressed={!overview}
            onClick={() => {
              setOverview(false);
            }}
          >
            Network
          </button>
          <button
            aria-pressed={overview}
            onClick={() => {
              setOverview(true);
              setExpanded(new Set());
            }}
          >
            Overview
          </button>
        </div>
        <button
          onClick={() => runLayout(true)}
          title="Rearrange unpinned nodes using their connections"
        >
          Arrange
        </button>
        {arranging && <button onClick={cancelLayout}>Cancel layout</button>}
        {pins > 0 && (
          <button
            onClick={() => {
              instance.current?.nodes().unlock();
              persist();
            }}
          >
            Unpin all ({pins})
          </button>
        )}
        <details className="network-node-list">
          <summary>Nodes ({nodes.length})</summary>
          <div>
            {nodes.map((n) => (
              <button
                key={n.key}
                onClick={() => {
                  setOverview(false);
                  onSelect(n.key);
                }}
                aria-pressed={selected === n.key}
              >
                {n.title}
              </button>
            ))}
          </div>
        </details>
      </div>
      <div className="network-legend" aria-label="Highlight memberships">
        {legend.map((value) => (
          <button
            key={value}
            aria-pressed={highlight === value}
            onClick={() => setHighlight(highlight === value ? null : value)}
          >
            <i style={{ background: color(value) }} />
            {value}
          </button>
        ))}
      </div>
      {selectedNode && (
        <div className="network-selection">
          <strong>{selectedNode.title}</strong>
          <span>
            {memberships(selectedNode, groupBy).join(" + ") || "Unspecified"}
          </span>
          <button
            disabled={!selectedElement?.length}
            onClick={() => {
              if (selectedElement?.locked()) selectedElement.unlock();
              else selectedElement?.lock();
              persist();
            }}
          >
            {selectedElement?.locked() ? "Unpin" : "Pin"} node
          </button>
        </div>
      )}
      {error && (
        <p className="network-error" role="alert">
          {error}
        </p>
      )}
      <div className="canvas-bottom">
        <span className="legend">
          {hover ||
            (overview
              ? "Click a group to expand · Exact membership sets"
              : "Drag a node to pin · Select to trace connections")}
          {model.unresolved > 0 &&
            ` · ${model.unresolved} unresolved links (see reader)`}
        </span>
        <div className="zoom-controls">
          <button
            aria-label="Zoom out"
            onClick={() => instance.current?.zoom(zoom / 1.25)}
          >
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Zoom in"
            onClick={() => instance.current?.zoom(zoom * 1.25)}
          >
            +
          </button>
          <button
            aria-label="Fit graph"
            onClick={() => instance.current?.fit(undefined, 65)}
          >
            Fit
          </button>
        </div>
      </div>
    </>
  );
}
