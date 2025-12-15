import React from 'react';
import { useGraphStore } from '../state/graphStore';

export const Timeline: React.FC = () => {
  const { timeFilter, setTimeFilter } = useGraphStore();

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-2/3 max-w-2xl bg-archival-paper/90 border border-archival-sepia p-4 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end">
          <span className="font-serif font-bold text-archival-sepia text-sm">1893</span>
          <span className="font-serif font-bold text-archival-ink text-2xl">{timeFilter}</span>
          <span className="font-serif font-bold text-archival-sepia text-sm">1939</span>
        </div>
        <input 
          type="range" 
          min="1893" 
          max="1939" 
          value={timeFilter} 
          onChange={(e) => setTimeFilter(parseInt(e.target.value))}
          className="w-full h-2 bg-archival-sepia/20 rounded-lg appearance-none cursor-pointer accent-archival-accent"
        />
        <div className="text-center text-xs text-archival-sepia italic">
          Drag to filter graph connectivity by year
        </div>
      </div>
    </div>
  );
};