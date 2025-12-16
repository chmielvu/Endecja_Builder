import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes } from '../types';

// Use a separate worker for embeddings to avoid blocking the main thread
import EmbeddingWorker from '../workers/embeddings.worker.ts?worker';

let embeddingWorker: Worker | null = null;
let isEmbeddingLoaded = false;
let isMockMode = false;
const workerPromises = new Map<string, Function>(); // To resolve promises for worker responses

class EmbeddingService {
  private static instance: EmbeddingService;

  private constructor() {
    if (typeof window !== 'undefined') { // Only create worker in browser
      // @ts-ignore - TS definition for worker module might not include options, but browser requires it for ESM
      embeddingWorker = new EmbeddingWorker({ type: 'module' });
      
      if (embeddingWorker) {
        embeddingWorker.onmessage = (e) => {
          const { type, payload } = e.data;
          switch (type) {
            case 'LOAD_COMPLETE':
              isEmbeddingLoaded = payload.success;
              isMockMode = payload.mockMode || false;
              // Resolve any pending load promises
              if (workerPromises.has('LOAD_MODEL')) {
                workerPromises.get('LOAD_MODEL')?.({ success: isEmbeddingLoaded, mockMode: isMockMode });
                workerPromises.delete('LOAD_MODEL');
              }
              break;
            case 'NODE_EMBEDDED':
              if (workerPromises.has(`EMBED_NODE_${payload.node}`)) {
                workerPromises.get(`EMBED_NODE_${payload.node}`)?.(payload.embedding);
                workerPromises.delete(`EMBED_NODE_${payload.node}`);
              }
              break;
            case 'QUERY_EMBEDDED':
              if (workerPromises.has('EMBED_QUERY')) {
                workerPromises.get('EMBED_QUERY')?.(payload.queryEmbedding);
                workerPromises.delete('EMBED_QUERY');
              }
              break;
            default:
              console.warn('Unknown message from worker:', type);
          }
        };
        embeddingWorker.onerror = (error) => {
          console.error('Embedding worker error:', error);
          // Reject any pending promises
          workerPromises.forEach((reject, key) => {
            if (key.startsWith('EMBED_NODE_') || key === 'EMBED_QUERY' || key === 'LOAD_MODEL') {
              reject(new Error('Embedding worker failed'));
            }
          });
          workerPromises.clear();
          isEmbeddingLoaded = false;
          isMockMode = true; // Fallback to mock mode on worker error
        };
      }
    } else {
      // Server-side / SSR mock
      isMockMode = true;
    }
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  public async load(): Promise<{ success: boolean; mockMode: boolean }> {
    if (!embeddingWorker) {
      console.warn('Worker not available, running in mock mode for load().');
      return { success: false, mockMode: true };
    }
    if (isEmbeddingLoaded || isMockMode) {
      return { success: isEmbeddingLoaded, mockMode: isMockMode };
    }

    return new Promise((resolve, reject) => {
      workerPromises.set('LOAD_MODEL', resolve);
      embeddingWorker?.postMessage({ type: 'LOAD_MODEL' });
      // Timeout for load, in case worker hangs
      setTimeout(() => {
        if (workerPromises.has('LOAD_MODEL')) {
          workerPromises.delete('LOAD_MODEL');
          // Don't reject, just fallback to mock to prevent app crash
          console.warn('Model loading timed out, falling back to mock');
          isMockMode = true;
          resolve({ success: false, mockMode: true });
        }
      }, 60000); // 60 seconds for model load
    });
  }

  public async embedText(text: string): Promise<Float32Array> {
    if (isMockMode) {
      const vec = new Float32Array(384);
      let seed = 0;
      for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i);
      for (let i = 0; i < 384; i++) {
        const x = Math.sin(seed + i) * 10000;
        vec[i] = x - Math.floor(x);
      }
      return vec;
    }

    if (!embeddingWorker || !isEmbeddingLoaded) {
      throw new Error('Embedding worker not loaded or failed to initialize.');
    }

    return new Promise((resolve, reject) => {
      workerPromises.set('EMBED_QUERY', resolve);
      embeddingWorker?.postMessage({ type: 'EMBED_QUERY', payload: { query: text } });
      setTimeout(() => {
        if (workerPromises.has('EMBED_QUERY')) {
          workerPromises.delete('EMBED_QUERY');
          reject(new Error('Query embedding timed out'));
        }
      }, 30000); // 30 seconds for query embedding
    });
  }

  public async embedNodes(graph: MultiDirectedGraph<NodeAttributes, any>) {
    if (isMockMode) {
      console.warn("Running in mock embedding mode, node embeddings will be dummy values.");
      graph.forEachNode((node) => {
        if (!graph.getNodeAttribute(node, 'radicalization_vector')) {
          const text = `Label: ${graph.getNodeAttribute(node, 'label')}. Type: ${graph.getNodeAttribute(node, 'category')}.`;
          const vec = new Float32Array(384);
          let seed = 0;
          for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i);
          for (let i = 0; i < 384; i++) {
            const x = Math.sin(seed + i) * 10000;
            vec[i] = x - Math.floor(x);
          }
          graph.setNodeAttribute(node, 'radicalization_vector', vec);
        }
      });
      return;
    }

    if (!embeddingWorker || !isEmbeddingLoaded) {
      throw new Error('Embedding worker not loaded or failed to initialize for node embeddings.');
    }

    const nodesToEmbed = graph.nodes().filter(node => !graph.getNodeAttribute(node, 'radicalization_vector'));
    const embeddingPromises: Promise<Float32Array>[] = [];
    const nodeMapping = new Map<Promise<Float32Array>, string>();

    for (const node of nodesToEmbed) {
      const attrs = graph.getNodeAttributes(node);
      const promise = new Promise<Float32Array>((resolve, reject) => {
        workerPromises.set(`EMBED_NODE_${node}`, resolve);
        embeddingWorker?.postMessage({ type: 'EMBED_NODE', payload: { node, attrs } });
        setTimeout(() => {
          if (workerPromises.has(`EMBED_NODE_${node}`)) {
            workerPromises.delete(`EMBED_NODE_${node}`);
            reject(new Error(`Node embedding timed out for ${node}`));
          }
        }, 30000);
      });
      embeddingPromises.push(promise);
      nodeMapping.set(promise, node);
    }

    const embeddings = await Promise.all(embeddingPromises);

    embeddings.forEach((embedding, index) => {
      const node = nodeMapping.get(embeddingPromises[index])!;
      graph.setNodeAttribute(node, 'radicalization_vector', embedding);
    });
  }

  public getIsEmbeddingLoaded(): boolean {
    return isEmbeddingLoaded;
  }
}

export const embeddingService = EmbeddingService.getInstance();

export async function searchByEmbedding(query: string, graph: MultiDirectedGraph<NodeAttributes, any>, topK = 10) {
  const service = EmbeddingService.getInstance();
  const queryVec = await service.embedText(query);

  const results: { node: string, score: number }[] = [];

  graph.forEachNode((node, attrs) => {
    if (attrs.radicalization_vector) {
      const vec = attrs.radicalization_vector;
      let dot = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < vec.length; i++) {
        dot += vec[i] * queryVec[i];
        normA += vec[i] * vec[i];
        normB += queryVec[i] * queryVec[i];
      }
      const score = dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
      results.push({ node, score });
    }
  });

  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}