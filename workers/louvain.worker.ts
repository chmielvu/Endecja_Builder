import louvain from 'graphology-communities-louvain';
import { MultiDirectedGraph } from 'graphology';

self.onmessage = (e) => {
  const { graphData } = e.data;
  const graph = new MultiDirectedGraph();
  graph.import(graphData);

  // Run Louvain
  // Cast to any because graphology-communities-louvain types can be tricky in workers
  const communities = louvain(graph as any);

  self.postMessage({ communities });
};