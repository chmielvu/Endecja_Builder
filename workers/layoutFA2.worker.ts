import ForceAtlas2 from 'graphology-layout-forceatlas2';
import { MultiDirectedGraph } from 'graphology';

self.onmessage = (e) => {
  const { graphData, iterations, settings } = e.data;
  
  // Reconstruct graph from serialized data
  const graph = new MultiDirectedGraph();
  graph.import(graphData);

  // Run Layout
  const positions = ForceAtlas2(graph, {
    iterations: iterations || 50,
    settings: settings || {
      gravity: 1,
      scalingRatio: 10,
      barnesHutOptimize: true
    }
  });

  self.postMessage({ positions });
};