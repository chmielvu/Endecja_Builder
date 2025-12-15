import React, { useState } from 'react';
import { useGraphStore } from '../state/graphStore';
import { analyzeGraph, GraphStats } from '../analysis/clientAnalysis';
import { BarChart3, TrendingUp } from 'lucide-react';

export const StatsPanel: React.FC = () => {
  const { graph, setLoading } = useGraphStore();
  const [stats, setStats] = useState<GraphStats | null>(null);

  const handleAnalyze = async () => {
    setLoading(true, 'Analyzing graph...');
    try {
      const result = await analyzeGraph(graph);
      setStats(result);
    } catch (error: any) {
      console.error(error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed left-4 top-80 w-64 bg-archival-paper border-2 border-archival-sepia p-4 rounded-lg shadow-xl max-h-[40vh] overflow-y-auto">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-archival-navy">
        <BarChart3 size={20} />
        Network Stats
      </h3>

      {!stats ? (
        <button 
          onClick={handleAnalyze}
          className="w-full bg-archival-navy text-white p-3 rounded font-bold hover:bg-opacity-90 transition-colors"
        >
          Run Analysis
        </button>
      ) : (
        <div className="space-y-3 font-sans">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2 rounded text-center border border-archival-sepia/10">
              <div className="text-xl font-bold text-archival-accent">{stats.nodeCount}</div>
              <div className="text-xs text-archival-sepia">Nodes</div>
            </div>
            <div className="bg-white p-2 rounded text-center border border-archival-sepia/10">
              <div className="text-xl font-bold text-archival-accent">{stats.edgeCount}</div>
              <div className="text-xs text-archival-sepia">Edges</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-archival-sepia/10">
            <div className="text-xs text-archival-sepia mb-1">Network Density</div>
            <div className="text-xl font-bold">{(stats.density * 100).toFixed(1)}%</div>
          </div>

          <div className="bg-white p-3 rounded border border-archival-sepia/10">
            <div className="text-xs text-archival-sepia mb-1">Frustration Index</div>
            <div className="text-xl font-bold">{stats.frustrationIndex.toFixed(3)}</div>
          </div>

          <div className="bg-white p-3 rounded border border-archival-sepia/10">
            <div className="text-xs font-bold mb-2 flex items-center gap-1 text-archival-ink">
              <TrendingUp size={14} />
              Top Influencers
            </div>
            <div className="space-y-1">
              {stats.topInfluencers.slice(0, 5).map(node => (
                <div key={node.id} className="flex justify-between text-xs">
                  <span className="truncate w-32">{node.label}</span>
                  <span className="text-archival-sepia">{node.score.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setStats(null)}
            className="w-full bg-white border border-archival-sepia text-archival-ink p-2 rounded text-sm hover:bg-archival-faint"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};