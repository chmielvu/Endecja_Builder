import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes } from '../types';

export function extractFeatureMatrix(graph: MultiDirectedGraph<NodeAttributes, any>): number[][] {
  const nodes = graph.nodes();
  const matrix: number[][] = [];

  nodes.forEach(node => {
    const attr = graph.getNodeAttributes(node);
    
    // Construct feature vector
    const vector = [
      graph.degree(node),
      graph.inDegree(node),
      graph.outDegree(node),
      attr.financial_weight || 0,
      attr.secrecy_level || 0,
      // If we have text embeddings, spread them here
      ...(attr.radicalization_vector ? Array.from(attr.radicalization_vector) : new Array(768).fill(0))
    ];

    matrix.push(vector);
  });

  return matrix;
}

export function extractAdjacencyMatrix(graph: MultiDirectedGraph<any, any>): number[][] {
  const nodes = graph.nodes();
  const n = nodes.length;
  const nodeIndex = new Map<string, number>(nodes.map((id, i) => [id, i] as [string, number]));
  
  // Initialize zero matrix
  const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

  graph.forEachEdge((edge, attr, source, target) => {
    const i = nodeIndex.get(source);
    const j = nodeIndex.get(target);
    if (i !== undefined && j !== undefined) {
      // Normalize weight by degree could happen here
      matrix[i][j] = 1; 
      // For undirected aggregation logic, usually symmetric:
      matrix[j][i] = 1; 
    }
  });

  return matrix;
}