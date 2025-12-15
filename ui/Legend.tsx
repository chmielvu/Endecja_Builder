import React from 'react';
import { NodeType } from '../types';
import { X, HelpCircle } from 'lucide-react';

const NODE_GLYPH_STYLES: Record<NodeType, { color: string; border: string; borderStyle?: string; label: string }> = {
  [NodeType.PERSON]: { color: '#2c241b', border: 'transparent', label: 'Person' },
  [NodeType.ORGANIZATION]: { color: '#8b0000', border: '#1e3a5f', label: 'Organization' },
  [NodeType.CONCEPT]: { color: '#1e3a5f', border: 'transparent', label: 'Concept' },
  [NodeType.EVENT]: { color: '#d4af37', border: 'transparent', label: 'Event' },
  [NodeType.PUBLICATION]: { color: '#704214', border: 'transparent', label: 'Publication' },
  [NodeType.MYTH]: { color: '#7b2cbf', border: '#7b2cbf', label: 'Myth (Distinct)' },
  [NodeType.LOCATION]: { color: '#704214', border: 'transparent', label: 'Location' }, // Default location color
};

const PROVENANCE_CLASSIFICATIONS = [
    { type: 'primary', label: 'Primary Source', color: 'bg-green-100 text-green-800 border-green-200' },
    { type: 'secondary', label: 'Secondary Source', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { type: 'hostile', label: 'Hostile Source', color: 'bg-red-100 text-red-800 border-red-200' },
    { type: 'myth', label: 'Myth (Demythified)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { type: 'ai_inference', label: 'AI Inference', color: 'bg-indigo-100 text-indigo-800 border-indigo-200 border-dashed' },
];

export const Legend: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed right-4 bottom-24 w-64 bg-archival-paper border-2 border-archival-sepia p-4 rounded-lg shadow-xl font-serif z-50 text-sm">
      <div className="flex justify-between items-center mb-3 border-b border-archival-sepia/20 pb-2">
         <h3 className="font-bold text-archival-ink flex items-center gap-2">
            <HelpCircle size={16} /> Graph Legend
         </h3>
         <button onClick={onClose} className="hover:text-archival-accent"><X size={16} /></button>
      </div>
      <div className="space-y-3">
        <div>
            <h4 className="font-bold text-xs mb-2 text-archival-sepia uppercase">Node Types & Glyphs</h4>
            <div className="grid grid-cols-2 gap-y-2">
                {Object.entries(NODE_GLYPH_STYLES).map(([type, style]) => (
                    <div key={type} className="flex items-center gap-2">
                        <span 
                            className="w-3 h-3 rounded-full shadow-sm" 
                            style={{ 
                                backgroundColor: style.color, 
                                border: `${style.borderStyle || 'solid'} 1px ${style.border}` 
                            }}
                        ></span>
                        <span className="capitalize text-xs text-archival-ink">{style.label}</span>
                    </div>
                ))}
            </div>
        </div>
        <div className="pt-2 border-t border-archival-sepia/20">
            <h4 className="font-bold text-xs mb-2 text-archival-sepia uppercase">Provenance Classification</h4>
            <div className="space-y-1">
                {PROVENANCE_CLASSIFICATIONS.map((classification) => (
                    <div key={classification.type} className={`flex items-center gap-2 px-1 py-0.5 rounded-md text-[0.6rem] ${classification.color}`}>
                        <span className="font-bold">{classification.label}</span>
                    </div>
                ))}
            </div>
        </div>
         <div className="pt-2 border-t border-archival-sepia/20">
            <h4 className="font-bold text-xs mb-2 text-archival-sepia uppercase">Relations</h4>
             <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="w-8 h-0.5 bg-[#2c241b]"></span>
                    <span className="text-xs">Alliance / Positive</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-8 h-0.5 bg-[#dc143c]"></span>
                    <span className="text-xs">Conflict / Negative</span>
                </div>
                 <div className="flex items-center gap-2">
                    <span className="w-8 h-0.5 border-t-2 border-dashed border-gray-400"></span>
                    <span className="text-xs">Hypothetical / AI</span>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};