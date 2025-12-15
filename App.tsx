import React, { useEffect } from 'react';
import { SigmaView } from './ui/SigmaView';
import { Sidebar } from './ui/Sidebar';
import { DetailsPanel } from './ui/DetailsPanel';
import { Timeline } from './ui/Timeline';
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
      <SigmaView />
      <Sidebar />
      <Timeline />
      <DetailsPanel />
      
      {isLoading && (
        <div className="absolute inset-0 bg-archival-paper/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl border border-archival-sepia text-center">
            <div className="animate-spin w-8 h-8 border-4 border-archival-sepia border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="font-serif text-archival-ink">{loadingStatus}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;