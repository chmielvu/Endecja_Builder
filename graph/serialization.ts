import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes } from '../types';
import { hydrateGraph } from './hydrate';

export function exportGraphToJSON(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>) {
  const data = {
    metadata: {
      exported: new Date().toISOString(),
      version: '1.0',
      nodes_count: graph.order,
      edges_count: graph.size
    },
    nodes: graph.mapNodes((node, attrs) => ({
      id: node,
      label: attrs.label,
      type: attrs.type,
      jurisdiction: attrs.jurisdiction,
      dates: `${attrs.valid_time.start}-${attrs.valid_time.end}`,
      importance: (attrs.size || 10) / 20, // Reverse engineer from size
      ...attrs // Include other attributes safely
    })),
    edges: graph.mapEdges((edge, attrs, source, target) => ({
      source,
      target,
      relationship: attrs.type,
      dates: `${attrs.valid_time.start}-${attrs.valid_time.end}`,
      sign: attrs.sign
    }))
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `endecja-graph-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importGraphFromJSON(file: File): Promise<MultiDirectedGraph<NodeAttributes, EdgeAttributes>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Validate structure
        if (!json.nodes) {
          throw new Error('Invalid graph format: missing nodes');
        }

        // Use existing hydration logic
        const graph = hydrateGraph(json);
        resolve(graph);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}