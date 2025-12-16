
import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../state/graphStore';
import { exportGraphToJSON, importGraphFromJSON } from '../graph/serialization';
import { Play, Download, Brain, Share2, FileText, X, Search, Users, HelpCircle, Network, Sparkles, Library, Save } from 'lucide-react';
import { embeddingService } from '../ml/embeddings';
import { scout, architectAnalysis, applyGraphOperations } from '../services/geminiService';
import { useGraphAlgorithms } from '../hooks/useGraphAlgorithms'; // Import new hook
import { Legend } from './Legend';
import { SourceManager } from './SourceManager';
import { SnapshotManager } from './SnapshotManager';

export const Sidebar: React.FC = () => {
  const { graph, setGraph, isLoading, setLoading, selectNode, frustrationIndex } = useGraphStore();
  
  // Custom hook for algorithms
  const { 
    runLayout, 
    detectCommunities, 
    measureInfluence, 
    calculateFrustration, 
    computeEmbeddings, 
    semanticSearch 
  } = useGraphAlgorithms();

  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [modalTitle, setModalTitle] = useState('Mission Report');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{node: string, score: number}[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [showSourceManager, setShowSourceManager] = useState(false);
  const [showSnapshotManager, setShowSnapshotManager] = useState(false);
  const [geminiSources, setGeminiSources] = useState<Array<{ uri: string, title: string }>>([]);

  // Use the service's internal state for isEmbeddingLoaded
  const [localIsEmbeddingLoaded, setLocalIsEmbeddingLoaded] = useState(embeddingService.getIsEmbeddingLoaded());

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalIsEmbeddingLoaded(embeddingService.getIsEmbeddingLoaded());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSemanticSearch = async () => {
    const results = await semanticSearch(searchQuery, localIsEmbeddingLoaded);
    setSearchResults(results);
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

  const handleGenerateReport = async () => {
    setLoading(true, 'Scout is generating historical overview...');
    try {
      const graphContext = {
        nodes: graph.nodes().map(n => graph.getNodeAttribute(n, 'label')),
        edges: graph.edges().map(e => `${graph.getNodeAttribute(graph.source(e), 'label')} --[${graph.getEdgeAttribute(e, 'relationshipType')}]--> ${graph.getNodeAttribute(graph.target(e), 'label')}`),
      };
      
      const contextPrompt = `Provide a concise historical overview of the provided graph data, focusing on key actors, relationships, and historical periods. Do not make up facts.`;
      
      const result = await scout(contextPrompt, graphContext);
      setSummaryText(result.historicalSummary);
      setModalTitle('Scout Historical Overview');
      setGeminiSources(result.sources || []);
      setShowSummary(true);
    } catch (e: any) {
      console.error(e);
      alert('Report generation failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeminiAnalyst = async () => {
    setLoading(true, 'Architect is analyzing topology with NetworkX...');
    try {
        const result = await architectAnalysis(graph); 
        applyGraphOperations(graph, result.operations); 
        setSummaryText(result.historicalInterpretation);
        setModalTitle('Architect Structural Analysis');
        // Frustration index is set within architectAnalysis flow potentially, but if not we can set it here if returned
        // setFrustrationIndex(result.metrics.frustrationIndex); 
        setGeminiSources([]); 
        setShowSummary(true);
    } catch (e: any) {
        console.error(e);
        alert('Analysis failed: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 font-sans text-endecja-paper">
      
      {/* Semantic Search */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-endecja-gold font-bold">Search</label>
        <div className="flex gap-1">
            <input 
                type="text" 
                placeholder="Find concept..." 
                className="w-full p-2 text-sm border border-endecja-gold/30 rounded bg-endecja-base text-endecja-paper focus:border-endecja-gold outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
            />
            <button 
                onClick={handleSemanticSearch}
                disabled={!localIsEmbeddingLoaded}
                className="p-2 bg-endecja-gold text-endecja-base rounded hover:bg-white disabled:opacity-50 transition-colors"
            >
                <Search size={16} />
            </button>
        </div>
        {searchResults.length > 0 && (
            <div className="bg-endecja-base border border-endecja-gold/20 rounded max-h-32 overflow-y-auto text-xs">
                {searchResults.map(res => (
                    <div 
                        key={res.node} 
                        className="p-2 hover:bg-endecja-light cursor-pointer flex justify-between border-b border-white/5 last:border-0"
                        onClick={() => selectNode(res.node)}
                    >
                        <span className="truncate w-32">{graph.getNodeAttribute(res.node, 'label')}</span>
                        <span className="text-endecja-gold">{(res.score * 100).toFixed(0)}%</span>
                    </div>
                ))}
                <button onClick={() => setSearchResults([])} className="w-full text-center text-[10px] text-endecja-gold/70 hover:text-endecja-gold p-1">Clear</button>
            </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-xs uppercase tracking-widest text-endecja-gold font-bold">Builder Tools</label>
         <button 
          onClick={() => setShowSnapshotManager(true)}
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-endecja-light hover:bg-endecja-gold hover:text-endecja-base text-white transition-all rounded text-sm font-bold shadow-md disabled:opacity-50">
          <Save size={16} /> Manage Snapshots
        </button>
        <button 
          onClick={() => setShowSourceManager(true)}
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-endecja-light hover:bg-endecja-gold hover:text-endecja-base text-white transition-all rounded text-sm font-bold shadow-md disabled:opacity-50">
          <Library size={16} /> Source Library
        </button>

        <div className="h-px bg-endecja-gold/20 my-2" />
        <label className="text-xs uppercase tracking-widest text-endecja-gold font-bold">Engine Controls</label>

        <button 
          onClick={runLayout}
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-endecja-base border border-endecja-gold/30 hover:border-endecja-gold text-endecja-paper transition-all rounded text-sm disabled:opacity-50">
          <Share2 size={16} /> Structure Graph
        </button>
        
        <button 
          onClick={detectCommunities}
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-endecja-base border border-endecja-gold/30 hover:border-endecja-gold text-endecja-paper transition-all rounded text-sm disabled:opacity-50">
          <Users size={16} /> Detect Factions
        </button>

        <button 
          onClick={measureInfluence}
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-endecja-base border border-endecja-gold/30 hover:border-endecja-gold text-endecja-paper transition-all rounded text-sm disabled:opacity-50">
          <Network size={16} /> Measure Influence
        </button>

        <button 
          onClick={calculateFrustration}
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-endecja-base border border-endecja-gold/30 hover:border-endecja-gold text-endecja-paper transition-all rounded text-sm disabled:opacity-50">
          <Play size={16} /> Analyze Tensions
        </button>
        
        <div className="h-px bg-endecja-gold/20 my-2" />

        <button 
          onClick={handleGenerateReport} 
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-endecja-base border border-endecja-gold/30 hover:border-endecja-gold text-endecja-paper transition-all rounded text-sm disabled:opacity-50">
          <FileText size={16} /> Generate Report
        </button>

        <button 
          onClick={handleGeminiAnalyst} 
          disabled={isLoading}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-endecja-base to-endecja-light border border-endecja-gold hover:from-endecja-gold hover:to-yellow-500 hover:text-endecja-base text-endecja-gold transition-all rounded text-sm font-bold disabled:opacity-50 shadow-lg"
          title="Advanced topological analysis using Gemini 2.5 Flash Lite"
        >
          <Sparkles size={16} className="animate-pulse" /> Gemini Analyst
        </button>

        <button 
          onClick={computeEmbeddings}
          disabled={isLoading || localIsEmbeddingLoaded}
          className="w-full flex items-center gap-3 px-4 py-3 bg-endecja-base border border-endecja-gold/30 hover:border-endecja-gold text-endecja-paper transition-all rounded text-sm disabled:opacity-50">
          <Brain size={16} /> {localIsEmbeddingLoaded ? 'Embeddings Ready' : 'Load Neural Engine'}
        </button>

        <div className="pt-4 border-t border-endecja-gold/20 flex gap-2">
            <button 
              onClick={() => setShowLegend(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-transparent text-endecja-gold hover:text-white transition-colors text-xs"
            >
              <HelpCircle size={14} /> Legend
            </button>

            <button 
              onClick={() => exportGraphToJSON(graph)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-transparent text-endecja-gold hover:text-white transition-colors text-xs">
              <Download size={14} /> Export
            </button>
        </div>
        
        <label className="block w-full text-center text-xs text-endecja-gold/50 hover:text-endecja-gold cursor-pointer transition-colors mt-2">
          Import JSON Dataset
          <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={isLoading} />
        </label>
      </div>

      {frustrationIndex !== null && (
        <div className="bg-endecja-alert/20 border border-endecja-alert p-3 rounded mt-auto">
           <div className="text-xs uppercase text-endecja-alert mb-1 font-bold">Instability Index</div>
           <div className="text-2xl font-bold text-endecja-paper">
             {frustrationIndex.toFixed(3)}
           </div>
        </div>
      )}

      {showLegend && <Legend onClose={() => setShowLegend(false)} />}
      {showSourceManager && <SourceManager onClose={() => setShowSourceManager(false)} />}
      {showSnapshotManager && <SnapshotManager onClose={() => setShowSnapshotManager(false)} />}

      {/* Summary / Analysis Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-endecja-base/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-endecja-paper border-2 border-endecja-gold p-6 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col text-endecja-ink">
            <div className="flex justify-between items-center mb-4 border-b border-endecja-gold/20 pb-2">
              <div className="flex items-center gap-2">
                 {modalTitle.includes('Architect') || modalTitle.includes('Scout') ? <Sparkles className="text-endecja-gold" /> : <FileText className="text-endecja-base" />}
                 <h2 className="text-xl font-bold font-serif">{modalTitle}</h2>
              </div>
              <button onClick={() => setShowSummary(false)} className="hover:text-endecja-gold"><X size={24} /></button>
            </div>
            <div className="overflow-y-auto font-serif leading-relaxed whitespace-pre-wrap pr-2 text-sm">
              {summaryText}
              {geminiSources.length > 0 && (
                <div className="mt-4 text-xs text-gray-700">
                    <h3 className="font-bold mb-1">Sources:</h3>
                    <ul className="list-disc pl-4">
                        {geminiSources.map((src, i) => (
                            <li key={i}><a href={src.uri} target="_blank" rel="noopener noreferrer" className="underline hover:text-endecja-gold">{src.title}</a></li>
                        ))}
                    </ul>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-endecja-gold/20 flex justify-end">
                <button 
                  onClick={() => setShowSummary(false)}
                  className="px-4 py-2 bg-endecja-base text-endecja-gold rounded text-sm hover:bg-endecja-light"
                >
                  Dismiss
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
