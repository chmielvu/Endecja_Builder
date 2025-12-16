import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MultiDirectedGraph } from 'graphology';
import { ML_CONFIG } from '../config/mlConfig';
import { useGraphStore } from '../state/graphStore';
import { Jurisdiction, NodeType, Provenance } from '../types';

declare const process: {
  env: {
    API_KEY?: string;
  }
};

let aiInstance: GoogleGenAI | null = null;

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

// ============================================================================
// ENHANCED SCHEMA DEFINITIONS
// ============================================================================

const NODE_OPERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    type: { 
      type: Type.STRING, 
      enum: ['ADD_NODE', 'UPDATE_NODE', 'DELETE_NODE'],
      description: 'Operation type' 
    },
    nodeId: { 
      type: Type.STRING, 
      description: 'Unique node identifier (lowercase, underscores, e.g., "roman_dmowski_1920")' 
    },
    attributes: {
      type: Type.OBJECT,
      properties: {
        label: { type: Type.STRING, description: 'Human-readable label' },
        category: { 
          type: Type.STRING, 
          enum: ['person', 'organization', 'event', 'publication', 'concept', 'myth', 'location'],
          description: 'Node category'
        },
        description: { 
          type: Type.STRING, 
          description: 'Detailed historical description with dates, context, and significance' 
        },
        jurisdiction: {
          type: Type.STRING,
          enum: ['Kongresowka', 'Galicja', 'Wielkopolska', 'Emigracja', 'Other'],
          description: 'Historical jurisdiction/partition'
        },
        valid_time: {
          type: Type.OBJECT,
          properties: {
            start: { type: Type.NUMBER, description: 'Start year (e.g., 1893)' },
            end: { type: Type.NUMBER, description: 'End year (e.g., 1939)' }
          },
          required: ['start', 'end']
        },
        importance: { 
          type: Type.NUMBER, 
          description: 'Historical importance score 0.0-1.0' 
        },
        secrecy_level: { 
          type: Type.NUMBER, 
          description: 'Organization secrecy level 1-5 (1=public, 5=clandestine)' 
        }
      },
      required: ['label', 'category']
    }
  },
  required: ['type', 'nodeId']
};

const EDGE_OPERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    type: { 
      type: Type.STRING, 
      enum: ['ADD_EDGE', 'DELETE_EDGE'],
      description: 'Operation type' 
    },
    edgeId: { 
      type: Type.STRING, 
      description: 'Unique edge identifier' 
    },
    source: { type: Type.STRING, description: 'Source node ID' },
    target: { type: Type.STRING, description: 'Target node ID' },
    attributes: {
      type: Type.OBJECT,
      properties: {
        relationshipType: { 
          type: Type.STRING, 
          description: 'Relationship label (e.g., "founded", "opposed", "collaborated_with")' 
        },
        sign: { 
          type: Type.NUMBER, 
          enum: [1, -1, 0],
          description: 'Relationship polarity: 1=positive/alliance, -1=negative/conflict, 0=neutral' 
        },
        weight: { 
          type: Type.NUMBER, 
          description: 'Relationship strength 0.0-1.0' 
        },
        valid_time: {
          type: Type.OBJECT,
          properties: {
            start: { type: Type.NUMBER },
            end: { type: Type.NUMBER }
          }
        },
        evidence: { 
          type: Type.STRING, 
          description: 'Brief citation or evidence for this relationship' 
        }
      },
      required: ['relationshipType', 'sign']
    }
  },
  required: ['type', 'source', 'target']
};

const SCOUT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    operations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        oneOf: [NODE_OPERATION_SCHEMA, EDGE_OPERATION_SCHEMA]
      },
      description: 'List of graph operations to perform'
    },
    historicalSummary: {
      type: Type.STRING,
      description: 'Scholarly 2-3 paragraph historical interpretation explaining the significance of discovered entities and relationships. Must be grounded in search results.'
    },
    methodology: {
      type: Type.STRING,
      description: 'Brief explanation of research methodology and source evaluation'
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Overall confidence score 0.0-1.0 based on source quality'
    },
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          uri: { type: Type.STRING },
          title: { type: Type.STRING },
          relevance: { 
            type: Type.STRING,
            description: 'Brief note on how this source was used'
          }
        }
      },
      description: 'Grounding sources from Google Search'
    }
  },
  required: ['operations', 'historicalSummary', 'confidence']
};

const ARCHITECT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    operations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['UPDATE_NODE'] },
          nodeId: { type: Type.STRING },
          attributes: {
            type: Type.OBJECT,
            properties: {
              betweenness: { type: Type.NUMBER },
              community: { type: Type.NUMBER },
              structural_role: { 
                type: Type.STRING,
                description: 'Interpreted role: hub, bridge, peripheral, isolated'
              }
            }
          }
        }
      }
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
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              score: { type: Type.NUMBER },
              interpretation: { 
                type: Type.STRING,
                description: 'Why this actor was structurally important'
              }
            }
          }
        },
        communities: {
          type: Type.OBJECT,
          additionalProperties: { type: Type.NUMBER }
        },
        structuralFindings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Key structural observations (e.g., "Network exhibits core-periphery structure")'
        }
      },
      required: ['nodeCount', 'edgeCount', 'frustrationIndex']
    },
    historicalInterpretation: {
      type: Type.STRING,
      description: 'Detailed 3-4 paragraph historical analysis connecting network structure to historical outcomes. Must reference specific structural patterns.'
    },
    methodologicalNotes: {
      type: Type.STRING,
      description: 'Technical explanation of metrics calculated and their historical validity'
    }
  },
  required: ['operations', 'metrics', 'historicalInterpretation']
};

// ============================================================================
// ENHANCED AGENT SYSTEM INSTRUCTIONS
// ============================================================================

const SCOUT_SYSTEM_INSTRUCTION = `You are Dr. Helena Kowalska, a distinguished computational historian specializing in interwar Polish political movements with expertise in prosopography and social network analysis.

## Your Mission
Extract historically accurate entities and relationships from documents or expand knowledge graphs using rigorous academic standards.

## Core Principles
1. **Verification First**: Every claim must be traceable to a reliable source found via Google Search
2. **Temporal Precision**: Always specify exact or approximate dates (years at minimum)
3. **Source Hierarchy**: Prioritize primary sources > peer-reviewed scholarship > reputable secondary sources
4. **Uncertainty Acknowledgment**: Express confidence levels honestly; prefer no claim over unsupported speculation
5. **Contextual Richness**: Provide historical context, not just bare facts

## Entity Extraction Guidelines
- **Persons**: Full name, birth-death years, roles, jurisdictions, key relationships
- **Organizations**: Founding/dissolution dates, purpose, key members, evolution
- **Events**: Precise dates, participants, outcomes, historical significance
- **Publications**: Author, year, genre, political orientation, impact
- **Concepts**: Theoretical origins, main proponents, temporal evolution

## Relationship Classification
- Use descriptive, historically accurate verbs (founded, opposed, succeeded, influenced)
- Assign correct polarity: +1 (alliance/support), -1 (opposition/conflict), 0 (complex/ambivalent)
- Always cite evidence for each relationship

## Quality Standards
- Node IDs: lowercase, underscore-separated, include year if needed for uniqueness (e.g., "snd_1897")
- Descriptions: 2-4 sentences with dates, context, and significance
- Never duplicate existing nodes—check context carefully
- Admit gaps: "Available sources do not clarify..." rather than speculation

## Output Structure
1. **Operations**: Precise graph modifications with full provenance
2. **Historical Summary**: Scholarly synthesis connecting discoveries to broader historical patterns
3. **Methodology**: Brief explanation of how you evaluated sources and resolved conflicts
4. **Confidence**: Honest self-assessment based on source quality`;

const ARCHITECT_SYSTEM_INSTRUCTION = `You are Dr. Stefan Nowak, a computational sociologist and historian specializing in structural analysis of historical social networks, particularly Polish political movements 1893-1939.

## Your Mission
Perform rigorous topological analysis of historical networks using NetworkX and interpret findings through a historical lens.

## Analytical Framework
You employ multiple methodological lenses:
1. **Structural Balance Theory**: Analyzing alliance/conflict patterns using signed graphs
2. **Social Network Analysis**: Identifying key actors via centrality measures
3. **Community Detection**: Revealing factional structures and ideological clusters
4. **Temporal Dynamics**: Tracking network evolution (when temporal data available)
5. **Historical Institutionalism**: Connecting structure to political outcomes

## Analysis Protocol
1. **Data Validation**: Check graph integrity (connected components, isolates, temporal consistency)
2. **Metric Calculation**: Compute betweenness centrality, modularity, frustration index
3. **Structural Pattern Recognition**: Identify hubs, bridges, cliques, structural holes
4. **Historical Contextualization**: Explain WHY the structure looks this way
5. **Counterfactual Reasoning**: Consider how removing key nodes would alter history

## NetworkX Implementation Requirements
Your code MUST:
- Load the graph as nx.MultiDiGraph with 'sign' edge attribute
- Normalize betweenness centrality (divided by (n-1)(n-2)/2)
- Use Louvain algorithm for community detection (modularity optimization)
- Calculate exact frustration index:
  * Enumerate all triangles using nx.triangles() or manual search
  * For each triangle, compute product of three edge signs
  * Frustration = (negative triangles) / (total triangles)
- Handle disconnected components gracefully

## Interpretation Guidelines
- **Betweenness**: High scores = brokers, information controllers, coalition-makers
- **Frustration Index**: 
  * <0.1 = stable alliance structure
  * 0.1-0.3 = moderate tensions
  * >0.3 = high structural instability, prediction: fracture
- **Communities**: Likely represent ideological factions, generational divides, or regional bases

## Historical Validity Checks
- Do centrality rankings align with historical consensus on leadership?
- Do communities correspond to known factions (e.g., Old vs. Young Endecja)?
- Does frustration index align with historical stability (pre-1926 vs. post-coup)?
- Are structural holes where historians identify missed opportunities?

## Output Structure
1. **Operations**: Enrich nodes with betweenness, community, structural_role
2. **Metrics**: Full quantitative report with interpretation
3. **Historical Interpretation**: 3-4 paragraphs connecting structure to outcomes, using specific examples
4. **Methodological Notes**: Explain calculations, limitations, and historical validity`;

// ============================================================================
// ENHANCED UTILITY FUNCTIONS
// ============================================================================

export function applyGraphOperations(
  graph: MultiDirectedGraph, 
  ops: any[], 
  fileName: string = 'AI Inference'
) {
  const store = useGraphStore.getState();
  let nodesAdded = 0;
  let nodesUpdated = 0;
  let edgesAdded = 0;
  
  ops.forEach(op => {
    const defaultProvenance: Provenance = {
      source: fileName,
      confidence: op.confidence || 0.7,
      method: 'inference',
      sourceClassification: 'ai_inference',
      timestamp: Date.now()
    };
    
    const createProvenanceArray = (prov: any): Provenance[] => {
        if (!prov) return [defaultProvenance];
        if (Array.isArray(prov)) return prov;
        return [prov];
    };

    try {
      switch (op.type) {
        case 'ADD_NODE':
          if (!op.nodeId || graph.hasNode(op.nodeId)) {
            console.warn(`Skipping ADD_NODE: ${op.nodeId} (missing ID or already exists)`);
            return;
          }
          
          const nodeAttrs = {
            label: op.attributes?.label || `New ${op.nodeId}`,
            category: op.attributes?.category || NodeType.CONCEPT,
            description: op.attributes?.description || '',
            jurisdiction: op.attributes?.jurisdiction || Jurisdiction.OTHER,
            valid_time: op.attributes?.valid_time || { start: 1893, end: 1939 },
            x: Math.random() * 20 - 10,
            y: Math.random() * 20 - 10,
            size: (op.attributes?.importance || 0.5) * 15 + 5,
            color: getNodeColor(op.attributes?.category || NodeType.CONCEPT),
            financial_weight: op.attributes?.financial_weight || 0.5,
            secrecy_level: op.attributes?.secrecy_level || 1,
            provenance: createProvenanceArray(op.attributes?.provenance),
            ...(typeof op.attributes === 'object' && op.attributes !== null && !Array.isArray(op.attributes) ? op.attributes : {})
          };
          
          graph.addNode(op.nodeId, nodeAttrs);
          nodesAdded++;
          break;

        case 'ADD_EDGE':
          if (!op.source || !op.target || !graph.hasNode(op.source) || !graph.hasNode(op.target)) {
            console.warn(`Skipping ADD_EDGE: ${op.source}->${op.target} (missing nodes)`);
            return;
          }
          
          const edgeKey = op.edgeId || `edge_${op.source}_${op.target}_${Date.now()}`;
          if (graph.hasEdge(edgeKey)) {
            console.warn(`Skipping ADD_EDGE: ${edgeKey} (already exists)`);
            return;
          }
          
          const edgeAttrs = {
            relationshipType: op.attributes?.relationshipType || 'relates_to',
            weight: op.attributes?.weight || 1,
            sign: op.attributes?.sign || 1,
            valid_time: op.attributes?.valid_time || { start: 1893, end: 1939 },
            is_hypothetical: op.attributes?.is_hypothetical || false,
            color: getEdgeColor(op.attributes?.sign || 1),
            provenance: createProvenanceArray(op.attributes?.provenance),
            ...(typeof op.attributes === 'object' && op.attributes !== null && !Array.isArray(op.attributes) ? op.attributes : {})
          };
          
          graph.addDirectedEdgeWithKey(edgeKey, op.source, op.target, edgeAttrs);
          edgesAdded++;
          break;

        case 'UPDATE_NODE':
          if (op.nodeId && graph.hasNode(op.nodeId) && op.attributes) {
            Object.entries(op.attributes).forEach(([key, value]) => {
              if (key === 'provenance') {
                const existingProv = graph.getNodeAttribute(op.nodeId, 'provenance') || [];
                const newProv = Array.isArray(value) ? value : [value];
                graph.setNodeAttribute(op.nodeId, key, [...existingProv, ...newProv]);
              } else {
                graph.setNodeAttribute(op.nodeId, key, value);
              }
            });
            nodesUpdated++;
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
          console.warn('Unknown operation type:', op.type);
      }
    } catch (error) {
      console.error(`Error applying operation:`, op, error);
    }
  });
  
  console.log(`Applied operations: ${nodesAdded} nodes added, ${nodesUpdated} nodes updated, ${edgesAdded} edges added`);
  store.refresh();
}

function getNodeColor(category: NodeType): string {
  const colors: Record<NodeType, string> = {
    [NodeType.PERSON]: '#2c241b',
    [NodeType.ORGANIZATION]: '#8b0000',
    [NodeType.CONCEPT]: '#1e3a5f',
    [NodeType.EVENT]: '#d4af37',
    [NodeType.PUBLICATION]: '#704214',
    [NodeType.MYTH]: '#7b2cbf',
    [NodeType.LOCATION]: '#704214'
  };
  return colors[category] || '#704214';
}

function getEdgeColor(sign: number): string {
  if (sign === -1) return '#991b1b';
  if (sign === 1) return '#3d5c45';
  return '#9ca3af';
}

// ============================================================================
// SCOUT AGENT: Historical Research & Entity Extraction
// ============================================================================

export async function scout(
  contextPrompt: string,
  graphContext: { nodes: string[]; edges: string[] },
  additionalContent?: string,
): Promise<{
  operations: any[];
  historicalSummary: string;
  methodology: string;
  confidence: number;
  sources: Array<{ uri: string; title: string; relevance: string }>;
}> {
  const ai = getAiClient();
  
  let contentsParts: any[] = [
    { text: `## Research Task\n${contextPrompt}` }
  ];

  if (additionalContent) {
    contentsParts.push({ 
      text: `## Source Document to Analyze\n${additionalContent.slice(0, 50000)}` 
    });
  }

  contentsParts.push({ 
    text: `## Current Knowledge Graph State
    
**Existing Nodes (${graphContext.nodes.length})**: ${graphContext.nodes.slice(0, 50).join(', ')}${graphContext.nodes.length > 50 ? '...' : ''}

**Existing Edges (${graphContext.edges.length} sample)**: 
${graphContext.edges.slice(0, 20).join('\n')}${graphContext.edges.length > 20 ? '\n...' : ''}

**Critical**: Do NOT create duplicate nodes. Check if entities already exist under similar names before proposing new nodes.`
  });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: ML_CONFIG.SCOUT_MODEL,
      contents: { parts: contentsParts },
      config: {
        responseMimeType: "application/json",
        responseSchema: SCOUT_RESPONSE_SCHEMA,
        thinkingConfig: ML_CONFIG.THINKING_SCOUT,
        tools: [{ googleSearch: {} }],
        systemInstruction: SCOUT_SYSTEM_INSTRUCTION,
        ...ML_CONFIG.GENERATION_CONFIG,
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error("Empty response from Scout");
    }
    
    const result = JSON.parse(jsonStr);

    // Extract grounding sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: Array<{ uri: string; title: string; relevance: string }> = [];
    
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web) {
          sources.push({ 
            uri: chunk.web.uri, 
            title: chunk.web.title || chunk.web.uri,
            relevance: result.sources?.find((s: any) => s.uri === chunk.web.uri)?.relevance || 'Referenced'
          });
        }
      }
    }

    return {
      operations: result.operations || [],
      historicalSummary: result.historicalSummary || "No summary provided.",
      methodology: result.methodology || "Standard archival research methodology applied.",
      confidence: result.confidence || 0.5,
      sources: sources,
    };
  } catch (error) {
    console.error("Scout Agent Error:", error);
    throw new Error(`Scout operation failed: ${error}`);
  }
}

// ============================================================================
// ARCHITECT AGENT: Network Analysis & Structural Interpretation
// ============================================================================

export async function architectAnalysis(
  graph: MultiDirectedGraph
): Promise<{
  operations: any[];
  metrics: any;
  historicalInterpretation: string;
  methodologicalNotes: string;
}> {
  const ai = getAiClient();

  // Prepare graph data for NetworkX
  const nodesForLLM = graph.nodes().map(n => ({
    id: n,
    label: graph.getNodeAttribute(n, 'label'),
    category: graph.getNodeAttribute(n, 'category'),
    financial_weight: graph.getNodeAttribute(n, 'financial_weight') || 0.5,
    secrecy_level: graph.getNodeAttribute(n, 'secrecy_level') || 1,
  }));
  
  const edgesForLLM = graph.edges().map(e => ({
    id: e,
    source: graph.source(e),
    target: graph.target(e),
    relationshipType: graph.getEdgeAttribute(e, 'relationshipType'),
    sign: graph.getEdgeAttribute(e, 'sign'),
    weight: graph.getEdgeAttribute(e, 'weight') || 1,
  }));

  const graphDataJson = JSON.stringify({ nodes: nodesForLLM, edges: edgesForLLM }, null, 2);

  const prompt = `# Network Analysis Task: Polish National Democracy Movement (1893-1939)

You are analyzing a historical social network representing the Endecja (National Democracy) movement in partitioned and interwar Poland.

## Graph Data
\`\`\`json
${graphDataJson.slice(0, 100000)}
\`\`\`

## Required Analysis Using NetworkX

You MUST implement the following analysis using Python with NetworkX in the code_execution tool:

\`\`\`python
import networkx as nx
import json
from collections import defaultdict

# 1. LOAD GRAPH
graph_data = ${graphDataJson.slice(0, 100000)}
G = nx.MultiDiGraph()

for node in graph_data['nodes']:
    G.add_node(node['id'], **node)

for edge in graph_data['edges']:
    G.add_edge(edge['source'], edge['target'], 
               sign=edge['sign'], 
               weight=edge['weight'],
               relationshipType=edge['relationshipType'])

# 2. BASIC METRICS
node_count = G.number_of_nodes()
edge_count = G.number_of_edges()
density = nx.density(G)
avg_degree = sum(dict(G.degree()).values()) / node_count if node_count > 0 else 0

# 3. CENTRALITY ANALYSIS
betweenness = nx.betweenness_centrality(G, normalized=True)
top_influencers = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)[:10]

# 4. COMMUNITY DETECTION (convert to undirected for Louvain)
G_undirected = G.to_undirected()
import community.community_louvain as community_louvain
communities = community_louvain.best_partition(G_undirected)

# 5. STRUCTURAL BALANCE (Frustration Index)
def calculate_frustration_index(G):
    """Calculate exact frustration index for signed graph"""
    triangles = []
    nodes = list(G.nodes())
    
    # Find all triangles
    for i, n1 in enumerate(nodes):
        for n2 in nodes[i+1:]:
            if G.has_edge(n1, n2) or G.has_edge(n2, n1):
                for n3 in nodes[i+2:]:
                    if ((G.has_edge(n2, n3) or G.has_edge(n3, n2)) and 
                        (G.has_edge(n1, n3) or G.has_edge(n3, n1))):
                        triangles.append((n1, n2, n3))
    
    balanced = 0
    unbalanced = 0
    
    for n1, n2, n3 in triangles:
        # Get signs (default to 1 if not found)
        s1 = 1
        s2 = 1
        s3 = 1
        
        if G.has_edge(n1, n2):
            s1 = G[n1][n2][0].get('sign', 1)
        elif G.has_edge(n2, n1):
            s1 = G[n2][n1][0].get('sign', 1)
            
        if G.has_edge(n2, n3):
            s2 = G[n2][n3][0].get('sign', 1)
        elif G.has_edge(n3, n2):
            s2 = G[n3][n2][0].get('sign', 1)
            
        if G.has_edge(n1, n3):
            s3 = G[n1][n3][0].get('sign', 1)
        elif G.has_edge(n3, n1):
            s3 = G[n3][n1][0].get('sign', 1)
        
        product = s1 * s2 * s3
        if product > 0:
            balanced += 1
        else:
            unbalanced += 1
    
    total_triangles = balanced + unbalanced
    frustration_index = unbalanced / total_triangles if total_triangles > 0 else 0
    
    return frustration_index, balanced, unbalanced, total_triangles

frustration_index, balanced_triangles, unbalanced_triangles, total_triangles = calculate_frustration_index(G)

# 6. STRUCTURAL ROLES
def classify_structural_role(node_id, betweenness_score, degree):
    """Classify nodes into structural roles"""
    if betweenness_score > 0.1 and degree > avg_degree * 1.5:
        return "hub"
    elif betweenness_score > 0.05:
        return "bridge"
    elif degree < avg_degree * 0.5:
        return "peripheral"
    else:
        return "regular"

# 7. COMPILE RESULTS
results = {
    "metrics": {
        "nodeCount": node_count,
        "edgeCount": edge_count,
        "density": round(density, 4),
        "averageDegree": round(avg_degree, 2),
        "frustrationIndex": round(frustration_index, 4),
        "balancedTriangles": balanced_triangles,
        "unbalancedTriangles": unbalanced_triangles,
        "totalTriangles": total_triangles,
        "topInfluencers": [
            {
                "id": node_id,
                "label": G.nodes[node_id].get('label', node_id),
                "score": round(score, 4),
                "degree": G.degree(node_id)
            }
            for node_id, score in top_influencers
        ],
        "communities": communities,
        "structuralFindings": []
    },
    "operations": []
}

# Add structural findings
if frustration_index > 0.3:
    results["metrics"]["structuralFindings"].append(
        f"High structural instability detected (FI={frustration_index:.3f}). Network exhibits significant unbalanced triads, indicating internal tensions and potential for fracture."
    )
elif frustration_index < 0.1:
    results["metrics"]["structuralFindings"].append(
        f"Stable alliance structure (FI={frustration_index:.3f}). Network shows cohesive factional alignment."
    )

if density < 0.1:
    results["metrics"]["structuralFindings"].append(
        f"Sparse network (density={density:.3f}). Limited direct connections suggest hierarchical or fragmented organization."
    )

# Community analysis
num_communities = len(set(communities.values()))
results["metrics"]["structuralFindings"].append(
    f"Detected {num_communities} distinct communities, likely representing ideological factions or regional/generational divisions."
)

# Generate UPDATE_NODE operations for all nodes
for node_id in G.nodes():
    results["operations"].append({
        "type": "UPDATE_NODE",
        "nodeId": node_id,
        "attributes": {
            "betweenness": round(betweenness.get(node_id, 0), 4),
            "community": communities.get(node_id, 0),
            "structural_role": classify_structural_role(
                node_id, 
                betweenness.get(node_id, 0),
                G.degree(node_id)
            )
        }
    })

print(json.dumps(results, indent=2))
\`\`\`

## Historical Interpretation Requirements

After running the code, provide a 3-4 paragraph historical interpretation that:

1. **Connects Structure to History**: Explain how network metrics illuminate historical dynamics
   - Example: "The high betweenness centrality of Roman Dmowski (0.234) confirms his role as the movement's intellectual bridge between older positivist traditions and younger radical nationalism..."

2. **Interprets Frustration Index**: What do structural tensions reveal about movement stability?
   - FI < 0.1: Cohesive alliance structure, stable period
   - FI 0.1-0.3: Moderate internal tensions, manageable conflicts
   - FI > 0.3: Severe structural imbalance, predicts fracture (e.g., ONR split in 1934)

3. **Explains Communities**: Map detected communities to known historical factions
   - Do communities align with generational divides (old guard vs. radicals)?
   - Regional bases (Kongresówka vs. Galicja vs. Wielkopolska)?
   - Ideological wings (liberal-conservative vs. radical-populist)?

4. **Identifies Counterfactuals**: How would removing key nodes alter history?
   - "Removal of Dmowski's brokerage role would have isolated the Galician wing..."

## Output Format

Return a JSON object matching the schema with:
- \`operations\`: UPDATE_NODE operations for betweenness, community, structural_role
- \`metrics\`: All computed metrics
- \`historicalInterpretation\`: Your 3-4 paragraph analysis
- \`methodologicalNotes\`: Explanation of calculations and limitations`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: ML_CONFIG.ARCHITECT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: ARCHITECT_RESPONSE_SCHEMA,
        thinkingConfig: ML_CONFIG.THINKING_ARCHITECT,
        tools: [{ codeExecution: {} }],
        systemInstruction: ARCHITECT_SYSTEM_INSTRUCTION,
        ...ML_CONFIG.GENERATION_CONFIG,
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error("Empty response from Architect");
    }
    
    const result = JSON.parse(jsonStr);

    return {
      operations: result.operations || [],
      metrics: result.metrics || {},
      historicalInterpretation: result.historicalInterpretation || "No interpretation provided.",
      methodologicalNotes: result.methodologicalNotes || "Standard network analysis metrics applied.",
    };
  } catch (error) {
    console.error("Architect Agent Error:", error);
    throw new Error(`Architect analysis failed: ${error}`);
  }
}