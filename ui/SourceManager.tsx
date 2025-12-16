import React, { useMemo } from 'react';
import { useGraphStore } from '../state/graphStore';
import { Provenance } from '../types';
import { X, Library } from 'lucide-react';

interface AggregatedSource {
  name: string;
  count: number;
  classifications: Set<Provenance['sourceClassification']>;
  methods: Set<Provenance['method']>;
}

export const SourceManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { graph } = useGraphStore();

  const aggregatedSources = useMemo(() => {
    const sourceMap = new Map<string, AggregatedSource>();

    const processProvenance = (prov: Provenance) => {
      if (!sourceMap.has(prov.source)) {
        sourceMap.set(prov.source, {
          name: prov.source,
          count: 0,
          classifications: new Set(),
          methods: new Set(),
        });
      }
      const entry = sourceMap.get(prov.source)!;
      entry.count++;
      entry.classifications.add(prov.sourceClassification);
      entry.methods.add(prov.method);
    };

    graph.forEachNode((_, attrs) => {
      attrs.provenance.forEach(processProvenance);
    });
    graph.forEachEdge((_, attrs) => {
      attrs.provenance.forEach(processProvenance);
    });

    return Array.from(sourceMap.values()).sort((a, b) => b.count - a.count);
  }, [graph]);

  return (
    <div className="fixed inset-0 bg-endecja-base/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-endecja-paper border-2 border-endecja-gold p-6 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col text-endecja-ink font-serif">
        <div className="flex justify-between items-center mb-4 border-b border-endecja-gold/20 pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Library className="text-endecja-gold" />
            Source Library ({aggregatedSources.length} unique)
          </h2>
          <button onClick={onClose} className="hover:text-endecja-gold"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-2">
            {aggregatedSources.length === 0 ? (
              <div className="text-center text-gray-500 italic py-10">No sources found in the graph's provenance data.</div>
            ) : (
              aggregatedSources.map(source => (
                <div key={source.name} className="bg-white p-3 rounded border border-endecja-gold/10 flex items-start gap-4">
                  <div className="flex-shrink-0 bg-endecja-ink text-endecja-gold rounded h-8 w-8 flex items-center justify-center font-bold text-lg">
                    {source.count}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-endecja-ink">{source.name}</div>
                    <div className="text-xs text-gray-600 flex flex-wrap gap-x-2">
                        <span>Classifications: <span className="font-semibold">{Array.from(source.classifications).join(', ')}</span></span>
                        <span>|</span>
                        <span>Methods: <span className="font-semibold">{Array.from(source.methods).join(', ')}</span></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-endecja-gold/20 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-endecja-base text-endecja-gold rounded text-sm hover:bg-endecja-light"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
