import React, { useEffect } from 'react';
import { SigmaView } from './ui/SigmaView';
import { Sidebar } from './ui/Sidebar';
import { EditPanel } from './ui/EditPanel';
import { Timeline } from './ui/Timeline';
import { DocumentUploader } from './ui/DocumentUploader';
import { AiExpansionPanel } from './ui/AiExpansionPanel';
import { StatsPanel } from './ui/StatsPanel';
import { MieczykLogo } from './ui/MieczykLogo';
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
    <div className="flex h-screen w-screen bg-endecja-paper overflow-hidden font-serif text-endecja-ink">
      
      {/* LEFT: Command Center (Sidebar) */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r-4 border-endecja-gold bg-endecja-base shadow-2xl z-40 relative">
        
        {/* Branding Header */}
        <div className="p-6 border-b border-endecja-gold/30 flex flex-col items-center bg-gradient-to-b from-endecja-base to-endecja-light">
          <MieczykLogo className="h-24 w-auto drop-shadow-lg mb-4" />
          <h1 className="text-2xl font-bold text-endecja-gold tracking-widest uppercase text-center font-serif">
            Ordo<br/>Graphia
          </h1>
          <p className="text-xs text-endecja-paper/70 mt-2 tracking-widest text-center font-sans">
            SYSTEM ANALIZY STRUKTURALNEJ
          </p>
        </div>

        {/* Navigation / Sidebar */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <Sidebar />
        </div>
      </div>

      {/* CENTER: The Canvas and HUD Layer */}
      <div className="flex-1 relative bg-endecja-paper h-full overflow-hidden">
        
        {/* LAYER 0: Graph Canvas */}
        <div className="absolute inset-0 z-0">
            <SigmaView />
        </div>

        {/* LAYER 10: HUD ZONES - Crosshair Layout */}

        {/* ZONE: Top Left (Network Stats) */}
        <div className="absolute top-4 left-4 z-10 pointer-events-auto">
            <StatsPanel />
        </div>

        {/* ZONE: Top Center (AI Expansion) */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-auto flex justify-center">
            <AiExpansionPanel />
        </div>

        {/* ZONE: Top Right (Context Panels) */}
        <div className="absolute top-4 right-4 z-10 pointer-events-auto flex flex-col gap-2 items-end">
            <EditPanel />
        </div>

        {/* ZONE: Bottom Left (Tools) */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
            <DocumentUploader />
        </div>

        {/* ZONE: Bottom Center (Timeline) */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none p-6">
            <div className="pointer-events-auto max-w-4xl mx-auto">
                <Timeline />
            </div>
        </div>

        {/* GLOBAL: Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-endecja-base/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-endecja-paper p-8 rounded-lg shadow-2xl border-2 border-endecja-gold text-center max-w-sm">
              <div className="animate-spin w-10 h-10 border-4 border-endecja-base border-t-endecja-gold rounded-full mx-auto mb-4"></div>
              <p className="font-serif font-bold text-lg text-endecja-base mb-2">Przetwarzanie Danych</p>
              <p className="font-sans text-sm text-endecja-light">{loadingStatus}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;