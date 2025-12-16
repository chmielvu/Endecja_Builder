import { NodeType } from '../types';

export function getNodeColor(category: NodeType): string {
  const colors: Record<NodeType, string> = {
    [NodeType.PERSON]: '#2c241b', // Ink
    [NodeType.ORGANIZATION]: '#8b0000', // Dark Red
    [NodeType.CONCEPT]: '#1e3a5f', // Navy
    [NodeType.EVENT]: '#d4af37', // Gold
    [NodeType.PUBLICATION]: '#704214', // Sepia
    [NodeType.MYTH]: '#7b2cbf', // Myth Purple
    [NodeType.LOCATION]: '#4a6741' // Earthy Green
  };
  return colors[category] || '#704214'; 
}

export function getEdgeColor(sign: number): string {
  if (sign === -1) return '#991b1b'; // Alert Red
  if (sign === 1) return '#3d5c45'; // Lighter Green
  return '#9ca3af'; // Gray for neutral
}
