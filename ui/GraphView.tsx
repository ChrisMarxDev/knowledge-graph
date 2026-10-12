import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core } from "cytoscape";
import {
  graphModel,
  nodeId,
  type GraphNode,
  type GraphEdge,
} from "./graph-model";
import { color } from "./graph-color";
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
  const [highlight, setHighlight] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [hover, setHover] = useState("");
  const [hoverCard, setHoverCard] = useState<{
    key?: string;
    x: number;
    y: number;
  } | null>(null);
  const model = useMemo(
    () => graphModel(nodes, edges, groupBy),
    [nodes, edges, groupBy],
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
  };
  const worker = useRef<Worker | null>(null);
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
        setHighlight(null);
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
      setHover("");
      setHoverCard(null);
    });
    cy.on("zoom", () => setZoom(cy.zoom()));
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
    });
    observer.observe(host.current!);
    return () => {
      canvas.removeEventListener("wheel", onWheel, true);
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
          "background-image": "data(markers)",
          "background-fit": "contain",
          "background-position-x": "50%",
          "background-position-y": "50%",
          width: 32,
          height: 32,
          label: "data(label)",
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
          "min-zoomed-font-size": 7,
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
        selector: "edge[?unresolved]",
        style: { "line-style": "dashed", "line-color": "#c19143" },
      },
      { selector: ".muted", style: { opacity: 0.3 } },
      {
        selector: "node.active, node.hovered",
        style: {
          "border-width": 4,
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
              ? dimensionMarkers(byKey.get(v.key)!)
              : "none",
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
  }, [groupBy]);
  useEffect(() => {
    fitGraph();
  }, [fitKey]);

  const legend = [...new Set(model.vertices.flatMap((n) => n.values))].sort();
  const dimensionLegend = [
    ...new Map(
      nodes
        .flatMap(dimensionEntries)
        .map((d) => [JSON.stringify([d.name, d.value]), d]),
    ).values(),
  ].sort(
    (a, b) => a.name.localeCompare(b.name) || a.value.localeCompare(b.value),
  );
  const hoveredNode = hoverCard?.key
    ? nodes.find((n) => n.key === hoverCard.key)
    : undefined;
  return (
    <>
      <div
        className="network-canvas"
        ref={host}
        role="img"
        aria-label={`Knowledge network: ${nodes.length} nodes. Use the node list to navigate by keyboard.`}
      />
      <div className="network-tools">
        <button
          onClick={() => runLayout(true)}
          title="Rearrange nodes using their connections"
        >
          Arrange
        </button>
        {arranging && <button onClick={cancelLayout}>Cancel layout</button>}
        <details className="network-node-list">
          <summary>Nodes ({nodes.length})</summary>
          <div>
            {nodes.map((n) => (
              <button
                key={n.key}
                onClick={() => {
                  onSelect(n.key);
                }}
                aria-pressed={selected === n.key}
              >
                {n.title}
              </button>
            ))}
          </div>
        </details>
        {!!dimensionLegend.length && (
          <details className="network-node-list dimension-key">
            <summary>Dimension dots</summary>
            <div>
              <p>
                Small dots show dimension values; the main fill follows Color
                by. A + dot means more values.
              </p>
              {dimensionLegend.map((d) => (
                <span
                  className="dimension-swatch"
                  key={JSON.stringify([d.name, d.value])}
                >
                  <i style={{ background: d.color }} />
                  <span>
                    {d.name}: {d.value}
                  </span>
                </span>
              ))}
            </div>
          </details>
        )}
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
                          background: dimensionColor(name, value),
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
          {hover || "Drag a node to move · Select to trace connections"}
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
          <button aria-label="Fit graph" onClick={fitGraph}>
            Fit
          </button>
        </div>
      </div>
    </>
  );
}
