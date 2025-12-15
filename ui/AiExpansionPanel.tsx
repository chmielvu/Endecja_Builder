import React, { useState } from 'react';
import { suggestGraphExpansion } from '../services/geminiService';
import { useGraphStore } from '../state/graphStore';
import { Brain, Sparkles, Plus } from 'lucide-react';
import { NodeType, Jurisdiction } from '../types';

export const AiExpansionPanel: React.FC = () => {
  const { graph, selectedNode, setLoading } = useGraphStore();
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isExpanding, setIsExpanding] = useState(false);

  if (!selectedNode) {
    return (
      <div className="fixed right-4 bottom-24 w-80 bg-archival-paper border-2 border-archival-sepia p-4 rounded-lg shadow-xl font-serif">
        <div className="text-center text-archival-sepia text-sm flex items-center justify-center gap-2">
            <Brain size={16} />
            Select a node to expand with AI
        </div>
      </div>
    );
  }

  const attrs = graph.getNodeAttributes(selectedNode);

  const handleExpand = async () => {
    setIsExpanding(true);
    setLoading(true, 'AI is researching connections...');

    try {
      const connected = [...graph.outNeighbors(selectedNode), ...graph.inNeighbors(selectedNode)]
        .map(id => graph.getNodeAttribute(id, 'label'));
      
      const existing = graph.nodes();

      const result = await suggestGraphExpansion(
        selectedNode,
        attrs.label,
        attrs.description || '', // Use description for context
        connected,
        existing
      );

      setSuggestions(result);
    } catch (error: any) {
      console.error(error);
      alert('Failed to expand: ' + error.message);
    } finally {
      setIsExpanding(false);
      setLoading(false);
    }
  };

  const handleAddSuggestion = (node: any) => {
    const [startYear, endYear] = node.dates ? node.dates.split('-').map(Number) : [1900, 1939];

    if (!graph.hasNode(node.id)) {
        graph.addNode(node.id, {
        label: node.label,
        type: node.type as NodeType,
        description: node.description,
        jurisdiction: Jurisdiction.OTHER,
        valid_time: { start: startYear, end: endYear },
        x: Math.random() * 20 - 10,
        y: Math.random() * 20 - 10,
        size: 10,
        color: node.type === 'person' ? '#2c241b' : '#8b0000',
        financial_weight: 0.5,
        secrecy_level: 1,
        provenance: {
            source: 'AI Expansion (Gemini)',
            confidence: 0.75,
            method: 'inference',
            timestamp: Date.now()
        }
        });
    }

    // Add edges for this node
    const relatedEdges = suggestions.edges.filter(
      (e: any) => e.source === node.id || e.target === node.id
    );

    relatedEdges.forEach((edge: any) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        const edgeKey = `edge_${Date.now()}_${Math.random()}`;
        if (!graph.hasEdge(edgeKey)) {
            graph.addEdgeWithKey(edgeKey, edge.source, edge.target, {
            type: edge.relationship,
            weight: 1,
            sign: 1,
            valid_time: { start: startYear, end: endYear },
            is_hypothetical: false,
            provenance: {
                source: 'AI Expansion (Gemini)',
                confidence: 0.7,
                method: 'inference',
                timestamp: Date.now()
            }
            });
        }
      }
    });

    // Remove from suggestions
    setSuggestions((prev: any) => ({
      ...prev,
      nodes: prev.nodes.filter((n: any) => n.id !== node.id)
    }));
  };

  return (
    <div className="fixed right-4 bottom-24 w-80 bg-archival-paper border-2 border-archival-sepia p-4 rounded-lg shadow-xl max-h-[600px] overflow-y-auto font-serif z-20">
      <div className="flex items-center gap-2 mb-3 border-b border-archival-sepia/20 pb-2">
        <Sparkles size={20} className="text-archival-gold" />
        <h3 className="font-bold text-lg text-archival-ink">AI Expansion</h3>
      </div>

      <div className="mb-4 p-3 bg-white rounded border border-archival-sepia/20">
        <div className="text-sm font-bold mb-1 text-archival-ink">Selected Node:</div>
        <div className="text-archival-accent font-bold text-sm">{attrs.label}</div>
      </div>

      {!suggestions ? (
        <button 
          onClick={handleExpand}
          disabled={isExpanding}
          className="w-full bg-archival-navy text-white p-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 transition-colors"
        >
          <Brain size={16} />
          {isExpanding ? 'Researching...' : 'Suggest Connections'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border border-archival-sepia/20">
            <div className="text-xs font-bold mb-1 text-archival-ink">Reasoning:</div>
            <div className="text-xs text-archival-sepia italic">{suggestions.reasoning}</div>
          </div>

          <div className="text-sm font-bold text-archival-ink">
            {suggestions.nodes.length} Suggested Nodes:
          </div>

          {suggestions.nodes.map((node: any) => (
            <div 
              key={node.id}
              className="bg-white p-3 rounded border border-archival-sepia/20 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-sm text-archival-ink">{node.label}</div>
                  <div className="text-xs text-archival-sepia">{node.type} • {node.dates}</div>
                </div>
                <button 
                  onClick={() => handleAddSuggestion(node)}
                  className="bg-archival-accent text-white p-1.5 rounded hover:bg-red-700 transition-colors"
                  title="Add to graph"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="text-xs text-gray-700 leading-snug">{node.description}</div>
            </div>
          ))}

          <button 
            onClick={() => setSuggestions(null)}
            className="w-full bg-white border border-archival-sepia text-archival-ink p-2 rounded text-sm hover:bg-archival-faint"
          >
            Close Results
          </button>
        </div>
      )}
    </div>
  );
};