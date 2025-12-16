
import React, { useEffect, useRef } from 'react';
import Sigma from 'sigma';
import { useGraphStore } from '../state/graphStore';
import { GeoOverlay } from './GeoOverlay';
import { ContextMenu } from './ContextMenu';
import { useGraphInteraction } from '../hooks/useGraphInteraction';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";

// Helper to calculate graph bounding box since graphology doesn't strictly provide getExtremities by default
const getGraphExtremities = (graph: any) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasNodes = false;
  
  graph.forEachNode((_: any, attrs: any) => {
    hasNodes = true;
    const x = attrs.x || 0;
    const y = attrs.y || 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  if (!hasNodes) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
};

export const SigmaView = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, timeFilter, version, cameraSignal } = useGraphStore();
  const sigmaRef = useRef<Sigma | null>(null);

  // Initialize Sigma
  useEffect(() => {
    if (!containerRef.current || sigmaRef.current) return;

    const sigma = new Sigma(graph, containerRef.current, {
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
      defaultNodeType: "circle",
      defaultEdgeType: "arrow",
      labelFont: "Crimson Text",
      allowInvalidContainer: true,
      renderEdgeLabels: true,
      zIndex: true,
    });

    sigmaRef.current = sigma;

    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [graph]); // Dependency on graph ensuring initialization on first load

  // Use Interaction Hook
  const { 
    contextMenu, 
    setContextMenu, 
    edgeMode, 
    edgeDialog, 
    setEdgeDialog, 
    handleEdgeCreate 
  } = useGraphInteraction(sigmaRef.current);

  // Handle Camera Signals
  useEffect(() => {
    if (!sigmaRef.current || !cameraSignal) return;
    const camera = sigmaRef.current.getCamera();
    
    switch (cameraSignal.type) {
        case 'in':
            camera.animatedZoom({ duration: 400 });
            break;
        case 'out':
            camera.animatedUnzoom({ duration: 400 });
            break;
        case 'fit':
            const bounds = getGraphExtremities(graph);
            if (bounds.minX !== -Infinity && bounds.minX !== Infinity) {
                const { width, height } = sigmaRef.current.getDimensions();
                const dx = bounds.maxX - bounds.minX;
                const dy = bounds.maxY - bounds.minY;
                const ratio = Math.max(
                    dx / (width * 0.9),
                    dy / (height * 0.9)
                ) || 1;

                camera.animate(
                    {
                        x: (bounds.minX + bounds.maxX) / 2,
                        y: (bounds.minY + bounds.maxY) / 2,
                        ratio: ratio,
                    }, 
                    { duration: 600, easing: 'cubicInOut' }
                );
            }
            break;
    }
  }, [cameraSignal, graph]);

  // Refresh renderer when graph/time changes
  useEffect(() => {
    if (sigmaRef.current) {
      sigmaRef.current.refresh();
    }
  }, [version, timeFilter]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full bg-endecja-paper" />
      
      {/* Map Underlay */}
      {sigmaRef.current && <GeoOverlay sigma={sigmaRef.current} />}

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          graphX={contextMenu.graphX}
          graphY={contextMenu.graphY}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}

      {/* Edge Name Dialog */}
      <Dialog open={edgeDialog.open} onOpenChange={(o) => !o && setEdgeDialog({ ...edgeDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Define Relationship</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label>Relationship Type</Label>
            <Input
              value={edgeDialog.relationship}
              onChange={(e) => setEdgeDialog({ ...edgeDialog, relationship: e.target.value })}
              placeholder="e.g. founded, opposed, met_with"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleEdgeCreate()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleEdgeCreate}>Confirm Connection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Linking Mode Indicator */}
      {edgeMode.active && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-endecja-ink text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 pointer-events-none">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Linking Mode Active</span>
          <span className="text-xs opacity-70 border-l border-white/20 pl-3">Click target node or ESC to cancel</span>
        </div>
      )}
    </div>
  );
};
