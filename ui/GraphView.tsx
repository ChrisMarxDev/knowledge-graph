import type { ColorConfig } from "../src/colors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core } from "cytoscape";
import {
  graphModel,
  nodeId,
  type GraphNode,
  type GraphEdge,
} from "./graph-model";
import { color } from "./graph-color";
import { visibleLabels } from "./graph-presentation";
import {
  dimensionColor,
  dimensionEntries,
  dimensionMarkers,
} from "./dimension-markers";
type Saved = Record<string, { x: number; y: number; pinned?: boolean }>;
function readPositions(key: string): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "{}");
    return Object.fromEntries(
      Object.entries(raw).filter(([id, p]) => {
        const point = p as Saved[string];
        return (
          id.startsWith("node:") &&
          point &&
          Number.isFinite(point.x) &&
          Number.isFinite(point.y)
        );
      }),
    ) as Saved;
  } catch {
    return {};
  }
}
export function GraphView({
  nodes,
  types,
  activeTypes,
  onToggleType,
  edges,
  selected,
  colors,
  onSelect,
  onClear,
  changed,
  fitKey,
  theme,
  project,
}: {
  nodes: GraphNode[];
  types: string[];
  activeTypes: string[];
  onToggleType: (value: string) => void;
  edges: GraphEdge[];
  selected: string | null;
  colors: ColorConfig;
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

  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [hover, setHover] = useState("");
  const [hoverCard, setHoverCard] = useState<{
    key?: string;
    x: number;
    y: number;
  } | null>(null);
  const model = useMemo(() => graphModel(nodes, edges, "type"), [nodes, edges]);
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
  };
  const worker = useRef<Worker | null>(null);
  const presentationFrame = useRef<number | null>(null);
  const updatePresentation = () => {
    if (presentationFrame.current !== null) return;
    presentationFrame.current = requestAnimationFrame(() => {
      presentationFrame.current = null;
      const cy = instance.current;
      if (!cy || cy.destroyed()) return;
      const focused = cy.nodes(".active, .hovered");
      // Measure the baseline labels independently of hover/selection styling.
      cy.nodes().removeStyle("font-size");
      const labels = visibleLabels(
        cy
          .nodes()
          .map((node) => ({
            id: node.id(),
            ...node.renderedBoundingBox({
              includeLabels: true,
              includeOverlays: false,
            }),
          }))
          .filter(
            (node) =>
              node.x2 >= 0 &&
              node.y2 >= 0 &&
              node.x1 <= cy.width() &&
              node.y1 <= cy.height(),
          ),
        cy.zoom(),
      );
      cy.batch(() => {
        cy.nodes().forEach((node) => {
          node.toggleClass("show-label", labels.has(node.id()));
        });
        cy.edges().toggleClass("detail", cy.zoom() >= 1.1);
        focused.style("font-size", Math.max(10, 10 / cy.zoom()));
      });
    });
  };
  const [arranging, setArranging] = useState(false);
  const cancelLayout = () => {
    worker.current?.terminate();
    worker.current = null;
    setArranging(false);
  };
  const fitGraph = () => {
    const cy = instance.current;
    if (!cy) return;
    cy.fit(undefined, 65);
    if (cy.zoom() > 1.35)
      cy.zoom({
        level: 1.35,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      });
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
          if (fit) fitGraph();
          persist();
        }
        cancelLayout();
      };
      job.onerror = () => {
        setError("Layout could not finish. Try Tidy graph again.");
        cancelLayout();
      };
      job.postMessage({
        nodes: cy.nodes().map((n) => {
          return {
            id: n.id(),
            ...n.position(),
            // Stable collision footprint, independent of zoom/hover titles.
            width: 48,
            height: 48,
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
    const canvas = host.current!;
    const onWheel = (event: WheelEvent) => {
      // Own wheel gestures before Cytoscape's default wheel-to-zoom handler.
      event.preventDefault();
      event.stopImmediatePropagation();
      const scaleX =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? canvas.clientWidth
            : 1;
      const scaleY =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? canvas.clientHeight
            : 1;
      const dx = event.deltaX * scaleX;
      const dy = event.deltaY * scaleY;
      if (event.metaKey) {
        const rect = canvas.getBoundingClientRect();
        cy.zoom({
          level: Math.max(
            cy.minZoom(),
            Math.min(cy.maxZoom(), cy.zoom() * Math.exp(-dy * 0.002)),
          ),
          renderedPosition: {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          },
        });
      } else {
        cy.panBy({ x: -dx, y: -dy });
      }
    };
    canvas.addEventListener("wheel", onWheel, {
      capture: true,
      passive: false,
    });
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
      }
    });
    cy.on("tap", "node", (e) => {
      const key = e.target.data("key");
      if (key) callbacks.current.onSelect(key);
    });
    cy.on("tap", "edge", (e) => {
      if (e.target.data("targetKey"))
        callbacks.current.onSelect(
          e.target.data("targetKey"),
          e.target.data("anchor"),
        );
    });
    cy.on("grab", "node", cancelLayout);
    cy.on("dragfree", "node", () => {
      persist();
    });
    cy.on("mouseover", "node, edge", (e) => {
      e.target.addClass("hovered");
      if (e.target.isNode())
        e.target.style("font-size", Math.max(10, 10 / cy.zoom()));
      if (e.target.isNode()) {
        const p = e.target.renderedPosition();
        setHoverCard({
          key: e.target.data("key"),
          x: p.x,
          y: p.y,
        });
      }

      setHover(
        e.target.isNode()
          ? `${e.target.data("label")} · ${(e.target.data("values") as string[]).join(" + ") || "Unspecified"}`
          : e.target.data("label"),
      );
    });
    cy.on("mouseout", "node, edge", (e) => {
      e.target.removeClass("hovered");
      if (e.target.isNode() && !e.target.hasClass("active"))
        e.target.removeStyle("font-size");
      setHover("");
      setHoverCard(null);
    });
    cy.on("zoom", () => setZoom(cy.zoom()));
    cy.on("pan zoom position", updatePresentation);
    cy.on("pan zoom grab", () => setHoverCard(null));
    const observer = new ResizeObserver(() => {
      const oldWidth = cy.width(),
        oldHeight = cy.height(),
        pan = cy.pan();
      cy.resize();
      cy.pan({
        x: pan.x + (cy.width() - oldWidth) / 2,
        y: pan.y + (cy.height() - oldHeight) / 2,
      });
      updatePresentation();
    });
    observer.observe(host.current!);
    return () => {
      canvas.removeEventListener("wheel", onWheel, true);
      worker.current?.terminate();
      persist();
      observer.disconnect();
      if (presentationFrame.current !== null)
        cancelAnimationFrame(presentationFrame.current);
      presentationFrame.current = null;
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
          "background-image": "data(markers)",
          "background-fit": "contain",
          "background-position-x": "50%",
          "background-position-y": "50%",
          width: 24,
          height: 24,
          label: "data(label)",
          "text-opacity": 0,
          color: dark ? "#dddfe9" : "#353946",
          "font-size": 10,
          "font-weight": 400,
          "text-valign": "bottom",
          "text-margin-y": 6,
          "text-wrap": "wrap",
          "text-max-width": "180px",
          "text-background-color": dark ? "#1b1e27" : "#fbfcfe",
          "text-background-opacity": 1,
          "text-background-padding": "0px",
          "text-background-shape": "roundrectangle",
          "text-outline-color": dark ? "#16171d" : "#f7f8fa",
          "text-outline-width": 0,
          "min-zoomed-font-size": 0,
          "border-width": 1.5,
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
        selector: "edge",
        style: {
          width: 0.8,
          "line-color": dark ? "#858ba4" : "#78829e",
          "target-arrow-color": dark ? "#858ba4" : "#78829e",
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.4,
          "curve-style": "bezier",
          opacity: 0.3,
          "font-size": 10,
          color: dark ? "#dddfe9" : "#53596c",
          "text-background-color": dark ? "#16171d" : "#fff",
          "text-background-opacity": 1,
          "text-background-padding": "3px",
          "text-rotation": "autorotate",
        },
      },
      { selector: "node.show-label", style: { "text-opacity": 1 } },
      { selector: "edge.detail", style: { opacity: 0.5, "arrow-scale": 0.65 } },
      {
        selector: "edge[?unresolved]",
        style: { "line-style": "dashed", "line-color": "#c19143" },
      },
      { selector: "node.muted", style: { opacity: 0.3 } },
      { selector: "edge.muted", style: { opacity: 0.12 } },
      {
        selector: "node.active, node.hovered",
        style: {
          "text-opacity": 1,
          "border-color": dark ? "#fff" : "#373964",
          "min-zoomed-font-size": 0,
          opacity: 1,
          "z-index": 10,
        },
      },
      {
        selector: "edge.active, edge.hovered",
        style: {
          label: "data(label)",
          opacity: 1,
          width: 2,
          "arrow-scale": 0.8,
          "line-color": "#8587d8",
          "target-arrow-color": "#8587d8",
          "z-index": 10,
        },
      },
      {
        selector: "node.recent",
        style: { "border-color": "#37a68d", "border-width": 5 },
      },
    ]);
    updatePresentation();
  }, [theme]);
  // Diff by identity: metadata refreshes, selection, and color changes never rerun layout.
  useEffect(() => {
    const cy = instance.current!;
    const wanted = new Set(
      [...model.vertices, ...model.connections].map((v) => v.id),
    );
    const fit = cy.nodes().empty();
    let added = false;
    if (cy.elements().filter((e) => !wanted.has(e.id())).length) cancelLayout();
    const byKey = new Map(nodes.map((n) => [n.key, n]));
    cy.batch(() => {
      cy.elements()
        .filter((e) => !wanted.has(e.id()))
        .remove();
      model.vertices.forEach((v, i) => {
        const existing = cy.getElementById(v.id);
        const values = v.values;
        const data = {
          ...v,
          markers:
            v.key && byKey.has(v.key)
              ? dimensionMarkers(byKey.get(v.key)!, colors)
              : "none",
          color: color(values[0] ?? "Unspecified", colors),
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
          cy.add({
            group: "nodes",
            data,
            position: { x: position.x, y: position.y },
          });
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
    else if (fit) fitGraph();
    updatePresentation();
  }, [model, colors]);
  useEffect(() => {
    const cy = instance.current!;
    cy.batch(() => {
      cy.elements().removeClass("muted active recent");
      const chosen = selected
        ? cy.getElementById(nodeId(selected))
        : cy.collection();
      if (chosen.length) {
        cy.elements().addClass("muted");
        chosen.closedNeighborhood().removeClass("muted");
        chosen.addClass("active");
        chosen.connectedEdges().addClass("active");
      }
      cy.nodes()
        .filter((n) => changed.has(n.data("key")))
        .addClass("recent");
    });
    updatePresentation();
  }, [selected, changed, model]);
  useEffect(() => {
    fitGraph();
  }, [fitKey]);

  const hoveredNode = hoverCard?.key
    ? nodes.find((n) => n.key === hoverCard.key)
    : undefined;
  return (
    <>
      <div
        className="network-canvas"
        ref={host}
        role="img"
        aria-label={`Knowledge network: ${nodes.length} nodes. Switch to List to navigate by keyboard.`}
      />
      <div className="network-legend" aria-label="Filter by type">
        {types.map((value) => (
          <button
            className="legend-chip"
            key={value}
            aria-pressed={activeTypes.includes(value)}
            title={`${activeTypes.includes(value) ? "Remove" : "Add"} type filter: ${value || "Unspecified"}`}
            onClick={() => onToggleType(value)}
          >
            <i style={{ background: color(value, colors) }} />
            {value || "Unspecified"}
          </button>
        ))}
      </div>
      {hoverCard && hoveredNode && (
        <div
          className="graph-tooltip"
          role="tooltip"
          style={{
            left: Math.max(
              12,
              Math.min(
                hoverCard.x + 22,
                (host.current?.clientWidth ?? 400) - 336,
              ),
            ),
            top: Math.max(
              12,
              Math.min(
                hoverCard.y + 22,
                (host.current?.clientHeight ?? 500) - 310,
              ),
            ),
          }}
        >
          <small>{hoveredNode.type}</small>
          <strong>{hoveredNode.title}</strong>
          {hoveredNode.description && (
            <p className="hover-description">{hoveredNode.description}</p>
          )}
          <div className="hover-dimensions">
            {Object.entries(hoveredNode.dimensions).map(([name, values]) => (
              <div key={name}>
                <b>{name}</b>
                <span className="dimension-values">
                  {values.map((value) => (
                    <span className="dimension-swatch" key={value}>
                      <i
                        style={{
                          background: dimensionColor(name, value, colors),
                        }}
                      />
                      {value}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="hover-counts">
            {
              edges.filter(
                (e) =>
                  e.source === hoveredNode.key || e.target === hoveredNode.key,
              ).length
            }{" "}
            connections · {hoveredNode.sections.length} sections ·{" "}
            {hoveredNode.files.length} files
          </p>
          {!!hoveredNode.sections.length && (
            <p className="hover-sections">
              {hoveredNode.sections
                .slice(0, 3)
                .map((s) => s.title)
                .join(" · ")}
              {hoveredNode.sections.length > 3 ? " · …" : ""}
            </p>
          )}
          <code>{hoveredNode.key}</code>
          <small>Click to read · Drag to move</small>
        </div>
      )}
      {error && (
        <p className="network-error" role="alert">
          {error}
        </p>
      )}
      <div className="canvas-bottom">
        <span className="legend">
          {hover}
          {model.unresolved > 0 &&
            ` · ${model.unresolved} unresolved links (see reader)`}
        </span>
        <div className="zoom-controls">
          <button
            aria-label={arranging ? "Cancel arrangement" : "Tidy graph"}
            title={arranging ? "Cancel arrangement" : "Tidy graph"}
            onClick={() => (arranging ? cancelLayout() : runLayout(true))}
          >
            {arranging ? (
              "×"
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="15" y="3" width="6" height="6" rx="1" />
                <rect x="3" y="15" width="6" height="6" rx="1" />
                <rect x="15" y="15" width="6" height="6" rx="1" />
              </svg>
            )}
          </button>
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
          <button aria-label="Fit graph" onClick={fitGraph}>
            Fit
          </button>
        </div>
      </div>
    </>
  );
}
