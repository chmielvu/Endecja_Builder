import { pipeline, env } from '@xenova/transformers';

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
}

export const embeddingService = EmbeddingService.getInstance();