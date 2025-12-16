
import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../state/graphStore';
import { X, Save, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const BuilderEdgeEditor: React.FC = () => {
  const { 
    graph, selectedEdge, selectEdge, 
    updateEdgeAttribute, refresh 
  } = useGraphStore();
  
  const [localData, setLocalData] = useState<any>(null);

  useEffect(() => {
    if (selectedEdge && graph.hasEdge(selectedEdge)) {
      const attrs = graph.getEdgeAttributes(selectedEdge);
      const source = graph.source(selectedEdge);
      const target = graph.target(selectedEdge);
      
      setLocalData({
        relationshipType: attrs.relationshipType || '',
        sign: attrs.sign || 1,
        descriptionText: attrs.descriptionText || '',
        startYear: attrs.valid_time?.start || 1890,
        endYear: attrs.valid_time?.end || 1945,
        sourceLabel: graph.getNodeAttribute(source, 'label'),
        targetLabel: graph.getNodeAttribute(target, 'label'),
      });
    } else {
      setLocalData(null);
    }
  }, [selectedEdge, graph]);

  if (!selectedEdge || !localData) {
    return null;
  }

  const handleSave = () => {
    if (!selectedEdge) return;
    
    updateEdgeAttribute(selectedEdge, 'relationshipType', localData.relationshipType);
    updateEdgeAttribute(selectedEdge, 'sign', localData.sign);
    updateEdgeAttribute(selectedEdge, 'descriptionText', localData.descriptionText);
    updateEdgeAttribute(selectedEdge, 'valid_time', {
      start: localData.startYear,
      end: localData.endYear,
    });
    // Update color based on sign
    const color = localData.sign === -1 ? '#991b1b' : localData.sign === 1 ? '#3d5c45' : '#9ca3af';
    updateEdgeAttribute(selectedEdge, 'color', color);
    refresh();
  };

  const handleDelete = () => {
    if (confirm('Delete this relationship? This cannot be undone.')) {
      graph.dropEdge(selectedEdge);
      selectEdge(null);
      refresh();
    }
  };

  const getSignIcon = (sign: number) => {
    if (sign === 1) return <TrendingUp size={20} className="text-green-600" />;
    if (sign === -1) return <TrendingDown size={20} className="text-red-600" />;
    return <Minus size={20} className="text-gray-600" />;
  };

  const getSignLabel = (sign: number) => {
    if (sign === 1) return 'Positive (Alliance/Support)';
    if (sign === -1) return 'Negative (Opposition/Conflict)';
    return 'Neutral/Ambivalent';
  };

  return (
    <div className="h-full bg-endecja-paper border-l border-endecja-gold flex flex-col overflow-hidden w-96 shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-endecja-base to-endecja-light p-4 border-b-2 border-endecja-gold flex justify-between items-center flex-shrink-0">
        <h3 className="font-bold text-endecja-gold text-sm uppercase tracking-wider">
          Edge Editor
        </h3>
        <button 
          onClick={() => selectEdge(null)}
          className="text-endecja-gold hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 overflow-y-auto font-sans text-endecja-ink flex-1">
        
        {/* Connection Display */}
        <div className="bg-white border border-endecja-gold/20 rounded p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-endecja-ink">{localData.sourceLabel}</span>
            <span className="text-endecja-gold">→</span>
            <span className="font-bold text-endecja-ink">{localData.targetLabel}</span>
          </div>
        </div>

        {/* Relationship Type */}
        <div>
          <label className="block text-xs font-bold text-endecja-gold uppercase mb-1">
            Relationship Type
          </label>
          <input
            type="text"
            value={localData.relationshipType}
            onChange={(e) => setLocalData({ ...localData, relationshipType: e.target.value })}
            className="w-full p-2 border-2 border-endecja-gold/30 rounded bg-white text-endecja-ink focus:border-endecja-gold outline-none"
            placeholder="e.g., founded, opposed, collaborated_with"
          />
          <div className="text-xs text-endecja-light mt-1">
            Use descriptive verbs for clarity
          </div>
        </div>

        {/* Sign (Polarity) */}
        <div>
          <label className="block text-xs font-bold text-endecja-gold uppercase mb-2">
            Relationship Polarity
          </label>
          <div className="space-y-2">
            {[1, 0, -1].map((sign) => (
              <label 
                key={sign}
                className={`
                  flex items-center gap-3 p-3 border-2 rounded cursor-pointer transition-all
                  ${localData.sign === sign 
                    ? 'border-endecja-gold bg-endecja-gold/10' 
                    : 'border-endecja-gold/20 bg-white hover:border-endecja-gold/50'
                  }
                `}
              >
                <input 
                  type="radio" 
                  name="sign" 
                  value={sign} 
                  checked={localData.sign === sign}
                  onChange={() => setLocalData({ ...localData, sign })}
                  className="accent-endecja-gold"
                />
                <div className="flex items-center gap-2 flex-1">
                  {getSignIcon(sign)}
                  <span className="text-sm font-semibold text-endecja-ink">
                    {getSignLabel(sign)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-endecja-gold uppercase mb-1">
            Description
          </label>
          <textarea
            value={localData.descriptionText}
            onChange={(e) => setLocalData({ ...localData, descriptionText: e.target.value })}
            className="w-full p-2 border-2 border-endecja-gold/30 rounded bg-white text-endecja-ink text-sm focus:border-endecja-gold outline-none resize-none"
            rows={3}
            placeholder="Brief description of this relationship and its significance..."
          />
        </div>

        {/* Timeline */}
        <div>
          <label className="block text-xs font-bold text-endecja-gold uppercase mb-2">
            Timeline (Active Period)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                value={localData.startYear}
                onChange={(e) => setLocalData({ ...localData, startYear: parseInt(e.target.value) })}
                min="1890"
                max="1945"
                className="w-full p-2 border-2 border-endecja-gold/30 rounded bg-white text-endecja-ink focus:border-endecja-gold outline-none text-sm"
              />
              <div className="text-xs text-endecja-light mt-1">Start Year</div>
            </div>
            <div>
              <input
                type="number"
                value={localData.endYear}
                onChange={(e) => setLocalData({ ...localData, endYear: parseInt(e.target.value) })}
                min="1890"
                max="1945"
                className="w-full p-2 border-2 border-endecja-gold/30 rounded bg-white text-endecja-ink focus:border-endecja-gold outline-none text-sm"
              />
              <div className="text-xs text-endecja-light mt-1">End Year</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t-2 border-endecja-gold bg-endecja-base/5 flex gap-2 flex-shrink-0">
        <button 
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 bg-endecja-gold text-endecja-base p-3 rounded font-bold hover:bg-yellow-500 transition-colors shadow-md"
        >
          <Save size={18} />
          Save Changes
        </button>
        <button 
          onClick={handleDelete}
          className="px-4 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
          title="Delete Edge"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
