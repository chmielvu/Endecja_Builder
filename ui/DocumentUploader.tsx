import React, { useState } from 'react';
import { Upload, FileText, Check } from 'lucide-react';
import { scout, applyGraphOperations } from '../services/geminiService';
import { useGraphStore } from '../state/graphStore';
import { NodeType, Jurisdiction } from '../types';

export const DocumentUploader: React.FC = () => {
  const { graph, setLoading, refresh } = useGraphStore();
  const [extractionResult, setExtractionResult] = useState<any>(null); // Holds result from scout
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true, 'Reading document...');

    try {
      const text = await file.text();
      
      setLoading(true, 'Analyzing with Gemini Scout...');
      
      const graphContext = {
        nodes: graph.nodes().map(n => graph.getNodeAttribute(n, 'label')),
        edges: graph.edges().map(e => `${graph.getNodeAttribute(graph.source(e), 'label')} --[${graph.getEdgeAttribute(e, 'relationshipType')}]--> ${graph.getNodeAttribute(graph.target(e), 'label')}`),
      };

      const contextPrompt = `Extract relevant historical entities (persons, organizations, events, publications) and their relationships from the provided document.
Propose ADD_NODE and ADD_EDGE operations. Focus only on entities directly mentioned.
Ensure proposed nodes are not duplicates of existing nodes.`;

      const result = await scout(contextPrompt, graphContext, text);
      
      setExtractionResult(result);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      alert('Failed to process document: ' + error.message);
      setLoading(false);
    }
  };

  const handleAddAll = () => {
    if (!extractionResult) return;

    applyGraphOperations(graph, extractionResult.operations, `AI Document: ${fileName}`);
    
    setExtractionResult(null);
    setFileName('');
    refresh(); // Explicitly refresh after operations
    alert(`Added ${extractionResult.operations.filter((op: any) => op.type === 'ADD_NODE').length} nodes and ${extractionResult.operations.filter((op: any) => op.type === 'ADD_EDGE').length} edges from ${fileName}!`);
  };

  return (
    <div className="w-64 bg-endecja-paper border-2 border-endecja-gold p-4 rounded-lg shadow-xl font-serif">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-endecja-ink">
        <FileText size={20} />
        Doc Importer
      </h3>

      {!extractionResult ? (
        <label className="block w-full p-6 border-2 border-dashed border-endecja-gold/50 rounded-lg text-center cursor-pointer hover:bg-endecja-gold/10 transition-colors bg-white/50">
          <Upload size={32} className="mx-auto mb-2 text-endecja-gold" />
          <div className="text-sm">
            <span className="font-bold text-endecja-ink">Upload Source</span>
            <div className="text-xs text-endecja-gold mt-1">
              .txt, .md files
            </div>
          </div>
          <input 
            type="file" 
            accept=".txt,.md" 
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border border-endecja-gold/20">
            <div className="text-xs text-endecja-gold mb-2">Extracted from {fileName}:</div>
            <div className="text-sm font-bold text-endecja-gold">
              {extractionResult.operations.filter((op: any) => op.type === 'ADD_NODE').length} nodes, {extractionResult.operations.filter((op: any) => op.type === 'ADD_EDGE').length} edges
            </div>
            {extractionResult.sources && extractionResult.sources.length > 0 && (
                <div className="mt-2 text-[10px] text-gray-500">
                    <span className="font-bold">Sources:</span>
                    <ul className="list-disc pl-4">
                        {extractionResult.sources.map((src: any, i: number) => (
                            <li key={i}><a href={src.uri} target="_blank" rel="noopener noreferrer" className="underline hover:text-endecja-gold">{src.title}</a></li>
                        ))}
                    </ul>
                </div>
            )}
          </div>

          <div className="bg-white p-3 rounded border border-endecja-gold/20 max-h-40 overflow-y-auto text-xs">
            <div className="font-bold mb-1 text-endecja-ink">Summary:</div>
            <div className="text-endecja-gold italic">{extractionResult.historicalSummary}</div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleAddAll}
              className="flex-1 bg-endecja-ink text-white p-2 rounded font-bold text-sm flex items-center justify-center gap-1 hover:bg-opacity-90"
            >
              <Check size={16} />
              Add All
            </button>
            <button 
              onClick={() => setExtractionResult(null)}
              className="px-3 bg-white border border-endecja-gold text-endecja-ink rounded text-sm hover:bg-endecja-gold/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};