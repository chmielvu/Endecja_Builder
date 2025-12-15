import React from 'react';
import { Provenance } from '../types';
import { ShieldCheck, BrainCircuit, History } from 'lucide-react';

interface Props {
  provenance: Provenance;
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance }) => {
  const { method, confidence, source } = provenance;

  const getIcon = () => {
    switch (method) {
      case 'archival': return <History className="w-4 h-4 text-archival-ink" />;
      case 'inference': return <BrainCircuit className="w-4 h-4 text-purple-600" />;
      default: return <ShieldCheck className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf > 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (conf > 0.5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className={`flex items-center gap-2 p-2 border rounded-md text-xs font-serif ${method === 'inference' ? 'border-dashed border-purple-300 bg-purple-50' : 'bg-archival-faint border-archival-sepia/20'}`}>
      {getIcon()}
      <div className="flex flex-col">
        <span className="font-bold uppercase tracking-widest text-[0.6rem]">{method}</span>
        <span>{source}</span>
      </div>
      <div className={`ml-auto px-1.5 py-0.5 rounded border ${getConfidenceColor(confidence)}`}>
        {Math.round(confidence * 100)}%
      </div>
    </div>
  );
};