import React from 'react';
import { useGraphStore } from '../state/graphStore';
import { ZoomIn, ZoomOut, Maximize, Play, Pause } from 'lucide-react';

export const GraphControls: React.FC = () => {
  const { triggerCamera, isLoading, setLoading, refresh } = useGraphStore();

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
      {/* Camera Controls */}
      <div className="bg-endecja-paper border-2 border-endecja-gold rounded-lg shadow-xl overflow-hidden flex flex-col">
        <button 
            onClick={() => triggerCamera('in')}
            className="p-3 hover:bg-endecja-gold hover:text-endecja-base text-endecja-ink transition-colors border-b border-endecja-gold/20"
            title="Zoom In"
        >
            <ZoomIn size={20} />
        </button>
        <button 
            onClick={() => triggerCamera('fit')}
            className="p-3 hover:bg-endecja-gold hover:text-endecja-base text-endecja-ink transition-colors border-b border-endecja-gold/20"
            title="Fit to Screen"
        >
            <Maximize size={20} />
        </button>
        <button 
            onClick={() => triggerCamera('out')}
            className="p-3 hover:bg-endecja-gold hover:text-endecja-base text-endecja-ink transition-colors"
            title="Zoom Out"
        >
            <ZoomOut size={20} />
        </button>
      </div>
    </div>
  );
};