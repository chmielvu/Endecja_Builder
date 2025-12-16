import React, { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
// @ts-ignore
import pdfToText from 'react-pdftotext'; 
import { scout, applyGraphOperations } from '../services/geminiService';
import { useGraphStore } from '../state/graphStore';
import { notify } from '../lib/utils';

export const DocumentUploader = () => {
  const { graph, setLoading, refresh } = useGraphStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    // 1. Validation
    if (!file.name.match(/\.(txt|md|pdf)$/i)) {
      notify.error('Only .txt, .md, .pdf allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      notify.error('File too large (max 5MB)');
      return;
    }

    setIsProcessing(true);
    setLoading(true, 'Extracting text...');

    try {
      // 2. Text Extraction
      let text = '';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
            text = await pdfToText(file);
        } catch (pdfError) {
            console.error("PDF Parsing error:", pdfError);
            throw new Error("Could not parse PDF. Ensure file is text-based.");
        }
      } else {
        text = await file.text();
      }

      if (!text || text.length < 50) {
        throw new Error("Document appears empty or unreadable");
      }

      // 3. Prepare Context for Gemini (prevent duplicates)
      // FIX: Changed graphContext to match the expected type of { nodes: string[]; edges: string[] }
      const graphContext = {
        nodes: graph.nodes().map(n => graph.getNodeAttribute(n, 'label')),
        edges: graph.edges().map(e => `${graph.getNodeAttribute(graph.source(e), 'label')} --[${graph.getEdgeAttribute(e, 'relationshipType')}]--> ${graph.getNodeAttribute(graph.target(e), 'label')}`)
      };

      setLoading(true, 'Analyzing historical entities...');
      
      // 4. AI Analysis (Scout)
      // Signature: contextPrompt, graphContext, documentText
      const prompt = "Extract historical entities and relationships regarding Polish National Democracy.";
      const result = await scout(prompt, graphContext, text);

      // 5. Apply Results
      if (result && result.operations) {
        setLoading(true, 'Updating graph...');
        // Signature: graph, operations, sourceName
        await applyGraphOperations(graph, result.operations, `File: ${file.name}`);
        
        refresh(); // Trigger Sigma re-render
        notify.success(`Imported ${result.operations.length} items from ${file.name}`);
      } else {
        notify.info("No relevant entities found in document.");
      }

    } catch (e: any) {
      console.error(e);
      notify.error(e.message || 'Processing failed');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-endecja-paper/90 rounded-lg border-2 border-dashed border-endecja-gold/30 hover:border-endecja-gold transition-colors">
      <label className="flex flex-col items-center justify-center gap-3 cursor-pointer group">
        {isProcessing ? (
          <Loader2 size={32} className="text-endecja-gold animate-spin" />
        ) : (
          <Upload size={32} className="text-endecja-ink group-hover:scale-110 transition-transform" />
        )}
        
        <div className="text-center">
          <span className="text-sm font-bold text-endecja-ink">Upload Source Material</span>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">
            PDF • TXT • MD (Max 5MB)
          </p>
        </div>

        <input
          type="file"
          accept=".txt,.md,.pdf,application/pdf"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
          disabled={isProcessing}
        />
      </label>
    </div>
  );
};