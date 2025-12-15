import { pipeline, env } from '@xenova/transformers';
import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes } from '../types';

// Configuration to skip local checks since we are in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class EmbeddingService {
  private static instance: EmbeddingService;
  private pipe: any = null;
  private modelName = 'Xenova/distilbert-base-multilingual-cased';

  private constructor() {}

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  public async load() {
    if (!this.pipe) {
      console.log('Loading Transformers.js pipeline...');
      this.pipe = await pipeline('feature-extraction', this.modelName, {
        quantized: true
      });
      console.log('Transformers.js pipeline loaded.');
    }
  }

  public async embedText(text: string): Promise<Float32Array> {
    await this.load();
    const output = await this.pipe(text, { pooling: 'mean', normalize: true });
    return output.data;
  }

  public async embedNodes(graph: MultiDirectedGraph<NodeAttributes, any>) {
    await this.load();
    const nodes = graph.nodes();
    // Process sequentially to avoid memory spikes in browser
    for (const node of nodes) {
      const attrs = graph.getNodeAttributes(node);
      // Construct a rich textual representation
      const text = `Label: ${attrs.label}. Type: ${attrs.type}. Jurisdiction: ${attrs.jurisdiction}. Secrecy Level: ${attrs.secrecy_level}.`;
      
      // Basic cache check (if already has vector, skip)
      if (!attrs.radicalization_vector) {
          const embedding = await this.embedText(text);
          graph.setNodeAttribute(node, 'radicalization_vector', embedding);
      }
    }
  }
}

export const embeddingService = EmbeddingService.getInstance();

export async function searchByEmbedding(query: string, graph: MultiDirectedGraph<NodeAttributes, any>, topK = 10) {
    const service = EmbeddingService.getInstance();
    const queryVec = await service.embedText(query);
    
    const results: {node: string, score: number}[] = [];
    
    graph.forEachNode((node, attrs) => {
        if (attrs.radicalization_vector) {
            const vec = attrs.radicalization_vector;
            // Cosine similarity
            let dot = 0;
            let normA = 0;
            let normB = 0;
            for(let i=0; i<vec.length; i++) {
                dot += vec[i] * queryVec[i];
                normA += vec[i] * vec[i];
                normB += queryVec[i] * queryVec[i];
            }
            const score = dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
            results.push({ node, score });
        }
    });
    
    return results.sort((a,b) => b.score - a.score).slice(0, topK);
}
