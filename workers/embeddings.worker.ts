// workers/embeddings.worker.ts
import 'buffer'; // Explicitly polyfill Buffer for this worker
import { pipeline, env } from '@xenova/transformers';
import { MultiDirectedGraph } from 'graphology'; // Assuming graphology can be imported in worker (for types)

// Configuration to skip local checks since we are in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

let pipe: any = null;
const modelName = 'Xenova/distilbert-base-multilingual-cased';
let isMockMode = false;

async function loadPipeline() {
  if (!pipe && !isMockMode) {
    console.log('[Worker] Loading Transformers.js pipeline...');
    try {
      pipe = await pipeline('feature-extraction', modelName, {
        quantized: true
      });
      console.log('[Worker] Transformers.js pipeline loaded.');
      self.postMessage({ type: 'LOAD_COMPLETE', success: true });
    } catch (e) {
      console.warn("[Worker] Failed to load remote model (likely CORS/Auth). Switching to Mock Embedding Mode.", e);
      isMockMode = true;
      self.postMessage({ type: 'LOAD_COMPLETE', success: false, mockMode: true });
    }
  } else if (pipe) {
    self.postMessage({ type: 'LOAD_COMPLETE', success: true });
  } else if (isMockMode) {
    self.postMessage({ type: 'LOAD_COMPLETE', success: false, mockMode: true });
  }
}

async function embedText(text: string): Promise<Float32Array> {
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
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return output.data;
}

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'LOAD_MODEL':
      await loadPipeline();
      break;

    case 'EMBED_NODE':
      const { node, attrs } = payload;
      const text = `Label: ${attrs.label}. Type: ${attrs.category}. Jurisdiction: ${attrs.jurisdiction}. Secrecy Level: ${attrs.secrecy_level}.`;
      const embedding = await embedText(text);
      self.postMessage({ type: 'NODE_EMBEDDED', payload: { node, embedding } });
      break;

    case 'EMBED_QUERY':
      const { query } = payload;
      const queryEmbedding = await embedText(query);
      self.postMessage({ type: 'QUERY_EMBEDDED', payload: { queryEmbedding } });
      break;

    default:
      console.warn('[Worker] Unknown message type:', type);
  }
};
