import { betweenness } from 'graphology-metrics/centrality';
import { MultiDirectedGraph } from 'graphology';

self.onmessage = (e) => {
  const { graphData } = e.data;
  const graph = new MultiDirectedGraph();
  graph.import(graphData);

  const scores = betweenness(graph);

  self.postMessage({ scores });
};