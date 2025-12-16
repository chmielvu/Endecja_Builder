import React, { useState } from 'react';
import { scout, applyGraphOperations } from '../services/geminiService';
import { useGraphStore } from '../state/graphStore';
import { getLoadingMessage } from '../config/mlConfig';
import { 
  Brain, Sparkles, Plus, MousePointerClick, X, 
  CheckCircle, AlertCircle, Info, ExternalLink 
} from 'lucide-react';

interface SuggestionWithMetadata {
  operation: any;
  confidence: number;
  reasoning?: string;
  sources: Array<{ uri: string; title: string; relevance: string }>;
}

export const AiExpansionPanel: React.FC = () => {
  const { graph, selectedNode, setLoading, refresh } = useGraphStore();
  const [result, setResult] = useState<{
    summary: string;
    methodology: string;
    confidence: number;
    suggestions: SuggestionWithMetadata[];
    sources: Array<{ uri: string; title: string; relevance: string }>;
  } | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandedSources, setExpandedSources] = useState(false);

  // Empty state
  if (!selectedNode) {
    return (
      <div className="bg-endecja-paper/80 backdrop-blur-md border border-endecja-gold/40 px-5 py-2 rounded-full shadow-lg flex items-center gap-3 animate-fade-in">
        <div className="bg-endecja-base/10 p-1.5 rounded-full">
            <MousePointerClick size={14} className="text-endecja-base" />
        </div>
        <span className="text-endecja-base font-serif text-sm tracking-wide">
          Select a node to discover connections
        </span>
      </div>
    );
  }

  const attrs = graph.getNodeAttributes(selectedNode);

  const handleExpand = async () => {
    setIsExpanding(true);
    
    // Multi-stage loading
    const stages = ['initializing', 'searching', 'evaluating', 'extracting', 'synthesizing'];
    let currentStage = 0;
    
    const loadingInterval = setInterval(() => {
      if (currentStage < stages.length) {
        setLoading(true, getLoadingMessage('scout', stages[currentStage]));
        currentStage++;
      }
    }, 2500);

    try {
      const graphContext = {
        nodes: graph.nodes().map(n => graph.getNodeAttribute(n, 'label')),
        edges: graph.edges().map(e => {
          const src = graph.getNodeAttribute(graph.source(e), 'label');
          const tgt = graph.getNodeAttribute(graph.target(e), 'label');
          const rel = graph.getEdgeAttribute(e, 'relationshipType');
          return `${src} --[${rel}]--> ${tgt}`;
        }),
      };

      // Enhanced context prompt with scholarly standards
      const contextPrompt = `# Research Task: Expand Knowledge Graph Around Historical Entity

## Target Entity
**Name**: ${attrs.label}
**Type**: ${attrs.category}
**Period**: ${attrs.valid_time.start}-${attrs.valid_time.end}
**Jurisdiction**: ${attrs.jurisdiction}
**Description**: ${attrs.description || 'No description available'}

## Research Objectives

You are conducting archival research to expand our understanding of this entity's historical network.

### Discovery Goals:
1. **Primary Actors**: Identify 3-5 key individuals directly connected to "${attrs.label}"
   - Collaborators, opponents, mentors, protégés
   - Include biographical details and relationship nature

2. **Institutional Connections**: Find 2-3 organizations linked to this entity
   - Founding, membership, affiliation, opposition
   - Specify founding/dissolution dates

3. **Critical Events**: Locate 1-2 significant events involving this entity
   - Meetings, publications, conflicts, transformations
   - Provide exact or approximate dates

4. **Conceptual Links**: Identify 1-2 ideas/concepts this entity promoted or opposed
   - Theoretical frameworks, political doctrines, ideological positions

### Quality Standards:
- **Verification**: Every proposed entity MUST be supported by sources from Google Search
- **Temporal Precision**: Always specify dates (year minimum, month/day if available)
- **No Duplication**: Check existing graph carefully - do not recreate nodes
- **Relationship Clarity**: Use descriptive verbs (founded, opposed, mentored, succeeded)
- **Source Priority**: Favor primary sources and peer-reviewed scholarship

### Confidence Assessment:
Rate your overall confidence (0.0-1.0) based on:
- Source quality (primary > secondary > tertiary)
- Source quantity (multiple corroborating sources)
- Source recency (recent scholarship preferred)
- Historical consensus (established facts > disputed claims)

### Output Requirements:
- Propose 5-10 graph operations (ADD_NODE, ADD_EDGE)
- Provide a 2-3 paragraph historical synthesis explaining the discovered connections
- Explain your research methodology briefly
- Cite all sources with relevance notes`;
      
      const scoutResult = await scout(contextPrompt, graphContext);

      clearInterval(loadingInterval);

      // Process suggestions with metadata
      const suggestions: SuggestionWithMetadata[] = scoutResult.operations.map(op => ({
        operation: op,
        confidence: scoutResult.confidence,
        reasoning: op.attributes?.description,
        sources: scoutResult.sources.filter(s => 
          op.attributes?.label && s.title.toLowerCase().includes(op.attributes.label.toLowerCase())
        ),
      }));

      setResult({
        summary: scoutResult.historicalSummary,
        methodology: scoutResult.methodology,
        confidence: scoutResult.confidence,
        suggestions,
        sources: scoutResult.sources,
      });
      
    } catch (error: any) {
      clearInterval(loadingInterval);
      console.error(error);
      alert('Expansion failed: ' + error.message);
    } finally {
      setIsExpanding(false);
      setLoading(false);
    }
  };

  const handleAddSuggestion = (suggestion: SuggestionWithMetadata) => {
    const op = suggestion.operation;
    
    // Apply the node
    if (op.type === 'ADD_NODE') {
      applyGraphOperations(graph, [op], `AI Scout: ${attrs.label} expansion`);
    }
    
    // Apply related edges
    const relatedEdges = result!.suggestions
      .filter(s => s.operation.type === 'ADD_EDGE')
      .filter(s => 
        s.operation.source === op.nodeId || 
        s.operation.target === op.nodeId
      )
      .map(s => s.operation);
    
    if (relatedEdges.length > 0) {
      applyGraphOperations(graph, relatedEdges, `AI Scout: ${attrs.label} expansion`);
    }
    
    // Remove from suggestions
    setResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        suggestions: prev.suggestions.filter(s => 
          s.operation !== op && !relatedEdges.includes(s.operation)
        ),
      };
    });
    
    refresh();
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-700 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle size={14} />;
    if (confidence >= 0.6) return <Info size={14} />;
    return <AlertCircle size={14} />;
  };

  // Results state
  if (result) {
    const nodeSuggestions = result.suggestions.filter(s => s.operation.type === 'ADD_NODE');
    const hasNodeSuggestions = nodeSuggestions.length > 0;
    
    return (
      <div className="w-[500px] bg-endecja-paper border-2 border-endecja-gold rounded-lg shadow-2xl max-h-[70vh] flex flex-col font-serif">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-endecja-gold/20 bg-gradient-to-r from-endecja-paper to-endecja-gold/5">
          <div>
            <h3 className="font-bold text-endecja-base flex items-center gap-2 text-base">
              <Sparkles size={18} className="text-endecja-gold" />
              Research Results
            </h3>
            <div className="text-xs text-endecja-light mt-1">
              Expanding: <span className="font-semibold text-endecja-ink">{attrs.label}</span>
            </div>
          </div>
          <button 
            onClick={() => setResult(null)} 
            className="hover:text-endecja-alert transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Confidence Badge */}
        <div className={`mx-4 mt-4 p-3 rounded-lg border flex items-center gap-3 ${getConfidenceColor(result.confidence)}`}>
          {getConfidenceIcon(result.confidence)}
          <div className="flex-1">
            <div className="text-xs font-bold uppercase">Research Confidence</div>
            <div className="text-sm font-semibold">{(result.confidence * 100).toFixed(0)}% confidence</div>
          </div>
          <div className="text-2xl font-bold">{result.confidence.toFixed(2)}</div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Historical Summary */}
          <div className="bg-white/70 p-4 rounded-lg border border-endecja-gold/20">
            <div className="text-xs font-bold uppercase text-endecja-gold mb-2">Historical Context</div>
            <div className="text-sm leading-relaxed text-endecja-ink">{result.summary}</div>
          </div>

          {/* Methodology */}
          <details className="bg-blue-50 p-3 rounded border border-blue-200 text-xs">
            <summary className="font-bold text-blue-900 cursor-pointer hover:text-blue-700">
              Research Methodology
            </summary>
            <div className="mt-2 text-blue-800 leading-relaxed">
              {result.methodology}
            </div>
          </details>

          {/* Sources */}
          {result.sources.length > 0 && (
            <details 
              open={expandedSources}
              onToggle={(e) => setExpandedSources((e.target as HTMLDetailsElement).open)}
              className="bg-gray-50 p-3 rounded border border-gray-200"
            >
              <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-gray-900 flex items-center gap-2">
                <ExternalLink size={12} />
                Grounding Sources ({result.sources.length})
              </summary>
              <ul className="mt-2 space-y-2 text-[10px]">
                {result.sources.map((src, i) => (
                  <li key={i} className="border-l-2 border-gray-300 pl-2 hover:border-endecja-gold transition-colors">
                    <a 
                      href={src.uri} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-semibold text-blue-600 hover:underline block"
                    >
                      {src.title}
                    </a>
                    {src.relevance && (
                      <div className="text-gray-600 mt-1 italic">{src.relevance}</div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Suggestions */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase text-endecja-ink flex items-center justify-between">
              <span>Discovered Entities ({nodeSuggestions.length})</span>
              {hasNodeSuggestions && (
                <button
                  onClick={() => {
                    nodeSuggestions.forEach(s => handleAddSuggestion(s));
                  }}
                  className="text-[10px] bg-endecja-base text-endecja-gold px-2 py-1 rounded hover:bg-black"
                >
                  Add All
                </button>
              )}
            </div>

            {hasNodeSuggestions ? (
              nodeSuggestions.map((suggestion) => (
                <div 
                  key={suggestion.operation.nodeId} 
                  className="bg-white p-3 rounded border border-endecja-gold/10 shadow-sm hover:shadow-md hover:border-endecja-gold/50 transition-all group"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-endecja-base truncate">
                        {suggestion.operation.attributes.label}
                      </div>
                      <div className="text-[10px] text-endecja-light uppercase tracking-wider mt-0.5">
                        {suggestion.operation.attributes.category} • 
                        {suggestion.operation.attributes.valid_time?.start}-
                        {suggestion.operation.attributes.valid_time?.end}
                      </div>
                      {suggestion.reasoning && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                          {suggestion.reasoning}
                        </p>
                      )}
                      {suggestion.sources.length > 0 && (
                        <div className="text-[9px] text-gray-500 mt-1 flex items-center gap-1">
                          <ExternalLink size={8} />
                          {suggestion.sources.length} source(s)
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleAddSuggestion(suggestion)}
                      className="h-9 w-9 flex items-center justify-center bg-endecja-light text-white rounded hover:bg-endecja-gold hover:text-endecja-base transition-colors flex-shrink-0 self-start opacity-0 group-hover:opacity-100 shadow-md"
                      title="Add to Graph"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-gray-500 py-6 italic bg-gray-50 rounded border border-dashed border-gray-300">
                All suggestions have been added to the graph
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-endecja-gold/20 bg-gradient-to-r from-endecja-paper to-endecja-gold/5">
          <button
            onClick={() => setResult(null)}
            className="w-full bg-endecja-base text-endecja-gold p-2 rounded font-bold text-sm hover:bg-black transition-colors"
          >
            Close Results
          </button>
        </div>
      </div>
    );
  }

  // Active selection state
  return (
    <div className="bg-endecja-paper border-2 border-endecja-gold rounded-lg shadow-xl p-2 flex items-center gap-3 animate-fade-in-up">
       <div className="px-3">
         <div className="text-[10px] text-endecja-light uppercase tracking-wider font-bold">
           Active Focus
         </div>
         <div className="text-sm font-bold text-endecja-base truncate max-w-[180px]">
           {attrs.label}
         </div>
         <div className="text-[9px] text-endecja-gold">
           {attrs.category} • {attrs.valid_time.start}-{attrs.valid_time.end}
         </div>
       </div>
       <div className="h-10 w-px bg-endecja-gold/30"></div>
       <button 
          onClick={handleExpand}
          disabled={isExpanding}
          className="bg-gradient-to-r from-endecja-base to-endecja-light text-endecja-gold px-5 py-2.5 rounded font-bold text-xs uppercase tracking-wider hover:from-endecja-gold hover:to-yellow-500 hover:text-endecja-base transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
       >
          {isExpanding ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              Researching...
            </>
          ) : (
            <>
              <Brain size={16} />
              Discover Connections
            </>
          )}
       </button>
    </div>
  );
};