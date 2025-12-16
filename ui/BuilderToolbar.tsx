
import React, { useState } from 'react';
import { useGraphStore } from '../state/graphStore';
import { exportPublicGraph, exportStaticViewer } from '../utils/builderExport';
import { 
  ArrowLeft, Undo, Redo, Plus, Eye, Download, 
  Save, Upload, Sparkles, ZoomIn
} from 'lucide-react';

export const BuilderToolbar: React.FC = () => {
  const { 
    mode, setMode, graph, undo, redo, canUndo, canRedo, 
    addNodeMinimal, saveBuilderDraft, loadBuilderDraft 
  } = useGraphStore();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleAddNode = () => {
    // Add node at canvas center (approximated for now)
    addNodeMinimal('person' as any, 0, 0);
  };

  const handlePreview = () => {
    // Open preview in new window (simplified)
    const previewUrl = `data:text/html;charset=utf-8,${encodeURIComponent("<html><body><h1>Preview Not Available in Scaffold</h1><p>Use Export Static Viewer to see full result.</p></body></html>")}`;
    window.open(previewUrl, '_blank');
  };

  const handleExportJSON = () => {
    exportPublicGraph(graph);
    setShowExportMenu(false);
  };

  const handleExportStatic = () => {
    exportStaticViewer(graph);
    setShowExportMenu(false);
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-endecja-gold shadow-md z-30">
      {/* Left: Mode + Logo */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setMode('analysis')}
          className="flex items-center gap-2 px-4 py-2 bg-endecja-light text-endecja-gold rounded hover:bg-endecja-gold hover:text-endecja-base transition-all font-bold text-sm"
          title="Return to Analysis Mode"
        >
          <ArrowLeft size={16} />
          Analysis Mode
        </button>
        
        <div className="h-8 w-px bg-endecja-gold/30"></div>
        
        <div className="flex items-center gap-2">
          <Sparkles className="text-endecja-gold" size={20} />
          <span className="text-endecja-gold font-bold text-lg tracking-widest font-serif">
            VISUAL BUILDER
          </span>
        </div>
      </div>

      {/* Center: Main Actions */}
      <div className="flex items-center gap-2">
        
        {/* Undo/Redo */}
        <button 
          onClick={undo} 
          disabled={!canUndo()}
          className="p-2 bg-endecja-paper text-endecja-base rounded hover:bg-endecja-gold hover:text-endecja-base disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo size={18} />
        </button>
        
        <button 
          onClick={redo} 
          disabled={!canRedo()}
          className="p-2 bg-endecja-paper text-endecja-base rounded hover:bg-endecja-gold hover:text-endecja-base disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Redo (Ctrl+Y)"
        >
          <Redo size={18} />
        </button>

        <div className="h-8 w-px bg-endecja-gold/30 mx-2"></div>

        {/* Add Node */}
        <button 
          onClick={handleAddNode}
          className="flex items-center gap-2 px-4 py-2 bg-endecja-gold text-endecja-base rounded hover:bg-yellow-500 transition-all font-bold text-sm shadow-md"
          title="Add Node"
        >
          <Plus size={18} />
          Add Node
        </button>

        {/* Zoom Fit (Placeholder) */}
        <button 
          className="p-2 bg-endecja-paper text-endecja-base rounded hover:bg-endecja-gold hover:text-endecja-base transition-all"
          title="Zoom to Fit"
        >
          <ZoomIn size={18} />
        </button>

        <div className="h-8 w-px bg-endecja-gold/30 mx-2"></div>

        {/* Preview */}
        <button 
          onClick={handlePreview}
          className="flex items-center gap-2 px-4 py-2 bg-endecja-paper text-endecja-base rounded hover:bg-endecja-gold hover:text-endecja-base transition-all font-bold text-sm"
        >
          <Eye size={18} />
          Preview
        </button>

        {/* Export Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-endecja-paper text-endecja-base rounded hover:bg-endecja-gold hover:text-endecja-base transition-all font-bold text-sm"
          >
            <Download size={18} />
            Export ▾
          </button>
          
          {showExportMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowExportMenu(false)}
              ></div>
              <div className="absolute right-0 top-full mt-2 bg-endecja-paper border-2 border-endecja-gold rounded-lg shadow-2xl overflow-hidden z-50 min-w-[200px]">
                <button 
                  onClick={handleExportJSON}
                  className="w-full px-4 py-3 text-left hover:bg-endecja-gold/10 transition-colors text-sm font-semibold border-b border-endecja-gold/20"
                >
                  <div className="flex items-center gap-2">
                    <Download size={16} />
                    <div>
                      <div>Export Public Graph</div>
                      <div className="text-xs text-endecja-light">JSON with images</div>
                    </div>
                  </div>
                </button>
                
                <button 
                  onClick={handleExportStatic}
                  className="w-full px-4 py-3 text-left hover:bg-endecja-gold/10 transition-colors text-sm font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <Download size={16} />
                    <div>
                      <div>Export Static Viewer</div>
                      <div className="text-xs text-endecja-light">Standalone HTML</div>
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Save/Load */}
      <div className="flex items-center gap-2">
        <button 
          onClick={saveBuilderDraft}
          className="flex items-center gap-2 px-4 py-2 bg-endecja-paper text-endecja-base rounded hover:bg-endecja-gold hover:text-endecja-base transition-all font-bold text-sm"
          title="Save Draft"
        >
          <Save size={18} />
          Save Draft
        </button>
        
        <button 
          onClick={loadBuilderDraft}
          className="flex items-center gap-2 px-4 py-2 bg-endecja-paper text-endecja-base rounded hover:bg-endecja-gold hover:text-endecja-base transition-all font-bold text-sm"
          title="Load Draft"
        >
          <Upload size={18} />
          Load Draft
        </button>
      </div>
    </div>
  );
};
