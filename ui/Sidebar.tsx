import React, { useState } from 'react';
import { useGraphStore } from '../state/graphStore';
import { exportGraphToJSON, importGraphFromJSON } from '../graph/serialization';
import { Play, Download, Brain, Share2, Upload, FileText, X, Search, Users, HelpCircle } from 'lucide-react';
import { embeddingService, searchByEmbedding } from '../ml/embeddings';
import { summarizeGraphContent } from '../services/geminiService';
import { Legend } from './Legend';

export const Sidebar: React.FC = () => {
  const { graph, setGraph, isLoading, setLoading, setEmbeddingLoaded, isEmbeddingLoaded, frustrationIndex, setFrustrationIndex, selectNode, refresh } = useGraphStore();
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{node: string, score: number}[]>([]);
  const [showLegend, setShowLegend] = useState(false);

  const handleComputeEmbeddings = async () => {
    setLoading(true, 'Loading Transformers...');
    try {
      await embeddingService.load();
      
      setLoading(true, 'Embedding Graph Nodes...');
      await embeddingService.embedNodes(graph);
      
      setEmbeddingLoaded(true);
      setLoading(false);
    } catch (e) {
      console.error(e);
      alert('Failed to compute embeddings. See console.');
      setLoading(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!isEmbeddingLoaded) {
        alert("Please load ML models and compute node embeddings first.");
        return;
    }
    
    setLoading(true, 'Searching...');
    try {
        const results = await searchByEmbedding(searchQuery, graph);
        setSearchResults(results);
    } catch (e) {
        console.error(e);
    } finally {
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
      refresh(); // Ensure visuals update
      setLoading(false);
    };
  };

  const handleDetectCommunities = () => {
    setLoading(true, 'Detecting Communities...');
    const worker = new Worker(new URL('../workers/louvain.worker.ts', import.meta.url), { type: 'module' });
    
    worker.postMessage({ graphData: graph.export() });
    
    worker.onmessage = (e) => {
      const { communities } = e.data;
      
      // Distinct palette for communities
      const PALETTE = [
        '#E63946', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51', 
        '#457B9D', '#1D3557', '#A8DADC', '#F1FAEE', '#6D597A',
        '#B56576', '#E56B6F', '#EAAC8B', '#355070', '#6D6875'
      ];
      
      graph.forEachNode((node) => {
          const commId = communities[node];
          if (commId !== undefined) {
             graph.setNodeAttribute(node, 'community', commId);
             // Apply color based on community ID
             graph.setNodeAttribute(node, 'color', PALETTE[commId % PALETTE.length]);
          }
      });
      
      refresh(); // Trigger Sigma refresh via version update
      worker.terminate();
      setLoading(false);
    };
    
    worker.onerror = (e) => {
        console.error(e);
        setLoading(false);
        alert("Community detection failed");
    }
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true, 'Importing graph...');
      const importedGraph = await importGraphFromJSON(file);
      setGraph(importedGraph);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      alert('Failed to import: ' + error.message);
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setLoading(true, 'Generating graph summary...');
    try {
      const nodes = graph.nodes().map(n => ({
        label: graph.getNodeAttribute(n, 'label'),
        type: graph.getNodeAttribute(n, 'type')
      }));
      
      // Limit edges for context size if necessary, but 100-200 edges fits easily
      const edges = graph.edges().map(e => ({
        source: graph.getNodeAttribute(graph.source(e), 'label'),
        target: graph.getNodeAttribute(graph.target(e), 'label'),
        type: graph.getEdgeAttribute(e, 'type')
      }));

      const text = await summarizeGraphContent(nodes, edges);
      setSummaryText(text);
      setShowSummary(true);
    } catch (e) {
      console.error(e);
      alert('Failed to generate summary. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="absolute left-4 top-4 w-64 flex flex-col gap-4 font-serif z-10">
        <div className="bg-archival-paper border-2 border-archival-sepia p-4 shadow-xl rounded-sm">
          <h1 className="text-2xl font-bold text-archival-accent mb-1 border-b border-archival-sepia/20 pb-2">Endecja Graph</h1>
          <p className="text-xs text-archival-sepia italic mb-4">Neuro-Symbolic Engine v1.0</p>
          
          {/* Semantic Search */}
          <div className="mb-4 space-y-2">
            <div className="flex gap-1">
                <input 
                    type="text" 
                    placeholder="Semantic search..." 
                    className="w-full p-1.5 text-xs border border-archival-sepia/50 rounded bg-white/50 focus:bg-white"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
                />
                <button 
                    onClick={handleSemanticSearch}
                    disabled={!isEmbeddingLoaded}
                    className="p-1.5 bg-archival-navy text-white rounded hover:bg-opacity-90 disabled:opacity-50"
                >
                    <Search size={14} />
                </button>
            </div>
            {searchResults.length > 0 && (
                <div className="bg-white border border-archival-sepia/20 rounded max-h-32 overflow-y-auto text-xs">
                    {searchResults.map(res => (
                        <div 
                            key={res.node} 
                            className="p-1.5 hover:bg-archival-faint cursor-pointer flex justify-between"
                            onClick={() => selectNode(res.node)}
                        >
                            <span className="truncate w-32">{graph.getNodeAttribute(res.node, 'label')}</span>
                            <span className="text-green-700">{(res.score * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                    <button onClick={() => setSearchResults([])} className="w-full text-center text-[10px] text-gray-400 hover:text-gray-600 p-1">Clear</button>
                </div>
            )}
          </div>

          <div className="space-y-2">
            <button 
              onClick={handleRunLayout}
              disabled={isLoading}
              className="w-full flex items-center gap-2 px-3 py-2 bg-archival-ink text-archival-paper hover:bg-archival-accent transition-colors rounded text-sm disabled:opacity-50">
              <Share2 size={16} /> Run Layout (FA2)
            </button>
            
            <button 
              onClick={handleDetectCommunities}
              disabled={isLoading}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-archival-sepia text-archival-ink hover:bg-archival-paper transition-colors rounded text-sm disabled:opacity-50">
              <Users size={16} /> Detect Communities
            </button>
            
            <button 
              onClick={handleSummarize}
              disabled={isLoading}
              className="w-full flex items-center gap-2 px-3 py-2 bg-archival-navy text-white hover:bg-archival-navy/90 transition-colors rounded text-sm disabled:opacity-50">
              <FileText size={16} /> Summarize Graph
            </button>

            <button 
              onClick={handleComputeEmbeddings}
              disabled={isLoading || isEmbeddingLoaded}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-archival-sepia text-archival-ink hover:bg-archival-paper transition-colors rounded text-sm disabled:opacity-50">
              <Brain size={16} /> {isEmbeddingLoaded ? 'Embeddings Loaded' : 'Compute Embeddings'}
            </button>

            <button 
              onClick={handleCalcFrustration}
              disabled={isLoading}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-archival-sepia text-archival-ink hover:bg-archival-paper transition-colors rounded text-sm disabled:opacity-50">
              <Play size={16} /> Calc Frustration
            </button>

            <button 
              onClick={() => setShowLegend(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-archival-sepia text-archival-ink hover:bg-archival-paper transition-colors rounded text-sm"
            >
              <HelpCircle size={16} /> Show Legend
            </button>

            <button 
              onClick={() => exportGraphToJSON(graph)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border border-dashed border-archival-sepia text-archival-sepia hover:text-archival-ink hover:border-solid transition-all rounded text-sm">
              <Download size={16} /> Export JSON
            </button>
            
            <label className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-archival-sepia text-archival-ink hover:bg-archival-paper transition-colors rounded text-sm cursor-pointer disabled:opacity-50">
              <Upload size={16} /> Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={isLoading} />
            </label>
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

      {showLegend && <Legend onClose={() => setShowLegend(false)} />}

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-archival-paper border-2 border-archival-navy p-6 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-archival-sepia/20 pb-2">
              <div className="flex items-center gap-2">
                 <FileText className="text-archival-navy" />
                 <h2 className="text-xl font-bold text-archival-navy font-serif">Graph Summary</h2>
              </div>
              <button 
                onClick={() => setShowSummary(false)} 
                className="text-archival-sepia hover:text-archival-accent transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto font-serif text-archival-ink leading-relaxed whitespace-pre-wrap pr-2 text-sm">
              {summaryText}
            </div>
            <div className="mt-4 pt-4 border-t border-archival-sepia/10 flex justify-end">
                <button 
                  onClick={() => setShowSummary(false)}
                  className="px-4 py-2 bg-archival-navy text-white rounded text-sm hover:bg-archival-navy/90"
                >
                  Close
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};