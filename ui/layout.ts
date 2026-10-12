import cytoscape, { type LayoutOptions } from "cytoscape";
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
      ...request.nodes.map((n) => ({ data: n, position: { x: n.x, y: n.y } })),
      ...request.edges.map((e) => ({ data: e })),
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
      nodeRepulsion: () => 7000,
      idealEdgeLength: () => 100,
      numIter:
        request.nodes.length > 300
          ? 250
          : request.nodes.length > 100
            ? 500
            : 1200,
      packComponents: false,
      ...(fixed.length ? { fixedNodeConstraint: fixed } : {}),
    } as LayoutOptions).run();
    return cy
      .nodes()
      .map((n) => ({ id: n.id(), x: n.position("x"), y: n.position("y") }));
  } finally {
    cy.destroy();
  }
}
