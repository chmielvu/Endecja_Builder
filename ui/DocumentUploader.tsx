import React, { useState } from 'react';
import { Upload, FileText, Check } from 'lucide-react';
import { extractEntitiesFromText } from '../services/geminiService';
import { useGraphStore } from '../state/graphStore';
import { NodeType, Jurisdiction } from '../types';

export const DocumentUploader: React.FC = () => {
  const { graph, setLoading } = useGraphStore();
  const [extraction, setExtraction] = useState<any>(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true, 'Reading document...');

    try {
      const text = await file.text();
      
      setLoading(true, 'Analyzing with Gemini...');
      const existingIds = graph.nodes();
      const result = await extractEntitiesFromText(text, existingIds);
      
      setExtraction(result);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      alert('Failed to process document: ' + error.message);
      setLoading(false);
    }
  };

  const handleAddAll = () => {
    if (!extraction) return;

    // Add all nodes
    extraction.nodes.forEach((node: any) => {
      const [startYear, endYear] = node.dates ? node.dates.split('-').map(Number) : [1900, 1939];
      
      // Basic dedup logic: if node exists, maybe update? For now, skip or overwrite.
      // graph.addNode throws if exists.
      if (!graph.hasNode(node.id)) {
        graph.addNode(node.id, {
            label: node.label,
            category: node.type as NodeType, // Map extracted type to category
            jurisdiction: Jurisdiction.OTHER,
            valid_time: { start: startYear, end: endYear },
            x: Math.random() * 20 - 10,
            y: Math.random() * 20 - 10,
            size: 10,
            color: node.type === 'person' ? '#2c241b' : '#8b0000',
            financial_weight: 0.5,
            secrecy_level: 1,
            provenance: {
            source: `AI Extraction from ${fileName}`,
            confidence: 0.8,
            method: 'inference',
            sourceClassification: 'ai_inference', // Set to AI inference
            timestamp: Date.now()
            }
        });
      }
    });

    // Add all edges
    extraction.edges.forEach((edge: any) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        // Generate a unique key for the edge if not provided
        const edgeKey = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        graph.addEdgeWithKey(edgeKey, edge.source, edge.target, {
          relationshipType: edge.relationship, // Use new name 'relationshipType'
          weight: 1,
          sign: 1, // Default to positive, could infer from relationship text
          valid_time: { start: 1900, end: 1939 },
          is_hypothetical: false,
          provenance: {
            source: `AI Extraction from ${fileName}`,
            confidence: 0.7,
            method: 'inference',
            sourceClassification: 'ai_inference', // Set to AI inference
            timestamp: Date.now()
          }
        });
      }
    });

    setExtraction(null);
    setFileName('');
    alert(`Added ${extraction.nodes.length} nodes and ${extraction.edges.length} edges!`);
  };

  return (
    <div className="fixed left-4 bottom-24 w-64 bg-archival-paper border-2 border-archival-sepia p-4 rounded-lg shadow-xl font-serif">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-archival-ink">
        <FileText size={20} />
        Doc Importer
      </h3>

      {!extraction ? (
        <label className="block w-full p-6 border-2 border-dashed border-archival-sepia/50 rounded-lg text-center cursor-pointer hover:bg-archival-faint transition-colors bg-white/50">
          <Upload size={32} className="mx-auto mb-2 text-archival-sepia" />
          <div className="text-sm">
            <span className="font-bold text-archival-ink">Upload Source</span>
            <div className="text-xs text-archival-sepia mt-1">
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
          <div className="bg-white p-3 rounded border border-archival-sepia/20">
            <div className="text-xs text-archival-sepia mb-2">Extracted from {fileName}:</div>
            <div className="text-sm font-bold text-archival-accent">
              {extraction.nodes.length} nodes, {extraction.edges.length} edges
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-archival-sepia/20 max-h-40 overflow-y-auto text-xs">
            <div className="font-bold mb-1 text-archival-ink">Reasoning:</div>
            <div className="text-archival-sepia italic">{extraction.reasoning}</div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleAddAll}
              className="flex-1 bg-archival-navy text-white p-2 rounded font-bold text-sm flex items-center justify-center gap-1 hover:bg-opacity-90"
            >
              <Check size={16} />
              Add All
            </button>
            <button 
              onClick={() => setExtraction(null)}
              className="px-3 bg-white border border-archival-sepia text-archival-ink rounded text-sm hover:bg-archival-faint"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};