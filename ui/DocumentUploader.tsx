import React, { useState } from 'react';
import { Upload, FileText, Check, X, AlertCircle, ExternalLink, Info } from 'lucide-react';
import { scout, applyGraphOperations } from '../services/geminiService';
import { useGraphStore } from '../state/graphStore';
import { getLoadingMessage } from '../config/mlConfig';

interface ExtractionResult {
  operations: any[];
  summary: string;
  methodology: string;
  confidence: number;
  sources: Array<{ uri: string; title: string; relevance: string }>;
  fileName: string;
  wordCount: number;
}

export const DocumentUploader: React.FC = () => {
  const { graph, setLoading, refresh } = useGraphStore();
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(txt|md)$/i)) {
      alert('Please upload a .txt or .md file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    setIsProcessing(true);
    
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
      const text = await file.text();
      const wordCount = text.split(/\s+/).length;
      
      // Warn if document is very long
      if (wordCount > 5000) {
        const proceed = confirm(
          `This document is ${wordCount.toLocaleString()} words long. Processing may take 30-60 seconds. Continue?`
        );
        if (!proceed) {
          clearInterval(loadingInterval);
          setIsProcessing(false);
          setLoading(false);
          return;
        }
      }

      const graphContext = {
        nodes: graph.nodes().map(n => graph.getNodeAttribute(n, 'label')),
        edges: graph.edges().map(e => 
          `${graph.getNodeAttribute(graph.source(e), 'label')} --[${graph.getEdgeAttribute(e, 'relationshipType')}]--> ${graph.getNodeAttribute(graph.target(e), 'label')}`
        ),
      };

      // Enhanced extraction prompt
      const contextPrompt = `# Historical Document Analysis Task

## Document Information
- **Filename**: ${file.name}
- **Length**: ~${wordCount} words
- **Format**: Plain text historical source

## Analysis Objectives

You are performing systematic entity extraction from a historical document about Polish National Democracy (Endecja) and related political movements (1893-1939).

### Extraction Guidelines:

**1. Entity Types to Extract:**
- **Persons**: Politicians, intellectuals, activists (full names, roles, dates)
- **Organizations**: Parties, societies, publications (founding dates, purposes)
- **Events**: Meetings, publications, conflicts, elections (precise dates)
- **Publications**: Books, newspapers, manifestos (authors, years)
- **Concepts**: Political doctrines, ideologies (key theorists, time periods)

**2. Quality Standards:**
- **Relevance**: Only extract entities directly related to Endecja/Polish politics
- **Verification**: Every entity MUST be verifiable via Google Search
- **Completeness**: Include biographical/historical details (dates, roles, context)
- **No Duplication**: Check existing graph carefully before proposing nodes
- **Temporal Precision**: Always specify dates (year minimum)

**3. Relationship Mapping:**
- Connect new entities to each other AND to existing graph nodes
- Use descriptive relationship types: "founded", "opposed", "collaborated_with", "succeeded"
- Assign correct polarity: +1 (support/alliance), -1 (opposition/conflict), 0 (neutral/complex)
- Cite evidence for each relationship

**4. Confidence Assessment:**
Rate overall confidence (0.0-1.0) based on:
- Document authenticity (primary source > secondary > tertiary)
- Internal consistency of information
- Corroboration from external sources (Google Search)
- Clarity and explicitness of claims

**5. Output Constraints:**
- Extract 8-15 entities maximum (quality over quantity)
- Create 10-20 relationships between entities
- Provide a 2-3 paragraph synthesis explaining document's significance
- Explain your extraction methodology
- List all grounding sources with relevance notes

## Critical Reminders:
- DO NOT hallucinate entities not in the document
- DO NOT duplicate existing graph nodes
- DO cite specific passages when extracting entities
- DO use Google Search to verify all claims`;

      const scoutResult = await scout(contextPrompt, graphContext, text);

      clearInterval(loadingInterval);

      setResult({
        operations: scoutResult.operations,
        summary: scoutResult.historicalSummary,
        methodology: scoutResult.methodology,
        confidence: scoutResult.confidence,
        sources: scoutResult.sources,
        fileName: file.name,
        wordCount: wordCount,
      });

    } catch (error: any) {
      clearInterval(loadingInterval);
      console.error(error);
      alert('Document processing failed: ' + error.message);
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleAddAll = () => {
    if (!result) return;

    applyGraphOperations(graph, result.operations, `Document: ${result.fileName}`);
    
    const nodesAdded = result.operations.filter(op => op.type === 'ADD_NODE').length;
    const edgesAdded = result.operations.filter(op => op.type === 'ADD_EDGE').length;
    
    alert(
      `Successfully imported from "${result.fileName}":\n` +
      `• ${nodesAdded} entities\n` +
      `• ${edgesAdded} relationships\n\n` +
      `Confidence: ${(result.confidence * 100).toFixed(0)}%`
    );
    
    setResult(null);
    refresh();
  };

  const handleAddSelective = (operation: any) => {
    applyGraphOperations(graph, [operation], `Document: ${result!.fileName}`);
    
    setResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        operations: prev.operations.filter(op => op !== operation),
      };
    });
    
    refresh();
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-700 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Moderate Confidence';
    return 'Low Confidence - Review Required';
  };

  return (
    <div className="w-80 bg-endecja-paper border-2 border-endecja-gold p-4 rounded-lg shadow-xl font-serif">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-endecja-ink">
        <FileText size={20} />
        Document Importer
      </h3>

      {!result ? (
        <>
          <label className="block w-full p-6 border-2 border-dashed border-endecja-gold/50 rounded-lg text-center cursor-pointer hover:bg-endecja-gold/10 transition-colors bg-white/50 group">
            <Upload size={32} className="mx-auto mb-3 text-endecja-gold group-hover:scale-110 transition-transform" />
            <div className="text-sm">
              <span className="font-bold text-endecja-ink block mb-1">Upload Historical Source</span>
              <div className="text-xs text-endecja-gold">
                .txt or .md files (max 5MB)
              </div>
            </div>
            <input 
              type="file" 
              accept=".txt,.md" 
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
          </label>

          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <div className="font-bold mb-1 flex items-center gap-1">
              <Info size={12} />
              Best Practices
            </div>
            <ul className="space-y-1 text-[10px] leading-relaxed">
              <li>• Use primary sources when possible</li>
              <li>• Include dates and contextual information</li>
              <li>• Keep documents focused (under 3000 words)</li>
              <li>• Avoid OCR errors - clean text first</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {/* Header Info */}
          <div className="bg-white p-3 rounded border border-endecja-gold/20">
            <div className="text-xs text-endecja-gold font-bold mb-1">Source Document</div>
            <div className="text-sm font-bold text-endecja-ink truncate" title={result.fileName}>
              {result.fileName}
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              {result.wordCount.toLocaleString()} words • 
              {result.operations.filter(op => op.type === 'ADD_NODE').length} entities • 
              {result.operations.filter(op => op.type === 'ADD_EDGE').length} relationships
            </div>
          </div>

          {/* Confidence Badge */}
          <div className={`p-3 rounded border flex items-center gap-2 ${getConfidenceColor(result.confidence)}`}>
            <AlertCircle size={16} />
            <div className="flex-1">
              <div className="text-xs font-bold">{getConfidenceLabel(result.confidence)}</div>
              <div className="text-[10px] opacity-70">Based on source quality & verification</div>
            </div>
            <div className="text-lg font-bold">{(result.confidence * 100).toFixed(0)}%</div>
          </div>

          {/* Summary */}
          <div className="bg-white p-3 rounded border border-endecja-gold/20 max-h-32 overflow-y-auto text-xs">
            <div className="font-bold mb-1 text-endecja-ink">Historical Context</div>
            <div className="text-endecja-gold leading-relaxed">{result.summary}</div>
          </div>

          {/* Methodology */}
          <details className="bg-gray-50 p-2 rounded border border-gray-200 text-xs">
            <summary className="font-bold text-gray-700 cursor-pointer hover:text-gray-900 text-[10px]">
              Extraction Methodology
            </summary>
            <div className="mt-2 text-[10px] text-gray-600 leading-relaxed">
              {result.methodology}
            </div>
          </details>

          {/* Sources */}
          {result.sources.length > 0 && (
            <details 
              open={showSources}
              onToggle={(e) => setShowSources((e.target as HTMLDetailsElement).open)}
              className="bg-gray-50 p-2 rounded border border-gray-200"
            >
              <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-gray-900 flex items-center gap-1">
                <ExternalLink size={10} />
                Verification Sources ({result.sources.length})
              </summary>
              <ul className="mt-2 space-y-1 text-[9px] max-h-32 overflow-y-auto">
                {result.sources.map((src, i) => (
                  <li key={i} className="border-l-2 border-blue-300 pl-2 hover:border-endecja-gold transition-colors">
                    <a 
                      href={src.uri} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-semibold text-blue-600 hover:underline block"
                    >
                      {src.title}
                    </a>
                    {src.relevance && (
                      <div className="text-gray-600 italic">{src.relevance}</div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Preview Entities (first 3) */}
          <div className="bg-white p-3 rounded border border-endecja-gold/10">
            <div className="text-xs font-bold text-endecja-ink mb-2">Extracted Entities Preview</div>
            <div className="space-y-1">
              {result.operations
                .filter(op => op.type === 'ADD_NODE')
                .slice(0, 3)
                .map((op, idx) => (
                  <div key={idx} className="text-[10px] border-l-2 border-endecja-gold pl-2">
                    <span className="font-bold">{op.attributes.label}</span>
                    <span className="text-gray-500"> ({op.attributes.category})</span>
                  </div>
                ))}
              {result.operations.filter(op => op.type === 'ADD_NODE').length > 3 && (
                <div className="text-[9px] text-gray-500 italic">
                  +{result.operations.filter(op => op.type === 'ADD_NODE').length - 3} more...
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={handleAddAll}
              className="flex-1 bg-endecja-ink text-white p-3 rounded font-bold text-sm flex items-center justify-center gap-1 hover:bg-opacity-90 shadow-md"
            >
              <Check size={16} />
              Import All
            </button>
            <button 
              onClick={() => setResult(null)}
              className="px-4 bg-white border border-endecja-gold text-endecja-ink rounded text-sm hover:bg-endecja-gold/10 font-bold"
            >
              <X size={16} />
            </button>
          </div>

          {/* Warning for low confidence */}
          {result.confidence < 0.6 && (
            <div className="bg-yellow-50 border border-yellow-300 p-2 rounded text-xs text-yellow-900">
              <div className="font-bold mb-1 flex items-center gap-1">
                <AlertCircle size={12} />
                Low Confidence Warning
              </div>
              <div className="text-[10px] leading-tight">
                This extraction has lower confidence. Review entities carefully before importing. 
                Consider seeking additional primary sources for verification.
              </div>
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="mt-3 flex items-center gap-2 text-xs text-endecja-gold">
          <div className="animate-spin w-4 h-4 border-2 border-endecja-gold border-t-transparent rounded-full" />
          Processing document...
        </div>
      )}
    </div>
  );
};