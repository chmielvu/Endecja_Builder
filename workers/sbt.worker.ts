import { MultiDirectedGraph } from 'graphology';

// Naive implementation of triad census for signed graphs
self.onmessage = (e) => {
  const { graphData } = e.data;
  const graph = new MultiDirectedGraph();
  graph.import(graphData);

  let balanced = 0;
  let unbalanced = 0;

  // Simplification: Iterate neighbors of neighbors
  // In a real app, use optimized graphology-clique or matrix multiplication
  graph.forEachNode((node) => {
    graph.forEachNeighbor(node, (neighbor) => {
      if (node >= neighbor) return; // Avoid duplicates

      graph.forEachNeighbor(neighbor, (other) => {
        if (neighbor >= other || node >= other) return;

        if (graph.hasEdge(node, other)) {
            // Found a triangle: node-neighbor-other
            const e1 = graph.getEdgeAttribute(node, neighbor, 'sign') || 1;
            const e2 = graph.getEdgeAttribute(neighbor, other, 'sign') || 1;
            const e3 = graph.getEdgeAttribute(node, other, 'sign') || 1;

            const product = e1 * e2 * e3;
            if (product > 0) balanced++;
            else unbalanced++;
        }
      });
    });
  });

  const frustrationIndex = unbalanced / (balanced + unbalanced || 1);

  self.postMessage({ frustrationIndex, balanced, unbalanced });
};