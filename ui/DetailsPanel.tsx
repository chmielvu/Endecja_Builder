import React from 'react';
import { useGraphStore } from '../state/graphStore';
import { ProvenanceBadge } from './ProvenanceBadge';
import { X } from 'lucide-react';

// Basic Markdown renderer (no external libs)
function renderMarkdownToHtml(markdown: string): string {
  let html = markdown;
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Links: [link text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-endecja-ink hover:underline">$1</a>');
  // Newlines to <br/>
  html = html.replace(/\n/g, '<br/>');
  return html;
}

export const DetailsPanel: React.FC = () => {
  const { graph, selectedNode, selectNode } = useGraphStore();

  if (!selectedNode) return null;

  const attrs = graph.getNodeAttributes(selectedNode);

  return (
    <div className="absolute right-4 top-4 w-80 bg-endecja-paper border-2 border-endecja-gold shadow-xl rounded-sm font-serif max-h-[90vh] overflow-y-auto z-20">
      <div className="p-4 border-b border-endecja-gold/20 flex justify-between items-start bg-endecja-ink/5">
        <div>
          <h2 className="text-xl font-bold text-endecja-ink leading-tight">{attrs.label}</h2>
          <span className="text-sm italic text-endecja-gold">{attrs.category} | {attrs.jurisdiction}</span>
        </div>
        <button onClick={() => selectNode(null)} className="text-endecja-gold hover:text-endecja-gold">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Description with Markdown support */}
        {attrs.description && (
          <div 
            className="text-sm italic text-endecja-ink/80 border-l-2 border-endecja-gold pl-2"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(attrs.description) }}
          />
        )}

        {/* Valid Time */}
        <div className="text-sm">
          <span className="font-bold">Active Period: </span>
          {attrs.valid_time.start} - {attrs.valid_time.end}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-white/50 border border-endecja-gold/10 rounded">
            <div className="text-xs text-gray-500 uppercase">Degree</div>
            <div className="font-bold text-lg">{graph.degree(selectedNode)}</div>
          </div>
          <div className="p-2 bg-white/50 border border-endecja-gold/10 rounded">
            <div className="text-xs text-gray-500 uppercase">Secrecy</div>
            <div className="font-bold text-lg">Lvl {attrs.secrecy_level}</div>
          </div>
        </div>

        {/* Provenance */}
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase text-endecja-gold">Provenance</h3>
          {attrs.provenance && attrs.provenance.length > 0 ? (
            attrs.provenance.map((p, i) => <ProvenanceBadge key={i} provenance={p} />)
          ) : (
            <div className="text-xs italic text-gray-500">No provenance information available.</div>
          )}
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
