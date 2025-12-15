import React from 'react';
import { NodeType } from '../types';
import { X, HelpCircle } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  [NodeType.PERSON]: '#2c241b',
  [NodeType.ORGANIZATION]: '#8b0000',
  [NodeType.CONCEPT]: '#1e3a5f',
  [NodeType.EVENT]: '#d4af37',
  [NodeType.PUBLICATION]: '#704214',
  [NodeType.MYTH]: '#7b2cbf',
  'Location': '#704214'
};

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
            <h4 className="font-bold text-xs mb-2 text-archival-sepia uppercase">Node Types</h4>
            <div className="grid grid-cols-2 gap-y-2">
                {Object.entries(TYPE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color }}></span>
                        <span className="capitalize text-xs text-archival-ink">{type}</span>
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