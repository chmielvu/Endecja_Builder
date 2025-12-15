import React, { useEffect } from 'react';
import { SigmaView } from './ui/SigmaView';
import { Sidebar } from './ui/Sidebar';
import { EditPanel } from './ui/EditPanel';
import { Timeline } from './ui/Timeline';
import { DmowskiChat } from './ui/DmowskiChat';
import { DocumentUploader } from './ui/DocumentUploader';
import { AiExpansionPanel } from './ui/AiExpansionPanel';
import { StatsPanel } from './ui/StatsPanel';
import { useGraphStore } from './state/graphStore';
import { hydrateGraph } from './graph/hydrate';
import { seedData } from './graph/seedData';

function App() {
  const { setGraph, isLoading, loadingStatus } = useGraphStore();

  useEffect(() => {
    // Hydrate with the seed JSON provided
    const g = hydrateGraph(seedData);
    setGraph(g);
  }, [setGraph]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-archival-paper">
      {/* Main Graph Visualization */}
      <SigmaView />
      
      {/* Navigation & Tools */}
      <Sidebar />
      <Timeline />
      
      {/* Context Panels */}
      <EditPanel />
      <StatsPanel />
      
      {/* Action Panels */}
      <DocumentUploader />
      <AiExpansionPanel />
      
      {/* Chat Agent */}
      <DmowskiChat />
      
      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-archival-paper/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-2xl border-2 border-archival-navy text-center max-w-sm">
            <div className="animate-spin w-10 h-10 border-4 border-archival-navy border-t-archival-gold rounded-full mx-auto mb-4"></div>
            <p className="font-serif font-bold text-lg text-archival-navy mb-2">Processing</p>
            <p className="font-sans text-sm text-archival-sepia">{loadingStatus}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;