import cytoscape, {
  type Core,
  type LayoutOptions,
  type EdgeSingular,
} from "cytoscape";
import fcose from "cytoscape-fcose";
cytoscape.use(fcose);
export type LayoutRequest = {
  nodes: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pinned: boolean;
  }[];
  edges: { id: string; source: string; target: string }[];
};
export function forceLayout(request: LayoutRequest) {
  // Relationship multiplicity/direction carries meaning in the reader, but
  // should not multiply spring forces or collapse tightly documented pairs.
  const pairs = new Map<string, LayoutRequest["edges"][number]>();
  const ids = new Set(request.nodes.map((n) => n.id));
  for (const edge of request.edges) {
    if (
      edge.source === edge.target ||
      !ids.has(edge.source) ||
      !ids.has(edge.target)
    )
      continue;
    const [source, target] = [edge.source, edge.target].sort();
    const id = JSON.stringify([source, target]);
    pairs.set(id, { id: `layout:${id}`, source, target });
  }
  const edges = [...pairs.values()].sort((a, b) => a.id.localeCompare(b.id));
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  const hubDegree = (edge: EdgeSingular) =>
    Math.max(
      degree.get(edge.source().id()) ?? 1,
      degree.get(edge.target().id()) ?? 1,
    );
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    layout: { name: "preset" },
    style: [
      {
        selector: "node",
        style: { width: "data(width)", height: "data(height)" },
      },
    ],
    elements: [
      ...[...request.nodes]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((n) => ({ data: n, position: { x: n.x, y: n.y } })),
      ...edges.map((e) => ({ data: e })),
    ],
  });
  try {
    const fixed = request.nodes
      .filter((n) => n.pinned)
      .map((n) => ({ nodeId: n.id, position: { x: n.x, y: n.y } }));
    cy.layout({
      name: "fcose",
      quality: "proof",
      randomize: false,
      animate: false,
      fit: false,
      nodeRepulsion: () => 12000,
      idealEdgeLength: (edge: EdgeSingular) =>
        110 + Math.min(90, 18 * Math.sqrt(hubDegree(edge) - 1)),
      edgeElasticity: (edge: EdgeSingular) => 0.45 / Math.sqrt(hubDegree(edge)),
      gravity: 0.15,
      numIter:
        request.nodes.length > 300
          ? 250
          : request.nodes.length > 100
            ? 500
            : 1200,
      packComponents: false,
      ...(fixed.length ? { fixedNodeConstraint: fixed } : {}),
    } as LayoutOptions).run();
    // fCoSE's optional packing requires a separate extension. Pack disconnected
    // components here; never translate explicitly fixed positions.
    if (!fixed.length) packComponents(cy);
    return cy
      .nodes()
      .map((n) => ({ id: n.id(), x: n.position("x"), y: n.position("y") }));
  } finally {
    cy.destroy();
  }
}

function packComponents(cy: Core) {
  const groups = cy
    .elements()
    .components()
    .map((component) => ({
      nodes: component.nodes(),
      bounds: component
        .nodes()
        .boundingBox({ includeLabels: false, includeOverlays: false }),
      key: component
        .nodes()
        .map((node) => node.id())
        .sort()[0],
    }))
    .sort(
      (a, b) => b.nodes.length - a.nodes.length || a.key.localeCompare(b.key),
    );
  if (groups.length < 2) return;
  const gap = 90;
  const targetWidth = Math.max(
    ...groups.map((g) => g.bounds.w),
    Math.sqrt(
      groups.reduce(
        (sum, g) => sum + (g.bounds.w + gap) * (g.bounds.h + gap),
        0,
      ),
    ) * 1.3,
  );
  const original = cy
    .nodes()
    .boundingBox({ includeLabels: false, includeOverlays: false });
  let x = 0,
    y = 0,
    rowHeight = 0;
  for (const group of groups) {
    if (x && x + group.bounds.w > targetWidth) {
      x = 0;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    group.nodes.shift({ x: x - group.bounds.x1, y: y - group.bounds.y1 });
    x += group.bounds.w + gap;
    rowHeight = Math.max(rowHeight, group.bounds.h);
  }
  const packed = cy
    .nodes()
    .boundingBox({ includeLabels: false, includeOverlays: false });
  cy.nodes().shift({
    x: (original.x1 + original.x2 - packed.x1 - packed.x2) / 2,
    y: (original.y1 + original.y2 - packed.y1 - packed.y2) / 2,
  });
}
