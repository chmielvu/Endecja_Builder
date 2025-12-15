import * as tf from '@tensorflow/tfjs';

// Simplified GraphSAGE layer
class GraphSAGELayer extends tf.layers.Layer {
  private w: tf.LayerVariable;
  private inputDim: number;
  private outputDim: number;

  constructor(args: any) {
    super(args);
    this.inputDim = args.inputDim;
    this.outputDim = args.outputDim;
    // We strictly use 'addWeight' from the base class (accessing via casting to any to bypass TS protection if needed, though tfjs types usually allow it)
    this.w = (this as any).addWeight('w', [this.inputDim * 2, this.outputDim], 'float32', 'glorotNormal');
  }

  call(inputs: tf.Tensor | tf.Tensor[]): tf.Tensor | tf.Tensor[] {
    if (Array.isArray(inputs)) {
      const features = inputs[0] as tf.Tensor; // [N, F]
      const adj = inputs[1] as tf.Tensor;      // [N, N] adjacency

      // Aggregation: Mean of neighbors
      // Simple matrix multiplication A * X aggregates neighbors (sum). 
      // For mean, A should be row-normalized. We assume A is provided as such or raw.
      const neighborAgg = tf.matMul(adj, features);
      
      // Concatenate self features with neighbor features [N, 2F]
      const concatenated = tf.concat([features, neighborAgg], 1);
      
      // Linear transformation: [N, 2F] * [2F, Out] = [N, Out]
      const transformed = tf.matMul(concatenated, this.w.read());
      
      // Activation
      return tf.relu(transformed);
    }
    throw new Error('GraphSAGE requires [features, adjacency] input');
  }
  
  static get className() {
    return 'GraphSAGELayer';
  }
}
tf.serialization.registerClass(GraphSAGELayer);

/**
 * Trains a simple GraphSAGE-like model to generate embeddings.
 * Optimizes for structural balance: minimizing distance between positive neighbors,
 * maximizing distance between negative neighbors.
 */
export async function trainGraphSAGE(
  features: number[][],
  adjMatrix: number[][], // Raw adjacency (0/1) for aggregation
  edgeIndex: {source: number, target: number, sign: number}[], // List of edges with signs for Loss
  epochs = 20
) {
  const numNodes = features.length;
  const featureDim = features[0].length;
  const embeddingDim = 16;

  // Convert inputs to tensors
  const x = tf.tensor2d(features); // [N, F]
  
  // Row-normalize adjacency for mean aggregation
  // D^-1 * A
  const adjTensor = tf.tensor2d(adjMatrix);
  const degree = tf.sum(adjTensor, 1, true);
  // Avoid div by zero
  const degreeSafe = tf.add(degree, 1e-6); 
  const adjNorm = tf.div(adjTensor, degreeSafe);

  // Define Model: 2 Layers
  // Weights (Variables)
  const w1 = tf.variable(tf.randomNormal([featureDim * 2, 32]));
  const w2 = tf.variable(tf.randomNormal([32 * 2, embeddingDim]));

  const optimizer = tf.train.adam(0.01);

  // Training Loop
  for (let i = 0; i < epochs; i++) {
    const cost = optimizer.minimize(() => {
        // --- Forward Pass (Layer 1) ---
        const neighborAgg1 = tf.matMul(adjNorm, x);
        const concat1 = tf.concat([x, neighborAgg1], 1);
        const h1 = tf.relu(tf.matMul(concat1, w1)); // [N, 32]

        // --- Forward Pass (Layer 2) ---
        const neighborAgg2 = tf.matMul(adjNorm, h1);
        const concat2 = tf.concat([h1, neighborAgg2], 1);
        const z = tf.matMul(concat2, w2); // [N, 16] - Final Embeddings

        // --- Signed Loss Calculation ---
        // L = L_pos + lambda * L_neg
        // L_pos: sum ||z_u - z_v||^2 for sign > 0
        // L_neg: sum max(0, margin - ||z_u - z_v||^2) for sign < 0
        
        // We construct a loss tensor
        // Note: For performance in JS, we should ideally use gather/indexing operations
        // rather than iterating edges. Since graph is small (<100 nodes), we can gather indices.
        const sources = edgeIndex.map(e => e.source);
        const targets = edgeIndex.map(e => e.target);
        
        const z_u = tf.gather(z, sources);
        const z_v = tf.gather(z, targets);
        
        const distSq = tf.sum(tf.square(tf.sub(z_u, z_v)), 1); // [E]
        
        const signs = tf.tensor1d(edgeIndex.map(e => e.sign));
        
        // Positive mask (sign > 0)
        const posMask = tf.greater(signs, 0);
        // Negative mask (sign < 0)
        const negMask = tf.less(signs, 0);
        
        // Use multiplication masking instead of booleanMask which may not be available in all TFJS environments or types
        const posMaskFloat = tf.cast(posMask, 'float32');
        const posLoss = tf.sum(tf.mul(distSq, posMaskFloat));
        
        const margin = 1.0;
        // negLoss calculation: sum(relu(margin - dist) * negMask)
        const negLossRaw = tf.relu(tf.sub(margin, distSq));
        const negMaskFloat = tf.cast(negMask, 'float32');
        const negLoss = tf.sum(tf.mul(negLossRaw, negMaskFloat));

        return tf.add(posLoss, negLoss) as tf.Scalar;
    }, true);
    
    // console.log(`Epoch ${i}: Loss = ${cost?.dataSync()[0]}`);
  }

  // Compute final embeddings
  const neighborAgg1 = tf.matMul(adjNorm, x);
  const h1 = tf.relu(tf.matMul(tf.concat([x, neighborAgg1], 1), w1));
  const neighborAgg2 = tf.matMul(adjNorm, h1);
  const z = tf.matMul(tf.concat([h1, neighborAgg2], 1), w2);

  const embeddings = await z.array() as number[][];
  
  // Cleanup
  x.dispose();
  adjTensor.dispose();
  adjNorm.dispose();
  
  return embeddings;
}

export function inferEmbeddings(features: number[][], adjMatrix: number[][]) {
    // In a real app, we would load saved weights. 
    // For this client-side scaffold, we just assume retraining or random projection 
    // if no weights are stored. This function stub indicates where inference goes.
    return features; 
}

export function predictEdges(
  embeddings: number[][],
  threshold = 0.9
): { sourceIndex: number, targetIndex: number, similarity: number }[] {
  const predictedEdges: { sourceIndex: number, targetIndex: number, similarity: number }[] = [];
  const n = embeddings.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const u = tf.tensor1d(embeddings[i]);
      const v = tf.tensor1d(embeddings[j]);
      
      // Cosine similarity
      const sim = tf.losses.cosineDistance(u, v, 0).arraySync() as number;
      // tf.losses.cosineDistance returns 1 - cos_sim. So sim is distance.
      // We want similarity.
      const cosineSim = 1 - sim;
      
      if (cosineSim > threshold) {
        predictedEdges.push({ sourceIndex: i, targetIndex: j, similarity: cosineSim });
      }
      u.dispose();
      v.dispose();
    }
  }
  return predictedEdges;
}