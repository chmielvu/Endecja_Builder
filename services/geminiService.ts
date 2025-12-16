import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MultiDirectedGraph } from 'graphology';
import { ML_CONFIG } from '../config/mlConfig';
import { useGraphStore } from '../state/graphStore';
import { Jurisdiction, NodeType, Provenance } from '../types';

// Ensure process.env is typed
declare const process: {
  env: {
    API_KEY?: string;
  }
};

// Singleton instance holder
let aiInstance: GoogleGenAI | null = null;

// Helper to get or initialize the client safely
function getAiClient(): GoogleGenAI {
  if (aiInstance) return aiInstance;

  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    const errorMessage = "Gemini API Key is missing. Please configure process.env.API_KEY.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
}

// Shared schema for operations
const OPS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    operations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: 'Type of operation: ADD_NODE, ADD_EDGE, UPDATE_NODE, DELETE_NODE, DELETE_EDGE' },
          nodeId: { type: Type.STRING, description: 'Node ID for ADD_NODE, UPDATE_NODE, DELETE_NODE' },
          edgeId: { type: Type.STRING, description: 'Edge ID for ADD_EDGE, DELETE_EDGE' },
          source: { type: Type.STRING, description: 'Source node ID for ADD_EDGE' },
          target: { type: Type.STRING, description: 'Target node ID for ADD_EDGE' },
          attributes: {
            type: Type.OBJECT,
            description: 'New or updated attributes for node/edge',
            properties: { // Must be non-empty for OBJECT type
              label: { type: Type.STRING, description: 'Label for the node or edge.' },
              category: { type: Type.STRING, description: 'Category for the node.' },
              relationshipType: { type: Type.STRING, description: 'Type of relationship for the edge.' },
              weight: { type: Type.NUMBER, description: 'Weight of the edge.' },
              sign: { type: Type.NUMBER, description: 'Sign of the edge (1, -1, or 0).' },
              // Add more common attributes as needed, or just one generic one.
              // Allowing additional properties for dynamic attributes.
            },
            additionalProperties: true,
            required: [], // No specific attribute is always required within this generic schema
          },
        },
        required: ['type'],
      },
      description: 'List of graph modification operations.',
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        nodeCount: { type: Type.NUMBER },
        edgeCount: { type: Type.NUMBER },
        density: { type: Type.NUMBER },
        averageDegree: { type: Type.NUMBER },
        frustrationIndex: { type: Type.NUMBER },
        topInfluencers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { // Must be non-empty for OBJECT type
              id: { type: Type.STRING, description: 'Node ID' },
              label: { type: Type.STRING, description: 'Node label' },
              score: { type: Type.NUMBER, description: 'Influence score' },
            },
            required: ['id', 'label', 'score'],
          },
          description: 'Top nodes by influence score.',
        },
        communities: {
          type: Type.OBJECT,
          description: 'Community assignments for nodes (nodeId: communityId).',
          properties: { // Must be non-empty for OBJECT type
            // Placeholder to satisfy non-empty properties constraint.
            // Actual keys will be dynamic node IDs.
            "example_node_id": { type: Type.NUMBER, description: "Example: Community ID assigned to a node." }
          },
          additionalProperties: { type: Type.NUMBER }, // Correctly defines dynamic string-to-number map
          required: [], // The example node is not actually required.
        },
      },
      description: 'Calculated graph metrics.',
    },
    historicalSummary: { type: Type.STRING, description: 'A concise historical interpretation of the graph or entities.' },
    sources: { // URLs from Google Search grounding
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          uri: { type: Type.STRING },
          title: { type: Type.STRING }
        }
      },
      description: 'URLs from external grounding tools.'
    }
  },
  required: ['operations', 'historicalSummary'], // Operations and a summary are always expected
  propertyOrdering: ["operations", "metrics", "historicalSummary", "sources"]
};

/**
 * Applies a list of structured graph operations to the given Graphology graph.
 * This is the client-side interpretation and application of Gemini's suggestions.
 */
export function applyGraphOperations(graph: MultiDirectedGraph, ops: any[], fileName: string = 'AI Inference') {
  const store = useGraphStore.getState();
  ops.forEach(op => {
    const defaultProvenance: Provenance = {
      source: fileName,
      confidence: 0.7,
      method: 'inference',
      sourceClassification: 'ai_inference',
      timestamp: Date.now()
    };
    
    // Helper to robustly create a provenance array
    const createProvenanceArray = (prov: any): Provenance[] => {
        if (!prov) return [defaultProvenance];
        if (Array.isArray(prov)) return prov;
        return [prov];
    };

    switch (op.type) {
      case 'ADD_NODE':
        if (!op.nodeId || graph.hasNode(op.nodeId)) return;
        // Ensure op.attributes is an object before spreading.
        const nodeAttrs = {
          label: op.attributes?.label || `New ${op.nodeId}`,
          category: op.attributes?.category || NodeType.CONCEPT,
          jurisdiction: op.attributes?.jurisdiction || Jurisdiction.OTHER,
          valid_time: op.attributes?.valid_time || { start: 1900, end: 1939 },
          x: Math.random() * 20 - 10,
          y: Math.random() * 20 - 10,
          size: op.attributes?.size || 10,
          color: op.attributes?.color || '#aaaaaa',
          financial_weight: op.attributes?.financial_weight || 0.5,
          secrecy_level: op.attributes?.secrecy_level || 1,
          provenance: createProvenanceArray(op.attributes?.provenance),
          // Refined type guard to ensure op.attributes is a non-null, non-array object before spreading.
          ...(typeof op.attributes === 'object' && op.attributes !== null && !Array.isArray(op.attributes) ? op.attributes : {} as Record<string, any>)
        };
        graph.addNode(op.nodeId, nodeAttrs);
        break;
      case 'ADD_EDGE':
        if (!op.source || !op.target || !graph.hasNode(op.source) || !graph.hasNode(op.target)) return;
        const edgeKey = op.edgeId || `edge_${op.source}_${op.target}_${Date.now()}`;
        if (graph.hasEdge(edgeKey)) return; // Avoid duplicate edge keys
        // Ensure op.attributes is an object before spreading.
        const edgeAttrs = {
          relationshipType: op.attributes?.relationshipType || 'relates_to',
          weight: op.attributes?.weight || 1,
          sign: op.attributes?.sign || 1,
          valid_time: op.attributes?.valid_time || { start: 1900, end: 1939 },
          is_hypothetical: op.attributes?.is_hypothetical || false,
          color: op.attributes?.color || undefined,
          size: op.attributes?.size || undefined,
          provenance: createProvenanceArray(op.attributes?.provenance),
          // Refined type guard to ensure op.attributes is a non-null, non-array object before spreading.
          ...(typeof op.attributes === 'object' && op.attributes !== null && !Array.isArray(op.attributes) ? op.attributes : {} as Record<string, any>)
        };
        graph.addDirectedEdgeWithKey(edgeKey, op.source, op.target, edgeAttrs);
        break;
      case 'UPDATE_NODE':
        if (op.nodeId && graph.hasNode(op.nodeId) && op.attributes) {
          Object.entries(op.attributes).forEach(([key, value]) => {
            if (key === 'provenance') { // Append new provenance, don't overwrite
                const existingProv = graph.getNodeAttribute(op.nodeId, 'provenance');
                const newProv = Array.isArray(value) ? value : [value];
                graph.setNodeAttribute(op.nodeId, key, [...existingProv, ...newProv]);
            } else {
                graph.setNodeAttribute(op.nodeId, key, value);
            }
          });
        }
        break;
      case 'DELETE_NODE':
        if (op.nodeId && graph.hasNode(op.nodeId)) {
          graph.dropNode(op.nodeId);
        }
        break;
      case 'DELETE_EDGE':
        if (op.edgeId && graph.hasEdge(op.edgeId)) {
          graph.dropEdge(op.edgeId);
        }
        break;
      default:
        console.warn('Unknown graph operation type:', op.type);
    }
  });
  store.refresh();
}

/**
 * Scout Agent: Uses gemini-2.5-flash-lite and Google Search for grounded graph expansion or entity extraction.
 * It suggests new nodes and edges, citing sources.
 */
export async function scout(
  contextPrompt: string, // Describes the task (e.g., "extract entities", "expand around node")
  graphContext: { nodes: string[]; edges: string[] }, // Current graph state for context
  additionalContent?: string, // e.g., document text to analyze
): Promise<{ operations: any[], historicalSummary: string, sources: Array<{ uri: string, title: string }> }> {
  const ai = getAiClient();
  let contentsParts: any[] = [{ text: contextPrompt }];

  if (additionalContent) {
    contentsParts.push({ text: `Analyze the following document:\n${additionalContent}` });
  }

  // Include a summary of the current graph for context
  contentsParts.push({ text: `Current graph state:\nNodes: ${graphContext.nodes.join(', ')}\nEdges: ${graphContext.edges.join('; ')}`});

  // System instruction for Scout
  const systemInstruction = `You are a diligent and neutral academic historian of interwar Polish politics.
Your task is to identify and propose new nodes and edges for a knowledge graph, or extract entities from provided text.
All proposed information MUST be directly verifiable and grounded in external search results.
Ensure node IDs are unique, lowercase, and use underscores (e.g., "roman_dmowski").
When suggesting operations, default 'sourceClassification' in provenance to 'ai_inference'.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: ML_CONFIG.SCOUT_MODEL,
      contents: { parts: contentsParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: OPS_SCHEMA,
        thinkingConfig: ML_CONFIG.THINKING_SCOUT,
        tools: [{ googleSearch: {} }],
        // `systemInstruction` is correctly placed inside `config`.
        systemInstruction: systemInstruction,
        // Move `generationConfig` properties inside `config` as per guidelines example.
        ...ML_CONFIG.GENERATION_CONFIG,
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error("Empty response from Gemini Scout for graph operations.");
    }
    const result = JSON.parse(jsonStr);

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const urls: Array<{ uri: string, title: string }> = [];
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          urls.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
        }
      }
    }
    return {
      operations: result.operations || [],
      historicalSummary: result.historicalSummary || "No summary provided by Scout.",
      sources: urls,
    };
  } catch (error) {
    console.error("Gemini Scout Error:", error);
    throw new Error(`Scout operation failed: ${error}`);
  }
}

/**
 * Architect Agent: Uses gemini-2.5-flash and code_execution (NetworkX) for neuro-symbolic graph analysis.
 * It computes complex metrics and provides historical interpretation, along with graph update operations.
 */
export async function architectAnalysis(
  graph: MultiDirectedGraph // The full Graphology graph instance
): Promise<{ operations: any[], metrics: any, historicalSummary: string }> {
  const ai = getAiClient();

  // Export a simplified version of the graph suitable for NetworkX/JSON
  const nodesForLLM = graph.nodes().map(n => ({
    id: n,
    label: graph.getNodeAttribute(n, 'label'),
    category: graph.getNodeAttribute(n, 'category'),
    // Include relevant attributes for analysis, exclude complex objects like provenance
    financial_weight: graph.getNodeAttribute(n, 'financial_weight'),
    secrecy_level: graph.getNodeAttribute(n, 'secrecy_level'),
  }));
  const edgesForLLM = graph.edges().map(e => ({
    source: graph.source(e),
    target: graph.target(e),
    relationshipType: graph.getEdgeAttribute(e, 'relationshipType'),
    sign: graph.getEdgeAttribute(e, 'sign'), // Important for signed balance
    weight: graph.getEdgeAttribute(e, 'weight'),
  }));

  const graphDataJson = JSON.stringify({ nodes: nodesForLLM, edges: edgesForLLM }, null, 2);

  const prompt = `You are a computational historian and network scientist, expert in analyzing social graphs of historical political movements.
Your task is to perform a neuro-symbolic analysis of the provided Polish National Democracy (Endecja) network data from 1893-1939.

GRAPH DATA:
\`\`\`json
${graphDataJson}
\`\`\`

You MUST use the \`code_execution\` tool to perform the following steps:
1.  **Load Data**: Create a NetworkX \`MultiDiGraph\` object from the provided JSON data. Ensure edges are added with a 'sign' attribute.
2.  **Centrality**: Compute normalized betweenness centrality for all nodes.
3.  **Community Detection**: Run Louvain community detection to identify factions.
4.  **Structural Balance (Frustration Index)**: Implement a function to calculate the exact frustration index. Iterate over all existing triangles (triads) in the graph. For each triangle, calculate the product of the signs of its three edges. If the product is negative (-1), the triangle is unbalanced; if positive (+1), it is balanced. The frustration index is the ratio of unbalanced triangles to the total number of triangles.
5.  **Identify Influencers**: Determine the top 10 nodes by betweenness centrality.
6.  **Output**: Print the results as a single JSON object. The JSON should have the following structure:
    \`\`\`json
    {
      "metrics": {
        "nodeCount": <number>,
        "edgeCount": <number>,
        "density": <number>,
        "averageDegree": <number>,
        "frustrationIndex": <number>,
        "topInfluencers": [{"id": "<node_id>", "label": "<node_label>", "score": <score>}, ...],
        "communities": {"<node_id>": <community_id>, ...}
      },
      "operations": [
        {"type": "UPDATE_NODE", "nodeId": "<node_id>", "attributes": {"betweenness": <score>, "community": <id>}},
        // ... other update operations for all nodes with new betweenness and community attributes
      ],
      "historicalSummary": "<A concise, objective historical interpretation of the network structure, its key findings, potential conflicts, and resilience, based on the computed metrics and your historical expertise, max 400 words. DO NOT MAKE UP FACTS. Refer to general concepts like centralisation, fragmentation, structural balance etc.>"
    }
    \`\`\`

Strictly adhere to the output JSON schema. Ensure node labels are included for top influencers.
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: ML_CONFIG.ARCHITECT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: OPS_SCHEMA,
        thinkingConfig: ML_CONFIG.THINKING_ARCHITECT,
        tools: [{ codeExecution: {} }],
        // `systemInstruction` is correctly placed inside `config`.
        systemInstruction: `You are a highly analytical and objective computational historian. Focus solely on graph analysis and historical interpretation based on data.`,
        // Move `generationConfig` properties inside `config` as per guidelines example.
        ...ML_CONFIG.GENERATION_CONFIG,
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error("Empty response from Gemini Architect for graph analysis.");
    }
    const result = JSON.parse(jsonStr);

    return {
      operations: result.operations || [],
      metrics: result.metrics,
      historicalSummary: result.historicalSummary || "No summary provided by Architect.",
    };
  } catch (error) {
    console.error("Gemini Architect Error:", error);
    throw new Error(`Architect analysis failed: ${error}`);
  }
}
