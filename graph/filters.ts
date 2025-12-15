import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes } from '../types';

export function filterByJurisdiction(graph: MultiDirectedGraph<NodeAttributes, any>, jurisdiction: string) {
  return graph.filterNodes((node, attr) => attr.jurisdiction === jurisdiction);
}

export function filterByTime(graph: MultiDirectedGraph<NodeAttributes, any>, year: number) {
  return graph.filterNodes((node, attr) => 
    attr.valid_time.start <= year && attr.valid_time.end >= year
  );
}