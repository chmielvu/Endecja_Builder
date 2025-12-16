import React, { useState } from 'react';
import { scout, applyGraphOperations } from '../services/geminiService';
import { useGraphStore } from '../state/graphStore';
import { Brain, Sparkles, Plus, MousePointerClick, X } from 'lucide-react';
import { NodeType, Jurisdiction } from '../types';

export const AiExpansionPanel: React.FC = () => {
  const { graph, selectedNode, setLoading, refresh } = useGraphStore();
  const [suggestions, setSuggestions] = useState<any>(null); // Stores the full result from scout
  const [isExpanding, setIsExpanding] = useState(false);

  // EMPTY STATE: Floating Pill
  if (!selectedNode) {
    return (
      <div className="bg-endecja-paper/80 backdrop-blur-md border border-endecja-gold/40 px-5 py-2 rounded-full shadow-lg flex items-center gap-3 animate-fade-in">
        <div className="bg-endecja-base/10 p-1.5 rounded-full">
            <MousePointerClick size={14} className="text-endecja-base" />
        </div>
        <span className="text-endecja-base font-serif text-sm tracking-wide">Select a node to expand with AI</span>
      </div>
    );
  }

  const attrs = graph.getNodeAttributes(selectedNode);

  const handleExpand = async () => {
    setIsExpanding(true);
    setLoading(true, 'AI is researching connections...');

    try {
      const graphContext = {
        nodes: graph.nodes().map(n => graph.getNodeAttribute(n, 'label')),
        edges: graph.edges().map(e => `${graph.getNodeAttribute(graph.source(e), 'label')} --[${graph.getEdgeAttribute(e, 'relationshipType')}]--> ${graph.getNodeAttribute(graph.target(e), 'label')}`),
      };

      const contextPrompt = `You are focusing on expanding the knowledge graph around the entity: "${attrs.label}" (${attrs.category}, dates: ${attrs.valid_time.start}-${attrs.valid_time.end}).
Description: "${attrs.description}".
Suggest 4-7 new historically relevant nodes (person, organization, event, publication, concept, location) and their connections to "${attrs.label}" or to each other.
Ensure all suggestions are grounded in verifiable historical facts found via Google Search.
Propose only ADD_NODE and ADD_EDGE operations. Do not duplicate existing nodes or edges.`;
      
      const result = await scout(contextPrompt, graphContext);

      setSuggestions(result);
    } catch (error: any) {
      console.error(error);
      alert('Failed to expand: ' + error.message);
    } finally {
      setIsExpanding(false);
      setLoading(false);
    }
  };

  const handleAddSuggestion = (nodeIdToAdd: string) => {
    if (!suggestions || !suggestions.operations) return;

    // Find the ADD_NODE operation for the specific node
    const nodeOp = suggestions.operations.find((op: any) => op.type === 'ADD_NODE' && op.nodeId === nodeIdToAdd);
    if (nodeOp) {
      applyGraphOperations(graph, [nodeOp]); // Apply only this node operation

      // Find and apply related ADD_EDGE operations
      const relatedEdgeOps = suggestions.operations.filter(
        (op: any) => op.type === 'ADD_EDGE' && (op.source === nodeIdToAdd || op.target === nodeIdToAdd)
      );
      applyGraphOperations(graph, relatedEdgeOps);
    }
    
    // Remove the added node and its associated edges from the suggestions state
    setSuggestions((prev: any) => {
      if (!prev) return null;
      const updatedOperations = prev.operations.filter((op: any) => 
        !(op.type === 'ADD_NODE' && op.nodeId === nodeIdToAdd) &&
        !(op.type === 'ADD_EDGE' && (op.source === nodeIdToAdd || op.target === nodeIdToAdd))
      );
      return { ...prev, operations: updatedOperations };
    });
    refresh();
  };

  const currentSuggestedNodes = suggestions?.operations.filter((op: any) => op.type === 'ADD_NODE');
  const hasSuggestions = currentSuggestedNodes && currentSuggestedNodes.length > 0;

  // RESULTS STATE: Expanded List
  if (suggestions) {
      return (
        <div className="w-96 bg-endecja-paper border-2 border-endecja-gold p-4 rounded-lg shadow-2xl max-h-[60vh] overflow-y-auto font-serif">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-endecja-gold/20">
                <h3 className="font-bold text-endecja-base flex items-center gap-2">
                    <Sparkles size={16} className="text-endecja-gold" />
                    AI Suggestions for "{attrs.label}"
                </h3>
                <button onClick={() => setSuggestions(null)} className="hover:text-endecja-alert"><X size={18} /></button>
            </div>

            <div className="bg-white p-3 rounded border border-endecja-gold/20 mb-3">
                <div className="text-xs text-endecja-light italic mb-1">AI Reasoning:</div>
                <div className="text-xs text-endecja-ink leading-relaxed">{suggestions.historicalSummary}</div>
                {suggestions.sources && suggestions.sources.length > 0 && (
                    <div className="mt-2 text-[10px] text-gray-500">
                        <span className="font-bold">Grounded in:</span>
                        <ul className="list-disc pl-4">
                            {suggestions.sources.map((src: any, i: number) => (
                                <li key={i}><a href={src.uri} target="_blank" rel="noopener noreferrer" className="underline hover:text-endecja-gold">{src.title}</a></li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {hasSuggestions ? currentSuggestedNodes.map((op: any) => (
                    <div key={op.nodeId} className="bg-white p-3 rounded border border-endecja-gold/10 shadow-sm flex gap-3 group hover:border-endecja-gold/50 transition-colors">
                        <div className="flex-1">
                            <div className="font-bold text-sm text-endecja-base">{op.attributes.label}</div>
                            <div className="text-xs text-endecja-light uppercase tracking-wider">{op.attributes.category} • {op.attributes.valid_time?.start}-{op.attributes.valid_time?.end}</div>
                            <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{op.attributes.description}</p>
                        </div>
                        <button 
                            onClick={() => handleAddSuggestion(op.nodeId)}
                            className="h-8 w-8 flex items-center justify-center bg-endecja-light text-white rounded hover:bg-endecja-gold transition-colors flex-shrink-0 self-center opacity-0 group-hover:opacity-100"
                            title="Add Node and related Edges"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                )) : (
                    <div className="text-center text-xs text-gray-500 py-4 italic">No more suggestions to add.</div>
                )}
            </div>
            
        </div>
      );
  }

  // ACTIVE SELECTION STATE: Action Bar
  return (
    <div className="bg-endecja-paper border-2 border-endecja-gold rounded-lg shadow-xl p-2 flex items-center gap-3 animate-fade-in-up">
       <div className="px-3">
         <div className="text-[10px] text-endecja-light uppercase tracking-wider font-bold">Active Focus</div>
         <div className="text-sm font-bold text-endecja-base truncate max-w-[150px]">{attrs.label}</div>
       </div>
       <div className="h-8 w-px bg-endecja-gold/30"></div>
       <button 
          onClick={handleExpand}
          disabled={isExpanding}
          className="bg-endecja-base text-endecja-gold px-4 py-2 rounded font-bold text-xs uppercase tracking-wider hover:bg-endecja-gold hover:text-endecja-base transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md"
       >
          <Brain size={14} />
          {isExpanding ? 'Thinking...' : 'Expand Graph'}
       </button>
    </div>
  );
};