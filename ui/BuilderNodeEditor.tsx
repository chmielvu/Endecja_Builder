
import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../state/graphStore';
import { NodeType, Jurisdiction, NodeImage } from '../types';
import { ImageUploader } from './ImageUploader';
import { 
  X, Save, Trash2, Image as ImageIcon, Plus, Star, 
  ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';

export const BuilderNodeEditor: React.FC = () => {
  const { 
    graph, selectedNode, selectNode, 
    updateNodeAttribute, refresh 
  } = useGraphStore();
  
  const [localData, setLocalData] = useState<any>(null);
  const [showProvenance, setShowProvenance] = useState(false);
  const [showImages, setShowImages] = useState(true);

  useEffect(() => {
    if (selectedNode && graph.hasNode(selectedNode)) {
      const attrs = graph.getNodeAttributes(selectedNode);
      setLocalData({
        label: attrs.label || '',
        category: attrs.category || NodeType.PERSON,
        jurisdiction: attrs.jurisdiction || Jurisdiction.OTHER,
        startYear: attrs.valid_time?.start || 1890,
        endYear: attrs.valid_time?.end || 1945,
        descriptionHtml: attrs.descriptionHtml || attrs.description || '',
        images: attrs.images || [],
      });
    } else {
      setLocalData(null);
    }
  }, [selectedNode, graph]);

  if (!selectedNode || !localData) {
    return null;
  }

  const handleSave = () => {
    if (!selectedNode) return;
    
    updateNodeAttribute(selectedNode, 'label', localData.label);
    updateNodeAttribute(selectedNode, 'category', localData.category);
    updateNodeAttribute(selectedNode, 'jurisdiction', localData.jurisdiction);
    updateNodeAttribute(selectedNode, 'valid_time', {
      start: localData.startYear,
      end: localData.endYear,
    });
    updateNodeAttribute(selectedNode, 'descriptionHtml', localData.descriptionHtml);
    updateNodeAttribute(selectedNode, 'description', localData.descriptionHtml.replace(/<[^>]*>/g, ''));
    updateNodeAttribute(selectedNode, 'images', localData.images);
    refresh();
  };

  const handleDelete = () => {
    if (confirm(`Delete "${localData.label}"? This cannot be undone.`)) {
      graph.dropNode(selectedNode);
      selectNode(null);
      refresh();
    }
  };

  const handleAddImage = (image: NodeImage) => {
    const updated = [...localData.images, image];
    setLocalData({ ...localData, images: updated });
  };

  const handleSetPrimaryImage = (index: number) => {
    const updated = localData.images.map((img: NodeImage, i: number) => ({
      ...img,
      isPrimary: i === index,
    }));
    setLocalData({ ...localData, images: updated });
  };

  const handleRemoveImage = (index: number) => {
    const updated = localData.images.filter((_: NodeImage, i: number) => i !== index);
    setLocalData({ ...localData, images: updated });
  };

  const handleAddProvenanceRow = () => {
    const attrs = graph.getNodeAttributes(selectedNode);
    const newProv = {
      source: 'New Source',
      confidence: 0.8,
      method: 'archival' as const,
      sourceClassification: 'primary' as const,
      timestamp: Date.now(),
    };
    updateNodeAttribute(selectedNode, 'provenance', [...(attrs.provenance || []), newProv]);
  };

  const nodeAttrs = graph.getNodeAttributes(selectedNode);
  const primaryImage = localData.images.find((img: NodeImage) => img.isPrimary);

  return (
    <div className="h-full bg-endecja-paper border-l border-endecja-gold flex flex-col overflow-hidden w-96 shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-endecja-base to-endecja-light p-4 border-b-2 border-endecja-gold flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: nodeAttrs.color || '#3d5c45' }} 
          ></div>
          <h3 className="font-bold text-endecja-gold text-sm uppercase tracking-wider">
            Node Editor
          </h3>
        </div>
        <button 
          onClick={() => selectNode(null)}
          className="text-endecja-gold hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-endecja-ink">
        
        {/* Primary Image Preview */}
        {primaryImage && (
          <div className="relative rounded-lg overflow-hidden border-2 border-endecja-gold shadow-md">
            <img 
              src={primaryImage.dataUrl} 
              alt={primaryImage.alt || localData.label}
              className="w-full h-48 object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="text-white text-xs font-bold flex items-center gap-1">
                <Star size={12} fill="currentColor" />
                Primary Image
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-endecja-gold uppercase mb-1">
            Title
          </label>
          <input
            type="text"
            value={localData.label}
            onChange={(e) => setLocalData({ ...localData, label: e.target.value })}
            className="w-full p-3 border-2 border-endecja-gold/30 rounded-lg bg-white text-endecja-ink text-lg font-bold focus:border-endecja-gold outline-none transition-colors"
            placeholder="e.g., Roman Dmowski"
          />
        </div>

        {/* Type & Jurisdiction */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-endecja-gold uppercase mb-1">
              Node Type
            </label>
            <select
              value={localData.category}
              onChange={(e) => setLocalData({ ...localData, category: e.target.value as NodeType })}
              className="w-full p-2 border-2 border-endecja-gold/30 rounded bg-white text-endecja-ink focus:border-endecja-gold outline-none text-sm"
            >
              {Object.values(NodeType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-endecja-gold uppercase mb-1">
              Jurisdiction
            </label>
            <select
              value={localData.jurisdiction}
              onChange={(e) => setLocalData({ ...localData, jurisdiction: e.target.value as Jurisdiction })}
              className="w-full p-2 border-2 border-endecja-gold/30 rounded bg-white text-endecja-ink focus:border-endecja-gold outline-none text-sm"
            >
              {Object.values(Jurisdiction).map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
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

        {/* Rich Text Description */}
        <div>
          <label className="block text-xs font-bold text-endecja-gold uppercase mb-1">
            Description
          </label>
          <div className="border-2 border-endecja-gold/30 rounded-lg bg-white p-2">
            <textarea
              value={localData.descriptionHtml}
              onChange={(e) => setLocalData({ ...localData, descriptionHtml: e.target.value })}
              className="w-full p-2 min-h-[120px] text-sm text-endecja-ink outline-none resize-none"
              placeholder="Detailed historical description with context, dates, and significance..."
            />
            <div className="flex gap-2 pt-2 border-t border-endecja-gold/20">
              <button className="px-2 py-1 text-xs bg-endecja-base text-endecja-gold rounded hover:bg-endecja-light">
                <strong>B</strong>
              </button>
              <button className="px-2 py-1 text-xs bg-endecja-base text-endecja-gold rounded hover:bg-endecja-light">
                <em>I</em>
              </button>
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div>
          <button 
            onClick={() => setShowImages(!showImages)}
            className="w-full flex items-center justify-between p-2 bg-endecja-base/10 rounded text-endecja-base hover:bg-endecja-base/20 transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <ImageIcon size={16} />
              Images ({localData.images.length})
            </div>
            {showImages ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showImages && (
            <div className="mt-2 space-y-2">
              <ImageUploader onImageAdded={handleAddImage} />
              
              {localData.images.length > 0 && (
                <div className="space-y-2">
                  {localData.images.map((img: NodeImage, idx: number) => (
                    <div key={idx} className="border border-endecja-gold/20 rounded p-2 bg-white">
                      <div className="flex gap-2">
                        <img 
                          src={img.dataUrl} 
                          alt={img.alt || `Image ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1 text-xs space-y-1">
                          <input
                            type="text"
                            value={img.caption || ''}
                            onChange={(e) => {
                              const updated = [...localData.images];
                              updated[idx] = { ...updated[idx], caption: e.target.value };
                              setLocalData({ ...localData, images: updated });
                            }}
                            placeholder="Caption"
                            className="w-full p-1 border border-gray-300 rounded"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleSetPrimaryImage(idx)}
                            className={`p-1 rounded ${img.isPrimary ? 'bg-endecja-gold text-white' : 'bg-gray-200'}`}
                            title="Set as primary"
                          >
                            <Star size={14} fill={img.isPrimary ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Provenance Section */}
        <div>
          <button 
            onClick={() => setShowProvenance(!showProvenance)}
            className="w-full flex items-center justify-between p-2 bg-endecja-base/10 rounded text-endecja-base hover:bg-endecja-base/20 transition-colors"
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              Sources & Provenance ({(nodeAttrs.provenance || []).length})
            </div>
            {showProvenance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showProvenance && (
            <div className="mt-2 space-y-2">
              {(nodeAttrs.provenance || []).map((prov: any, idx: number) => (
                <div key={idx} className="border border-endecja-gold/20 rounded p-2 bg-white text-xs">
                  <div className="font-bold">{prov.source}</div>
                  <div className="text-gray-600">
                    Confidence: {(prov.confidence * 100).toFixed(0)}% | 
                    {prov.sourceClassification}
                  </div>
                </div>
              ))}
              <button 
                onClick={handleAddProvenanceRow}
                className="w-full flex items-center justify-center gap-1 p-2 border-2 border-dashed border-endecja-gold/30 rounded text-endecja-gold hover:bg-endecja-gold/10 transition-colors text-sm"
              >
                <Plus size={14} />
                Add Source
              </button>
            </div>
          )}
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
          title="Delete Node"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
