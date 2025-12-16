import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes } from '../types';
import { betweenness } from 'graphology-metrics/centrality';
import louvain from 'graphology-communities-louvain';

// This file is retained for type definitions but the analyzeGraph function is no longer used,
// as the primary graph analysis is now offloaded to the Gemini Architect agent using code_execution.

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  density: number;
  averageDegree: number;
  topInfluencers: Array<{ id: string; label: string; score: number }>;
  communities: Map<string, number>;
  frustrationIndex: number;
}

/*
// The analyzeGraph function is being deprecated in favor of Gemini Architect's capabilities.
// Keeping it commented out for historical reference if needed, but not actively used.
export async function analyzeGraph(
  graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>
): Promise<GraphStats> {
  // Basic metrics
  const nodeCount = graph.order;
  const edgeCount = graph.size;
  const density = graph.size / (graph.order * (graph.order - 1) || 1); // Avoid division by zero
  const averageDegree = (2 * graph.size) / graph.order;

  // Centrality
  // Explicitly cast to Record<string, number> to ensure TS knows the values are numbers
  const betweennessScores = betweenness(graph) as Record<string, number>;
  const topInfluencers = Object.entries(betweennessScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id, score]) => ({
      id,
      label: graph.getNodeAttribute(id, 'label'),
      score
    }));

  // Communities
  // Cast to any because of type definition mismatches in some environments, then to Record
  const communitiesRaw = louvain(graph as any) as Record<string, number>;
  const communities = new Map<string, number>(Object.entries(communitiesRaw));

  // Frustration Index (simplified client-side calculation)
  // This is a naive implementation and will be superseded by the Architect agent's precise NetworkX calculation.
  let balanced = 0;
  let unbalanced = 0;

  graph.forEachEdge((edge, attr, source, target) => {
    // Avoid self-loops for triad check logic setup (though triads usually involve 3 nodes)
    if (source === target) return;

    const sourceNeighbors = new Set(graph.neighbors(source));
    const targetNeighbors = new Set(graph.neighbors(target));
    
    // Find common neighbors to form triads
    const commonNeighbors = [...sourceNeighbors].filter(n => targetNeighbors.has(n));
    
    commonNeighbors.forEach(common => {
      // Get the sign of the current edge
      const e1 = attr.sign;
      
      // Get signs of other two edges in the triangle. 
      // Note: In MultiGraph, 'graph.edge(a,b)' returns an arbitrary edge key. 
      // This is a simplification. Ideally, we iterate all edges between pairs.
      const edge2Key = graph.edge(source, common);
      const edge3Key = graph.edge(target, common);

      if (edge2Key && edge3Key) {
          const e2 = graph.getEdgeAttribute(edge2Key, 'sign') || 1;
          const e3 = graph.getEdgeAttribute(edge3Key, 'sign') || 1;
          
          if (e1 * e2 * e3 > 0) balanced++;
          else unbalanced++;
      }
    });
  });

  // Each triangle is counted multiple times in this loop, but the ratio holds.
  const frustrationIndex = unbalanced / (balanced + unbalanced || 1);

  return {
    nodeCount,
    edgeCount,
    density,
    averageDegree,
    topInfluencers,
    communities,
    frustrationIndex
  };
}
*/
