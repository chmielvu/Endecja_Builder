import React from 'react';
import { Provenance } from '../types';
import { ShieldCheck, BrainCircuit, History, BookOpen, Ban } from 'lucide-react';

interface Props {
  provenance: Provenance;
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance }) => {
  const { method, confidence, source, sourceClassification } = provenance;

  const getIcon = () => {
    switch (sourceClassification) {
      case 'primary': return <History className="w-4 h-4 text-green-800" />;
      case 'secondary': return <BookOpen className="w-4 h-4 text-blue-800" />;
      case 'hostile': return <Ban className="w-4 h-4 text-red-800" />;
      case 'myth': return <ShieldCheck className="w-4 h-4 text-purple-800" />;
      case 'ai_inference': return <BrainCircuit className="w-4 h-4 text-indigo-800" />;
      default: return <ShieldCheck className="w-4 h-4 text-gray-800" />;
    }
  };

  const getBadgeStyle = (classification: Provenance['sourceClassification']) => {
    switch (classification) {
      case 'primary': return 'bg-green-100 text-green-800 border-green-200';
      case 'secondary': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hostile': return 'bg-red-100 text-red-800 border-red-200';
      case 'myth': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ai_inference': return 'bg-indigo-100 text-indigo-800 border-indigo-200 border-dashed';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`flex items-center gap-2 p-2 border rounded-md text-xs font-serif ${getBadgeStyle(sourceClassification)}`}>
      {getIcon()}
      <div className="flex flex-col">
        <span className="font-bold uppercase tracking-widest text-[0.6rem]">{sourceClassification.replace('_', ' ')}</span>
        <span>{source}</span>
      </div>
      <div className={`ml-auto px-1.5 py-0.5 rounded border border-opacity-50 ${getBadgeStyle(sourceClassification)}`}>
        {Math.round(confidence * 100)}%
      </div>
    </div>
  );
};