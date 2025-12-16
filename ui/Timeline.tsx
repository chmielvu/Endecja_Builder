import React from 'react';
import { useGraphStore } from '../state/graphStore';

export const Timeline: React.FC = () => {
  const { timeFilter, setTimeFilter } = useGraphStore();

  return (
    <div className="w-full bg-endecja-base/90 border border-endecja-gold p-4 rounded-lg shadow-2xl backdrop-blur-sm text-endecja-paper">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <span className="font-serif font-bold text-endecja-gold text-sm">1893</span>
          <span className="font-serif font-bold text-white text-3xl drop-shadow-md">{timeFilter}</span>
          <span className="font-serif font-bold text-endecja-gold text-sm">1939</span>
        </div>
        <input 
          type="range" 
          min="1893" 
          max="1939" 
          value={timeFilter} 
          onChange={(e) => setTimeFilter(parseInt(e.target.value))}
          className="w-full h-2 bg-endecja-paper/20 rounded-lg appearance-none cursor-pointer accent-endecja-gold"
        />
        <div className="text-center text-[10px] text-endecja-gold/70 uppercase tracking-widest">
          Temporal Filter
        </div>
      </div>
    </div>
  );
};