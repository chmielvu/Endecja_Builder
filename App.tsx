
import React from 'react';
import { SigmaView } from './ui/SigmaView';
import { Sidebar } from './ui/Sidebar';
import { DocumentUploader } from './ui/DocumentUploader';
import { BuilderToolbar } from './ui/BuilderToolbar';
import { BuilderNodeEditor } from './ui/BuilderNodeEditor';
import { BuilderEdgeEditor } from './ui/BuilderEdgeEditor';
import { Toaster } from "./components/ui/toaster";
import { useGraphStore } from './state/graphStore';

function App() {
  const { mode, selectedNode, selectedEdge } = useGraphStore();

  return (
    <div className="flex flex-col w-screen h-screen bg-gray-100 overflow-hidden font-sans text-slate-900">
      {/* Top Bar for Builder Mode */}
      {mode === 'builder' && <BuilderToolbar />}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Graph Area */}
        <main className="flex-1 relative h-full">
          <SigmaView />
          
          {/* Uploader - Only in Analysis Mode */}
          {mode === 'analysis' && (
            <div className="absolute top-4 left-4 w-64 z-10">
              <DocumentUploader />
            </div>
          )}
        </main>

        {/* Sidebar Controls */}
        <aside className="w-96 border-l border-gray-200 bg-white h-full shadow-xl z-20 overflow-hidden flex flex-col">
          {mode === 'analysis' ? (
            <div className="flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          ) : (
            // Builder Mode Sidebars
            <div className="h-full bg-endecja-paper">
              {selectedNode ? (
                <BuilderNodeEditor />
              ) : selectedEdge ? (
                <BuilderEdgeEditor />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-endecja-ink/50">
                  <div className="mb-4 p-4 rounded-full bg-endecja-gold/10">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <h3 className="font-serif font-bold text-lg text-endecja-gold mb-2">Select an Element</h3>
                  <p className="text-sm">Click on a node or edge to edit its properties, images, and description.</p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Toast Notifications Overlay */}
      <Toaster />
    </div>
  );
}

export default App;
