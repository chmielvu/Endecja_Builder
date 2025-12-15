import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes } from '../types';

export function exportGraphToJSON(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>) {
  const data = graph.export();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `endecja-graph-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importGraphFromJSON(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}