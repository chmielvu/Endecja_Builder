import React from 'react';
import { useGraphStore } from '../state/graphStore';
import { ProvenanceBadge } from './ProvenanceBadge';
import { X } from 'lucide-react';

export const DetailsPanel: React.FC = () => {
  const { graph, selectedNode, selectNode } = useGraphStore();

  if (!selectedNode) return null;

  const attrs = graph.getNodeAttributes(selectedNode);

  return (
    <div className="absolute right-4 top-4 w-80 bg-archival-paper border-2 border-archival-sepia shadow-xl rounded-sm font-serif max-h-[90vh] overflow-y-auto z-20">
      <div className="p-4 border-b border-archival-sepia/20 flex justify-between items-start bg-archival-ink/5">
        <div>
          <h2 className="text-xl font-bold text-archival-ink leading-tight">{attrs.label}</h2>
          <span className="text-sm italic text-archival-sepia">{attrs.type} | {attrs.jurisdiction}</span>
        </div>
        <button onClick={() => selectNode(null)} className="text-archival-sepia hover:text-archival-accent">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Description */}
        {attrs.description && (
          <div className="text-sm italic text-archival-ink/80 border-l-2 border-archival-accent pl-2">
            {attrs.description}
          </div>
        )}

        {/* Valid Time */}
        <div className="text-sm">
          <span className="font-bold">Active Period: </span>
          {attrs.valid_time.start} - {attrs.valid_time.end}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-white/50 border border-archival-sepia/10 rounded">
            <div className="text-xs text-gray-500 uppercase">Degree</div>
            <div className="font-bold text-lg">{graph.degree(selectedNode)}</div>
          </div>
          <div className="p-2 bg-white/50 border border-archival-sepia/10 rounded">
            <div className="text-xs text-gray-500 uppercase">Secrecy</div>
            <div className="font-bold text-lg">Lvl {attrs.secrecy_level}</div>
          </div>
        </div>

        {/* Provenance */}
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase text-archival-sepia">Provenance</h3>
          <ProvenanceBadge provenance={attrs.provenance} />
        </div>

        {/* Embeddings / Vector Info */}
        {attrs.radicalization_vector && (
           <div className="p-2 bg-gray-100 rounded text-xs break-all border border-gray-300">
             <div className="font-bold mb-1">Vector Embedding (snippet)</div>
             [{attrs.radicalization_vector.slice(0, 5).join(', ')}...]
           </div>
        )}
      </div>
    </div>
  );
};