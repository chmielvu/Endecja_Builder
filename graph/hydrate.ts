

import { MultiDirectedGraph } from 'graphology';
import { GraphData, NodeAttributes, EdgeAttributes, GraphAttributes, NodeType, Jurisdiction, Provenance, DateRange, Stance, NodeImage } from '../types';
import { GLOBAL_SEED, SeededRandom } from '../utils/seeds';
import { seedData } from './seedData';
import * as z from 'zod';
// Import color utility functions from utils/visuals to avoid circular dependency
import { getNodeColor, getEdgeColor } from '../utils/visuals';

const rng = new SeededRandom(GLOBAL_SEED);

// --- Zod Schemas for Runtime Validation ---

const zDateRange = z.object({
  start: z.number().int().min(1000, "Year must be at least 1000").default(1890),
  end: z.number().int().min(1000, "Year must be at least 1000").default(1945),
  granularity: z.enum(['day', 'month', 'year', 'decade']).optional(),
  circa: z.boolean().optional(),
}).refine(data => data.start <= data.end, {
  message: "Start year cannot be after end year",
  path: ["start"],
});

const zProvenance = z.object({
  source: z.string().min(1, "Source is required"),
  confidence: z.number().min(0).max(1).default(0.7),
  method: z.enum(['archival', 'inference', 'interpolation']).default('inference'),
  sourceClassification: z.enum(['primary', 'secondary', 'hostile', 'myth', 'ai_inference']).default('ai_inference'),
  model_tag: z.string().optional(),
  timestamp: z.number().int().default(() => Date.now()),
  notes: z.string().optional(),
});

const zNodeImage = z.object({
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|gif|webp);base64,/, "Invalid base64 image data URL"),
  caption: z.string().optional(),
  credit: z.string().optional(),
  creditUrl: z.string().url().optional(),
  alt: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const zNodeAttributes = z.object({
  label: z.string().min(1, "Label is required"),
  category: z.nativeEnum(NodeType).default(NodeType.CONCEPT),
  description: z.string().optional(),
  jurisdiction: z.nativeEnum(Jurisdiction).default(Jurisdiction.OTHER),
  valid_time: zDateRange,
  x: z.number().optional(),
  y: z.number().optional(),
  size: z.number().min(1).optional(),
  color: z.string().optional(),

  // Historical attributes
  financial_weight: z.number().min(0).max(1).default(0.5),
  secrecy_level: z.number().int().min(1).max(5).default(1),

  // ML attributes
  radicalization_vector: z.instanceof(Float32Array).optional(),
  community: z.number().int().optional(),
  betweenness: z.number().optional(),

  // NEW: Visual Builder Mode attributes
  descriptionHtml: z.string().optional(),
  images: z.array(zNodeImage).default([]),
  provenance: z.array(zProvenance).min(1, "Provenance is required").default([{
    source: 'LLM Validator Default',
    confidence: 0.5,
    method: 'inference',
    sourceClassification: 'ai_inference',
    timestamp: Date.now(),
    notes: 'Default provenance for repaired node'
  }]),
});

const zEdgeAttributes = z.object({
  relationshipType: z.string().min(1, "Relationship type is required").default('RELATED_TO'),
  weight: z.number().min(0).default(1),
  sign: z.union([z.literal(1), z.literal(-1), z.literal(0)]).default(0),
  stance: z.nativeEnum(Stance).optional(),
  valid_time: zDateRange,

  // Sigma.js rendering properties, often modified by reducers
  color: z.string().optional(),
  size: z.number().optional(),

  // Logic
  is_hypothetical: z.boolean().default(false),

  // NEW: Visual Builder Mode attributes
  descriptionText: z.string().optional(),
  provenance: z.array(zProvenance).min(1, "Provenance is required").default([{
    source: 'LLM Validator Default',
    confidence: 0.5,
    method: 'inference',
    sourceClassification: 'ai_inference',
    timestamp: Date.now(),
    notes: 'Default provenance for repaired edge'
  }]),
});


// --- Helpers ---

// Existing helpers, adapted for Zod defaults if needed
function parseDateRange(dateStr?: string): DateRange {
  if (!dateStr) return { start: 1890, end: 1940 };

  const rangeMatch = dateStr.match(/^(\d{4})-(\d{4})$/);
  if (rangeMatch) {
    return { start: parseInt(rangeMatch[1]), end: parseInt(rangeMatch[2]) };
  }

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
  const normalizedType = typeStr.toLowerCase();
  if (Object.values(NodeType).includes(normalizedType as NodeType)) {
    return normalizedType as NodeType;
  }
  return NodeType.LOCATION;
}

function determineEdgeSign(rel: string): 1 | -1 | 0 {
  const negative = ['rywal', 'przeciw', 'walka', 'odłącz', 'sprzeciw', 'opposition', 'conflict'];
  const positive = ['alliance', 'support', 'founded', 'collaborated', 'mentor'];
  if (negative.some(k => rel.toLowerCase().includes(k))) return -1;
  if (positive.some(k => rel.toLowerCase().includes(k))) return 1;
  return 0; // Default to neutral
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
  nodes.forEach((n: any, i: number) => {
    // Support both 'id' (seed) and 'key' (graphology)
    const id = n.id || n.key;
    if (typeof id !== 'string' || !id) {
      console.warn('Skipping node due to missing or invalid ID:', n);
      return;
    }

    let parsedAttrs: z.infer<typeof zNodeAttributes>;
    const result = zNodeAttributes.safeParse(n);

    if (!result.success) {
      console.warn(`Node ${id} failed Zod validation. Attempting partial repair:`, result.error.issues);
      // Attempt to build valid attributes from partial data and defaults
      const partialAttrs = result.error.issues.reduce((acc: any, issue) => {
        // Collect valid paths and existing values
        const path = issue.path.join('.');
        let currentValue = n;
        for (const p of issue.path) {
          if (currentValue && typeof currentValue === 'object' && p in currentValue) {
            currentValue = currentValue[p];
          } else {
            currentValue = undefined;
            break;
          }
        }
        if (currentValue !== undefined) {
          let obj = acc;
          for (let k = 0; k < issue.path.length - 1; k++) {
            const key = issue.path[k];
            if (!(key in obj)) {
              obj[key] = typeof issue.path[k+1] === 'number' ? [] : {};
            }
            obj = obj[key];
          }
          obj[issue.path[issue.path.length - 1]] = currentValue;
        }
        return acc;
      }, {});

      // Apply intelligent defaults if not provided in raw data
      partialAttrs.label = partialAttrs.label || id;
      partialAttrs.category = partialAttrs.category ? mapNodeType(partialAttrs.category) : NodeType.CONCEPT;
      partialAttrs.jurisdiction = partialAttrs.jurisdiction ? determineJurisdiction(id, partialAttrs.label) : Jurisdiction.OTHER;
      partialAttrs.valid_time = partialAttrs.valid_time ? zDateRange.parse(partialAttrs.valid_time) : parseDateRange(n.dates);
      partialAttrs.provenance = partialAttrs.provenance || [{
        source: 'LLM Validation Repair',
        confidence: 0.6,
        method: 'inference',
        sourceClassification: 'ai_inference',
        timestamp: Date.now(),
        notes: `Original node data failed validation: ${result.error.issues.map(e => e.message).join(', ')}`
      }];
      
      parsedAttrs = zNodeAttributes.parse(partialAttrs); // Final parse after defaults
      // Ensure specific defaults if not provided by Zod defaults
      parsedAttrs.color = parsedAttrs.color || getNodeColor(parsedAttrs.category);
      parsedAttrs.size = parsedAttrs.size || (parsedAttrs.financial_weight || 0.5) * 15 + 5;
      
    } else {
      parsedAttrs = result.data;
      // Ensure color and size are set, even if Zod defaults handled some things
      parsedAttrs.color = parsedAttrs.color || getNodeColor(parsedAttrs.category);
      parsedAttrs.size = parsedAttrs.size || (parsedAttrs.financial_weight || 0.5) * 15 + 5;
    }

    // Assign initial layout if not present
    if (parsedAttrs.x === undefined || parsedAttrs.y === undefined) {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const radius = 30 + (i % 3) * 5;
      parsedAttrs.x = radius * Math.cos(angle);
      parsedAttrs.y = radius * Math.sin(angle);
    }

    if (!graph.hasNode(id)) {
      graph.addNode(id, parsedAttrs);
    }
  });

  // 2. Bulk Import Edges
  edges.forEach((e: any, idx: number) => {
    const sourceId = e.source;
    const targetId = e.target;
    const edgeKey = e.key || `e_${idx}`;

    if (!graph.hasNode(sourceId) || !graph.hasNode(targetId)) {
      console.warn(`Skipping edge ${edgeKey}: Source (${sourceId}) or target (${targetId}) node does not exist.`, e);
      return;
    }

    let parsedAttrs: z.infer<typeof zEdgeAttributes>;
    // Graphology export puts attributes directly, raw seed puts them flat
    const edgeToParse = e.attributes || e;
    const result = zEdgeAttributes.safeParse(edgeToParse);

    if (!result.success) {
      console.warn(`Edge ${edgeKey} failed Zod validation. Skipping:`, result.error.issues);
      return; // Skip invalid edges
    } else {
      parsedAttrs = result.data;
      // Ensure color is set, even if Zod defaults handled some things
      parsedAttrs.color = parsedAttrs.color || getEdgeColor(parsedAttrs.sign);
      parsedAttrs.valid_time = parsedAttrs.valid_time || parseDateRange(e.dates);
    }
    
    if (!graph.hasEdge(edgeKey)) {
      graph.addEdgeWithKey(edgeKey, sourceId, targetId, parsedAttrs);
    }
  });

  // 3. Process Myths as Nodes and Connect to Related Nodes (with Zod validation)
  if (data.myths && Array.isArray(data.myths)) {
    data.myths.forEach((myth: any, i: number) => {
      const mythId = myth.id;
      if (!graph.hasNode(mythId)) {
        let mythAttrs: z.infer<typeof zNodeAttributes>;
        const mythNodeData = {
          label: myth.title,
          category: NodeType.MYTH,
          description: `MIT: ${myth.claim}\n\nPRAWDA: ${myth.truth}`,
          jurisdiction: Jurisdiction.OTHER,
          valid_time: parseDateRange("1890-1945"),
          size: 25,
          color: getNodeColor(NodeType.MYTH),
          provenance: [{
            source: 'Historical Analysis (Myths)',
            confidence: 1.0,
            method: 'inference',
            sourceClassification: 'myth',
            timestamp: Date.now()
          }],
          // Position myths in a separate cluster or outer ring
          x: 45 * Math.cos((i / data.myths.length) * 2 * Math.PI),
          y: 45 * Math.sin((i / data.myths.length) * 2 * Math.PI),
          ...myth // Spread any other properties
        };
        const result = zNodeAttributes.safeParse(mythNodeData);
        if (!result.success) {
          console.warn(`Myth node ${mythId} failed Zod validation. Skipping:`, result.error.issues);
          return;
        }
        mythAttrs = result.data;
        mythAttrs.color = mythAttrs.color || getNodeColor(mythAttrs.category);
        mythAttrs.size = mythAttrs.size || 25; // Ensure myth size
        graph.addNode(mythId, mythAttrs);
      }

      // Create Edges to Related Nodes
      if (myth.relatedNodes && Array.isArray(myth.relatedNodes)) {
        myth.relatedNodes.forEach((targetId: string) => {
          if (graph.hasNode(targetId)) {
            const edgeKey = `edge_myth_${mythId}_${targetId}`;
            if (!graph.hasEdge(edgeKey)) {
              const edgeData = {
                relationshipType: 'dotyczy',
                weight: 2,
                sign: 0,
                valid_time: parseDateRange("1890-1945"),
                is_hypothetical: false,
                color: '#7b2cbf',
                provenance: [{
                  source: 'Myth Analysis',
                  confidence: 1.0,
                  method: 'inference',
                  sourceClassification: 'myth',
                  timestamp: Date.now()
                }]
              };
              const result = zEdgeAttributes.safeParse(edgeData);
              if (!result.success) {
                console.warn(`Myth edge ${edgeKey} failed Zod validation. Skipping:`, result.error.issues);
                return;
              }
              const edgeAttrs = result.data;
              edgeAttrs.color = edgeAttrs.color || getEdgeColor(edgeAttrs.sign);
              graph.addEdgeWithKey(edgeKey, mythId, targetId, edgeAttrs);
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
  const isGraphologyExport = data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0 && 
                             'key' in data.nodes[0] && 'attributes' in data.nodes[0];

  if (isGraphologyExport) {
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    try {
        // For graphology exports, re-hydrate attributes through Zod where possible
        // This is a more complex task than simply importing as graphology expects a specific format.
        // The most robust way is to re-map to our internal structure and then hydrate.
        const hydratedNodes = data.nodes.map((n: any) => {
          const parsed = zNodeAttributes.safeParse(n.attributes);
          return {
            ...n,
            attributes: parsed.success ? parsed.data : { ...n.attributes, ...zNodeAttributes.parse({}) } // Default valid attrs
          };
        });
        const hydratedEdges = data.edges.map((e: any) => {
          const parsed = zEdgeAttributes.safeParse(e.attributes);
          return {
            ...e,
            attributes: parsed.success ? parsed.data : { ...e.attributes, ...zEdgeAttributes.parse({}) } // Default valid attrs
          };
        });

        graph.import({ ...data, nodes: hydratedNodes, edges: hydratedEdges });
        return graph;
    } catch (e) {
        console.warn("Graphology import failed even with Zod re-mapping, falling back to basic hydration logic", e);
    }
  }

  // Fallback: Use hydration logic for raw/seed-like data or if graphology import failed
  return hydrateGraph(data);
}

export function toJSON(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>): string {
  return JSON.stringify(graph.export(), null, 2);
}

// Deprecated: use hydrateGraph with no args to load seed
export function generateMockData(): GraphData {
    return { nodes: [], edges: [] };
}
