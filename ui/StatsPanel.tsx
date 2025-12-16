import React, { useState } from 'react';
import { useGraphStore } from '../state/graphStore';
import { GraphStats } from '../analysis/clientAnalysis';
import { architectAnalysis, applyGraphOperations } from '../services/geminiService';
import { getLoadingMessage } from '../config/mlConfig';
import { 
  TrendingUp, ChevronDown, ChevronUp, Activity, 
  AlertTriangle, CheckCircle, Info, Network, Users, Sparkles
} from 'lucide-react';

interface EnhancedStats extends GraphStats {
  structuralFindings?: string[];
  balancedTriangles?: number;
  unbalancedTriangles?: number;
  totalTriangles?: number;
}

interface AnalysisResult {
  stats: EnhancedStats;
  interpretation: string;
  methodology: string;
}

export const StatsPanel: React.FC = () => {
  const { graph, setLoading, setFrustrationIndex, refresh } = useGraphStore();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showInterpretation, setShowInterpretation] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    
    // Multi-stage loading feedback
    const stages = ['initializing', 'computing', 'analyzing', 'interpreting', 'finalizing'];
    let currentStage = 0;
    
    const loadingInterval = setInterval(() => {
      if (currentStage < stages.length) {
        setLoading(true, getLoadingMessage('architect', stages[currentStage]));
        currentStage++;
      }
    }, 3000);

    try {
      const analysisResult = await architectAnalysis(graph);
      
      clearInterval(loadingInterval);
      applyGraphOperations(graph, analysisResult.operations);
      
      setResult({
        stats: analysisResult.metrics as EnhancedStats,
        interpretation: analysisResult.historicalInterpretation,
        methodology: analysisResult.methodologicalNotes,
      });
      
      setFrustrationIndex(analysisResult.metrics.frustrationIndex);
      setIsCollapsed(false);
      refresh();
      
    } catch (error: any) {
      clearInterval(loadingInterval);
      console.error(error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const getFrustrationStatus = (fi: number): {
    label: string;
    color: string;
    icon: React.ReactNode;
  } => {
    if (fi < 0.1) {
      return {
        label: 'Stable Alliance Structure',
        color: 'text-green-700 bg-green-50 border-green-200',
        icon: <CheckCircle size={16} className="text-green-700" />
      };
    } else if (fi < 0.3) {
      return {
        label: 'Moderate Tensions',
        color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
        icon: <Info size={16} className="text-yellow-700" />
      };
    } else {
      return {
        label: 'High Structural Instability',
        color: 'text-red-700 bg-red-50 border-red-200',
        icon: <AlertTriangle size={16} className="text-red-700" />
      };
    }
  };

  return (
    <div className={`transition-all duration-300 ease-in-out bg-endecja-paper border-2 border-endecja-gold shadow-xl rounded-lg overflow-hidden text-endecja-ink ${isCollapsed ? 'w-auto' : 'w-80 max-h-[60vh]'}`}>
      
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-endecja-paper text-endecja-base cursor-pointer hover:bg-endecja-gold/10 transition-colors gap-3" 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 font-serif font-bold text-sm uppercase tracking-wider">
           <Network size={16} className="text-endecja-gold" />
           <span className={`${isCollapsed ? 'hidden' : 'inline'}`}>Network Analysis</span>
        </div>
        
        {isCollapsed && !result && !isLoading && (
           <button 
             onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
             className="text-[10px] bg-endecja-base text-endecja-gold px-2 py-1 rounded uppercase font-bold hover:bg-black flex items-center gap-1"
           >
             <Sparkles size={12} /> Analyze
           </button>
        )}

        <button className="text-endecja-light">
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="overflow-y-auto max-h-[55vh] border-t border-endecja-gold/20">
          {!result ? (
            <div className="p-4 text-center">
                <div className="mb-4">
                  <Network size={48} className="mx-auto text-endecja-gold/30 mb-3" />
                  <p className="text-xs text-endecja-light mb-1">
                    Run computational analysis to reveal:
                  </p>
                  <ul className="text-[10px] text-endecja-ink/70 space-y-1 text-left max-w-xs mx-auto">
                    <li>• Network topology and connectivity</li>
                    <li>• Key influencers and brokers</li>
                    <li>• Community structures and factions</li>
                    <li>• Structural balance and tensions</li>
                    <li>• Historical interpretation</li>
                  </ul>
                </div>
                <button 
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="w-full bg-endecja-base text-endecja-gold p-3 rounded font-bold hover:bg-black transition-colors text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-endecja-gold border-t-transparent rounded-full" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Run Analysis
                    </>
                  )}
                </button>
            </div>
          ) : (
            <div className="font-sans">
              {/* Key Metrics Grid */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/50 p-3 rounded text-center border border-endecja-gold/20">
                    <div className="text-2xl font-bold text-endecja-base">{result.stats.nodeCount}</div>
                    <div className="text-[10px] text-endecja-light uppercase">Nodes</div>
                  </div>
                  <div className="bg-white/50 p-3 rounded text-center border border-endecja-gold/20">
                    <div className="text-2xl font-bold text-endecja-base">{result.stats.edgeCount}</div>
                    <div className="text-[10px] text-endecja-light uppercase">Edges</div>
                  </div>
                </div>

                <div className="bg-white/50 p-3 rounded border border-endecja-gold/20">
                  <div className="text-[10px] text-endecja-light mb-1 uppercase flex items-center gap-1">
                    <Activity size={12} />
                    Network Density
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="text-xl font-bold text-endecja-base">{(result.stats.density * 100).toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-500 mb-1">
                      Avg. Degree: {result.stats.averageDegree.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Frustration Index - Enhanced Display */}
                <div className={`p-3 rounded border-2 ${getFrustrationStatus(result.stats.frustrationIndex).color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getFrustrationStatus(result.stats.frustrationIndex).icon}
                    <div className="text-[10px] uppercase font-bold">
                      Structural Balance
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    FI = {result.stats.frustrationIndex.toFixed(3)}
                  </div>
                  <div className="text-xs font-semibold mb-2">
                    {getFrustrationStatus(result.stats.frustrationIndex).label}
                  </div>
                  {result.stats.totalTriangles !== undefined && (
                    <div className="text-[10px] opacity-70 border-t border-current/20 pt-2">
                      Balanced: {result.stats.balancedTriangles} | 
                      Unbalanced: {result.stats.unbalancedTriangles} | 
                      Total: {result.stats.totalTriangles}
                    </div>
                  )}
                </div>

                {/* Structural Findings */}
                {result.stats.structuralFindings && result.stats.structuralFindings.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <div className="text-[10px] uppercase font-bold text-blue-900 mb-2 flex items-center gap-1">
                      <Info size={12} />
                      Key Structural Patterns
                    </div>
                    <ul className="text-[10px] text-blue-800 space-y-1">
                      {result.stats.structuralFindings.slice(0, 3).map((finding, i) => (
                        <li key={i} className="leading-tight">• {finding}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top Influencers */}
                <div className="bg-white/50 p-3 rounded border border-endecja-gold/20">
                  <div className="text-xs font-bold mb-2 flex items-center gap-1 text-endecja-base uppercase">
                    <TrendingUp size={14} />
                    Key Influencers
                  </div>
                  <div className="space-y-1.5">
                    {result.stats.topInfluencers.slice(0, 7).map((node, idx) => (
                      <div key={node.id} className="flex justify-between items-center text-xs border-b border-black/5 pb-1 last:border-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-endecja-gold font-bold text-[10px] flex-shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="truncate font-semibold text-[11px]">{node.label}</span>
                        </div>
                        <span className="text-endecja-gold font-mono text-[10px] flex-shrink-0 ml-2">
                          {node.score.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Communities Summary */}
                {result.stats.communities && (
                  <div className="bg-white/50 p-3 rounded border border-endecja-gold/20">
                    <div className="text-xs font-bold mb-1 flex items-center gap-1 text-endecja-base uppercase">
                      <Users size={14} />
                      Detected Communities
                    </div>
                    <div className="text-lg font-bold text-endecja-gold">
                      {new Set(Object.values(result.stats.communities)).size} factions
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      Likely ideological or generational divisions
                    </div>
                  </div>
                )}

                {/* Historical Interpretation Button */}
                <button
                  onClick={() => setShowInterpretation(true)}
                  className="w-full bg-gradient-to-r from-endecja-base to-endecja-light text-endecja-gold p-3 rounded font-bold text-xs uppercase tracking-wider hover:from-endecja-gold hover:to-yellow-500 hover:text-endecja-base transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <Sparkles size={14} />
                  View Historical Interpretation
                </button>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-endecja-gold/20">
                  <button 
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="flex-1 bg-endecja-base text-endecja-gold p-2 rounded text-xs hover:bg-black uppercase font-bold disabled:opacity-50"
                  >
                    Re-analyze
                  </button>
                  <button 
                    onClick={() => setResult(null)}
                    className="flex-1 bg-transparent border border-endecja-base text-endecja-base p-2 rounded text-xs hover:bg-endecja-base hover:text-white uppercase font-bold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historical Interpretation Modal */}
      {showInterpretation && result && (
        <div className="fixed inset-0 bg-endecja-base/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-endecja-paper border-2 border-endecja-gold p-6 rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-endecja-gold/20 pb-3">
              <h2 className="text-xl font-bold font-serif flex items-center gap-2 text-endecja-ink">
                <Sparkles className="text-endecja-gold" />
                Historical Interpretation
              </h2>
              <button 
                onClick={() => setShowInterpretation(false)}
                className="text-endecja-light hover:text-endecja-gold text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Main Interpretation */}
              <div className="bg-white/50 p-4 rounded border border-endecja-gold/10">
                <h3 className="text-sm font-bold uppercase text-endecja-gold mb-3 flex items-center gap-2">
                  <Network size={16} />
                  Structural Analysis
                </h3>
                <div className="text-sm leading-relaxed text-endecja-ink font-serif whitespace-pre-wrap">
                  {result.interpretation}
                </div>
              </div>

              {/* Methodology Notes */}
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h3 className="text-xs font-bold uppercase text-blue-900 mb-2 flex items-center gap-2">
                  <Info size={14} />
                  Methodological Notes
                </h3>
                <div className="text-xs leading-relaxed text-blue-800 font-sans">
                  {result.methodology}
                </div>
              </div>

              {/* Quick Stats Reference */}
              <div className="bg-white/50 p-4 rounded border border-endecja-gold/10">
                <h3 className="text-xs font-bold uppercase text-endecja-gold mb-3">
                  Key Metrics Summary
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-600">Nodes:</span>
                    <span className="ml-2 font-bold">{result.stats.nodeCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Edges:</span>
                    <span className="ml-2 font-bold">{result.stats.edgeCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Density:</span>
                    <span className="ml-2 font-bold">{(result.stats.density * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Frustration:</span>
                    <span className="ml-2 font-bold">{result.stats.frustrationIndex.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-endecja-gold/20 flex justify-end">
              <button 
                onClick={() => setShowInterpretation(false)}
                className="px-6 py-2 bg-endecja-base text-endecja-gold rounded hover:bg-endecja-light font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};