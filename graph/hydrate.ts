import { MultiDirectedGraph } from 'graphology';
import { GraphData, NodeAttributes, EdgeAttributes, GraphAttributes, NodeType, Jurisdiction, Provenance, DateRange } from '../types';
import { GLOBAL_SEED, SeededRandom } from '../utils/seeds';
import { seedData } from './seedData';

const rng = new SeededRandom(GLOBAL_SEED);

// --- Validation Helpers ---

function validateNodeSchema(node: any): boolean {
  if (!node || typeof node !== 'object') {
    console.warn('Invalid node: Not an object', node);
    return false;
  }
  // Check for ID (Graphology export uses 'key', Seed uses 'id')
  const id = node.id || node.key;
  if (typeof id !== 'string' || !id) {
    console.warn('Invalid node: Missing or invalid ID/Key', node);
    return false;
  }
  return true;
}

function validateEdgeSchema(edge: any): boolean {
  if (!edge || typeof edge !== 'object') {
    console.warn('Invalid edge: Not an object', edge);
    return false;
  }
  if (typeof edge.source !== 'string' || !edge.source) {
    console.warn('Invalid edge: Missing source', edge);
    return false;
  }
  if (typeof edge.target !== 'string' || !edge.target) {
    console.warn('Invalid edge: Missing target', edge);
    return false;
  }
  return true;
}

// --- Helpers ---

function parseDateRange(dateStr?: string): DateRange {
  if (!dateStr) return { start: 1890, end: 1940 }; // Default range

  // Handle "YYYY-YYYY"
  const rangeMatch = dateStr.match(/^(\d{4})-(\d{4})$/);
  if (rangeMatch) {
    return { start: parseInt(rangeMatch[1]), end: parseInt(rangeMatch[2]) };
  }

  // Handle "YYYY" or "YYYY-MM"
  const singleMatch = dateStr.match(/^(\d{4})/);
  if (singleMatch) {
    const year = parseInt(singleMatch[1]);
    return { start: year, end: year };
  }

  return { start: 1890, end: 1940 };
}

function determineJurisdiction(id: string, label: string): Jurisdiction {
  const l = (label || id).toLowerCase();
  if (l.includes('dmowski') || l.includes('poplawski') || l.includes('warszawa')) return Jurisdiction.KONGRESOWKA;
  if (l.includes('pilsudski') || l.includes('galicja') || l.includes('lwow')) return Jurisdiction.GALICJA;
  if (l.includes('poznan') || l.includes('hotel bazar') || l.includes('seyda')) return Jurisdiction.WIELKOPOLSKA;
  if (l.includes('paryz') || l.includes('komitet')) return Jurisdiction.EMIGRACJA;
  return Jurisdiction.OTHER;
}

function mapNodeType(typeStr?: string): NodeType {
  if (!typeStr) return NodeType.LOCATION;
  switch (typeStr.toLowerCase()) {
    case 'person': return NodeType.PERSON;
    case 'organization': return NodeType.ORGANIZATION;
    case 'event': return NodeType.EVENT;
    case 'publication': return NodeType.PUBLICATION;
    case 'concept': return NodeType.CONCEPT;
    case 'myth': return NodeType.MYTH;
    default: return NodeType.LOCATION;
  }
}

function determineEdgeSign(rel: string): 1 | -1 | 0 {
  const negative = ['rywal', 'przeciw', 'walka', 'odłącz', 'sprzeciw'];
  if (negative.some(k => rel.toLowerCase().includes(k))) return -1;
  return 1;
}

function getNodeColor(type: NodeType): string {
  switch (type) {
    case NodeType.PERSON: return '#2c241b'; // Ink
    case NodeType.ORGANIZATION: return '#8b0000'; // Dark Red
    case NodeType.CONCEPT: return '#1e3a5f'; // Navy
    case NodeType.EVENT: return '#d4af37'; // Gold
    case NodeType.PUBLICATION: return '#704214'; // Sepia
    case NodeType.MYTH: return '#7b2cbf'; // Myth Purple
    default: return '#704214';
  }
}

// --- Main Functions ---

export function createEmptyGraph(): MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> {
  return new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
}

export function hydrateGraph(data: any): MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> {
  const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
  
  // Use provided data or fallback to seedData
  const nodes = data.nodes || seedData.nodes;
  const edges = data.edges || seedData.edges;

  // 1. Bulk Import Nodes
  nodes.forEach((n: any) => {
    if (!validateNodeSchema(n)) return;

    // Support both 'id' (seed) and 'key' (graphology)
    const id = n.id || n.key;

    // Generate deterministic visuals based on ID (simple hash)
    const idHash = id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const x = (idHash % 100) + rng.range(-20, 20);
    const y = ((idHash * 31) % 100) + rng.range(-20, 20);

    const valid_time = parseDateRange(n.dates);
    const jurisdiction = determineJurisdiction(id, n.label || id);
    const nodeType = mapNodeType(n.type || n.category); // Handle both formats

    const attributes: NodeAttributes = {
      label: n.label || id,
      category: nodeType, // Renamed from type
      description: n.description,
      jurisdiction: jurisdiction,
      valid_time: valid_time,
      x: x,
      y: y,
      size: (n.importance || 0.5) * 15 + 5,
      color: getNodeColor(nodeType),
      financial_weight: rng.range(0.1, 1.0),
      secrecy_level: n.type === 'organization' && (n.label?.includes('Liga') || n.label?.includes('Zet')) ? 5 : 1,
      provenance: {
        source: 'Endecja Database v1.0',
        confidence: 1.0,
        method: 'archival',
        timestamp: Date.now()
      }
    };

    if (!graph.hasNode(id)) {
      graph.addNode(id, attributes);
    }
  });

  // 2. Bulk Import Edges
  edges.forEach((e: any, idx: number) => {
    if (!validateEdgeSchema(e)) return;

    if (graph.hasNode(e.source) && graph.hasNode(e.target)) {
      const valid_time = parseDateRange(e.dates);
      const sign = determineEdgeSign(e.relationship || '');
      
      const attributes: EdgeAttributes = {
        relationshipType: e.relationship || 'arrow', // Use new name 'relationshipType'
        weight: 1,
        sign: sign,
        valid_time: valid_time,
        is_hypothetical: false,
        provenance: {
          source: 'Endecja Database v1.0',
          confidence: 1.0,
          method: 'archival',
          timestamp: Date.now()
        }
      };

      const key = e.key || `e_${idx}`;
      if (!graph.hasEdge(key)) {
         graph.addEdgeWithKey(key, e.source, e.target, attributes);
      }
    }
  });

  // 3. Process Myths as Nodes and Connect to Related Nodes
  if (data.myths && Array.isArray(data.myths)) {
    data.myths.forEach((myth: any) => {
      // Create Myth Node
      const mythId = myth.id;
      if (!graph.hasNode(mythId)) {
        const attributes: NodeAttributes = {
          label: myth.title,
          category: NodeType.MYTH, // Renamed
          description: `MIT: ${myth.claim}\n\nPRAWDA: ${myth.truth}`,
          jurisdiction: Jurisdiction.OTHER,
          valid_time: { start: 1890, end: 1945 },
          x: rng.range(-30, 30),
          y: rng.range(-30, 30),
          size: 25, // Myths are prominent
          color: getNodeColor(NodeType.MYTH),
          financial_weight: 0,
          secrecy_level: 1,
          provenance: {
            source: 'Historical Analysis (Myths)',
            confidence: 1.0,
            method: 'inference',
            timestamp: Date.now()
          }
        };
        graph.addNode(mythId, attributes);
      }

      // Create Edges to Related Nodes
      if (myth.relatedNodes && Array.isArray(myth.relatedNodes)) {
        myth.relatedNodes.forEach((targetId: string) => {
          if (graph.hasNode(targetId)) {
            const edgeKey = `edge_myth_${mythId}_${targetId}`;
            if (!graph.hasEdge(edgeKey)) {
              graph.addEdgeWithKey(edgeKey, mythId, targetId, {
                relationshipType: 'dotyczy', // 'relates to' - Use new name
                weight: 2,
                sign: 0, // Neutral/Informational
                valid_time: { start: 1890, end: 1945 },
                is_hypothetical: false,
                color: '#7b2cbf', // Match myth node color
                provenance: {
                  source: 'Myth Analysis',
                  confidence: 1.0,
                  method: 'inference',
                  timestamp: Date.now()
                }
              });
            }
          }
        });
      }
    });
  }

  // 4. Attach Global Attributes
  if (data.metadata) graph.setAttribute('metadata', data.metadata);
  if (data.timeline) graph.setAttribute('timeline', data.timeline);
  if (data.sources) graph.setAttribute('sources', data.sources);
  if (data.myths) graph.setAttribute('myths', data.myths);

  return graph;
}

export function fromJSON(jsonStr: string): MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes> {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON string", e);
    throw new Error("Invalid JSON format");
  }

  // Check if it looks like a Graphology export (nodes have 'key' and 'attributes')
  const isGraphologyExport = data.nodes && data.nodes.length > 0 && 'key' in data.nodes[0] && 'attributes' in data.nodes[0];

  if (isGraphologyExport) {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    try {
        graph.import(data);
        return graph;
    } catch (e) {
        console.warn("Graphology import failed, falling back to manual hydration", e);
    }
  }

  // Fallback: Use hydration logic for raw/seed-like data
  return hydrateGraph(data);
}

export function toJSON(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): string {
  return JSON.stringify(graph.export(), null, 2);
}

// Deprecated: use hydrateGraph with no args to load seed
export function generateMockData(): GraphData {
    return { nodes: [], edges: [] };
}