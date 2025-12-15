import React from 'react';
import { useGraphStore } from '../state/graphStore';
import { exportGraphToJSON } from '../graph/serialization';
import { Play, Download, Brain, Share2 } from 'lucide-react';
import { embeddingService } from '../ml/embeddings';

export const Sidebar: React.FC = () => {
  const { graph, isLoading, setLoading, setEmbeddingLoaded, isEmbeddingLoaded, frustrationIndex, setFrustrationIndex } = useGraphStore();

  const handleComputeEmbeddings = async () => {
    setLoading(true, 'Loading Transformers...');
    try {
      await embeddingService.load();
      setEmbeddingLoaded(true);
      
      setLoading(true, 'Computing Vectors...');
      // In a real app, this would iterate all nodes.
      // Doing just one for demo
      const text = "National Democracy Ideology";
      await embeddingService.embedText(text);
      
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleRunLayout = () => {
    setLoading(true, 'Running ForceAtlas2...');
    const worker = new Worker(new URL('../workers/layoutFA2.worker.ts', import.meta.url), { type: 'module' });
    
    worker.postMessage({ graphData: graph.export(), iterations: 100 });
    
    worker.onmessage = (e) => {
      const { positions } = e.data;
      Object.entries(positions).forEach(([key, pos]: [string, any]) => {
        graph.setNodeAttribute(key, 'x', pos.x);
        graph.setNodeAttribute(key, 'y', pos.y);
      });
      worker.terminate();
      setLoading(false);
    };
  };

  const handleCalcFrustration = () => {
    setLoading(true, 'Calculating SBT...');
    const worker = new Worker(new URL('../workers/sbt.worker.ts', import.meta.url), { type: 'module' });
    worker.postMessage({ graphData: graph.export() });
    
    worker.onmessage = (e) => {
      setFrustrationIndex(e.data.frustrationIndex);
      worker.terminate();
      setLoading(false);
    };
  };

  return (
    <div className="absolute left-4 top-4 w-64 flex flex-col gap-4 font-serif">
      <div className="bg-archival-paper border-2 border-archival-sepia p-4 shadow-xl rounded-sm">
        <h1 className="text-2xl font-bold text-archival-accent mb-1 border-b border-archival-sepia/20 pb-2">Endecja Graph</h1>
        <p className="text-xs text-archival-sepia italic mb-4">Neuro-Symbolic Engine v1.0</p>
        
        <div className="space-y-2">
          <button 
            onClick={handleRunLayout}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-3 py-2 bg-archival-ink text-archival-paper hover:bg-archival-accent transition-colors rounded text-sm disabled:opacity-50">
            <Share2 size={16} /> Run Layout (FA2)
          </button>
          
          <button 
            onClick={handleComputeEmbeddings}
            disabled={isLoading || isEmbeddingLoaded}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-archival-sepia text-archival-ink hover:bg-archival-paper transition-colors rounded text-sm disabled:opacity-50">
            <Brain size={16} /> Load ML Models
          </button>

          <button 
            onClick={handleCalcFrustration}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-archival-sepia text-archival-ink hover:bg-archival-paper transition-colors rounded text-sm disabled:opacity-50">
            <Play size={16} /> Calc Frustration
          </button>

          <button 
            onClick={() => exportGraphToJSON(graph)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border border-dashed border-archival-sepia text-archival-sepia hover:text-archival-ink hover:border-solid transition-all rounded text-sm">
            <Download size={16} /> Export JSON
          </button>
        </div>
      </div>

      {frustrationIndex !== null && (
        <div className="bg-archival-paper border border-archival-sepia p-3 rounded shadow-lg">
           <div className="text-xs uppercase text-archival-sepia mb-1">Frustration Index</div>
           <div className="text-2xl font-bold text-archival-accent">
             {frustrationIndex.toFixed(3)}
           </div>
           <div className="text-[0.6rem] leading-tight mt-1 text-gray-600">
             Higher values indicate structural political instability (SBT).
           </div>
        </div>
      )}
    </div>
  );
};