import React, { useState } from 'react';
import { useGraphStore } from '../state/graphStore';
import { GraphStats } from '../analysis/clientAnalysis'; // Retain for interface definition only
import { architectAnalysis, applyGraphOperations } from '../services/geminiService'; // Import new architectAnalysis
import { TrendingUp, ChevronDown, ChevronUp, Activity } from 'lucide-react';

export const StatsPanel: React.FC = () => {
  const { graph, setLoading, setFrustrationIndex, frustrationIndex } = useGraphStore();
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleAnalyze = async () => {
    setLoading(true, 'Architect is analyzing graph...');
    try {
      const result = await architectAnalysis(graph); // Call Architect for analysis
      applyGraphOperations(graph, result.operations); // Apply operations (e.g., betweenness, communities)
      setStats(result.metrics); // Set the metrics returned by Architect
      setFrustrationIndex(result.metrics.frustrationIndex); // Update global frustration index state
      setIsCollapsed(false);
    } catch (error: any) {
      console.error(error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`transition-all duration-300 ease-in-out bg-endecja-paper border-2 border-endecja-gold shadow-xl rounded-lg overflow-hidden text-endecja-ink ${isCollapsed ? 'w-auto' : 'w-64 max-h-[50vh]'}`}>
      
      {/* Header Button */}
      <div 
        className="flex items-center justify-between p-3 bg-endecja-paper text-endecja-base cursor-pointer hover:bg-endecja-gold/10 transition-colors gap-3" 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 font-serif font-bold text-sm uppercase tracking-wider">
           <Activity size={16} className="text-endecja-gold" />
           <span className={`${isCollapsed ? 'hidden' : 'inline'}`}>Network Stats</span>
        </div>
        
        {/* Run Analysis Button (Small) visible when collapsed if no stats */}
        {isCollapsed && !stats && (
           <button 
             onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
             className="text-[10px] bg-endecja-base text-endecja-gold px-2 py-1 rounded uppercase font-bold hover:bg-black"
           >
             Run Analysis
           </button>
        )}

        <button className="text-endecja-light">
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 overflow-y-auto max-h-[40vh] border-t border-endecja-gold/20">
          {!stats ? (
            <div className="text-center">
                <p className="text-xs text-endecja-light mb-3">Run topological analysis to see network metrics.</p>
                <button 
                onClick={handleAnalyze}
                className="w-full bg-endecja-base text-endecja-gold p-2 rounded font-bold hover:bg-black transition-colors text-xs uppercase tracking-widest"
                >
                Run Analysis
                </button>
            </div>
          ) : (
            <div className="space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/50 p-2 rounded text-center border border-endecja-gold/20">
                  <div className="text-xl font-bold text-endecja-base">{stats.nodeCount}</div>
                  <div className="text-xs text-endecja-light uppercase">Nodes</div>
                </div>
                <div className="bg-white/50 p-2 rounded text-center border border-endecja-gold/20">
                  <div className="text-xl font-bold text-endecja-base">{stats.edgeCount}</div>
                  <div className="text-xs text-endecja-light uppercase">Edges</div>
                </div>
              </div>

              <div className="bg-white/50 p-3 rounded border border-endecja-gold/20">
                <div className="text-xs text-endecja-light mb-1 uppercase">Network Density</div>
                <div className="text-xl font-bold text-endecja-base">{(stats.density * 100).toFixed(1)}%</div>
              </div>

              <div className="bg-white/50 p-3 rounded border border-endecja-gold/20">
                <div className="text-xs text-endecja-light mb-1 uppercase">Frustration Index</div>
                <div className="text-xl font-bold text-endecja-alert">{stats.frustrationIndex.toFixed(3)}</div>
              </div>

              <div className="bg-white/50 p-3 rounded border border-endecja-gold/20">
                <div className="text-xs font-bold mb-2 flex items-center gap-1 text-endecja-base uppercase">
                  <TrendingUp size={14} />
                  Key Influencers
                </div>
                <div className="space-y-1">
                  {stats.topInfluencers.slice(0, 5).map(node => (
                    <div key={node.id} className="flex justify-between text-xs border-b border-black/5 pb-1 last:border-0">
                      <span className="truncate w-32 font-bold">{node.label}</span>
                      <span className="text-endecja-gold font-mono">{node.score.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setStats(null)}
                className="w-full bg-transparent border border-endecja-base text-endecja-base p-2 rounded text-xs hover:bg-endecja-base hover:text-white uppercase font-bold"
              >
                Clear Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};