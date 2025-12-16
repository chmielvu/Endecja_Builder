
import React, { useEffect, useRef, useState } from 'react';
import Sigma from 'sigma';
import { Coordinates } from 'sigma/types';
import { useGraphStore } from '../state/graphStore';
import { GeoOverlay } from './GeoOverlay';
import { ContextMenu } from './ContextMenu';
import { notify } from '../lib/utils';
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

export const SigmaView = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, selectNode, selectEdge, timeFilter, version, refresh } = useGraphStore();

  const sigmaRef = useRef<Sigma | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    graphX: number;
    graphY: number;
    nodeId?: string;
  }>({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });

  // Linking State
  const [edgeMode, setEdgeMode] = useState<{ active: boolean; source?: string }>({ active: false });
  const [edgeDialog, setEdgeDialog] = useState<{ open: boolean; target?: string; relationship: string }>({
    open: false,
    relationship: '',
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Sigma
    const sigma = new Sigma(graph, containerRef.current, {
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
      defaultNodeType: "circle",
      defaultEdgeType: "arrow",
      labelFont: "Crimson Text",
      allowInvalidContainer: true,
      renderEdgeLabels: true, // Enable edge labels for visibility
    });

    // --- Interaction Handlers ---

    // 1. Node Click (Selection OR Linking)
    sigma.on("clickNode", (e) => {
      // If we are in "Edge Creation Mode" and clicked a different node
      if (edgeMode.active && edgeMode.source && edgeMode.source !== e.node) {
        setEdgeDialog({ open: true, target: e.node, relationship: '' });
      } else {
        // Standard Selection
        selectNode(e.node);
        // Start Linking Mode
        setEdgeMode({ active: true, source: e.node });
        notify.info("Link mode: Click another node to connect");
      }
    });

    // 2. Edge Click (Selection)
    sigma.on("clickEdge", (e) => {
        selectEdge(e.edge);
    });

    // 3. Right Click (Context Menu)
    sigma.on("rightClickNode", (e) => {
      e.preventSigmaDefault();
      setContextMenu({
        visible: true,
        // FIX: Access clientX and clientY from e.event
        x: e.event.x,
        y: e.event.y,
        graphX: 0,
        graphY: 0,
        nodeId: e.node,
      });
    });

    sigma.on("rightClickStage", (e) => {
      e.preventSigmaDefault();
      // Convert screen coords to graph coords
      const pos = sigma.viewportToGraph({ x: e.event.x, y: e.event.y });
      setContextMenu({
        visible: true,
        // FIX: Access clientX and clientY from e.event
        x: e.event.x,
        y: e.event.y,
        graphX: pos.x,
        graphY: pos.y,
      });
    });

    // 4. Stage Click (Cancel Actions)
    sigma.on("clickStage", () => {
      if (edgeMode.active) {
        setEdgeMode({ active: false });
        notify.info("Link mode cancelled");
      }
      setContextMenu({ ...contextMenu, visible: false });
      // Deselect if clicking on empty stage
      selectNode(null);
      selectEdge(null);
    });

    // 5. Keyboard (ESC to cancel)
    const escHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (edgeMode.active) {
          setEdgeMode({ active: false });
          notify.info("Link mode cancelled");
        }
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    window.addEventListener('keydown', escHandler);

    sigmaRef.current = sigma;

    return () => {
      window.removeEventListener('keydown', escHandler);
      sigma.kill();
    };
  }, [edgeMode.active, edgeMode.source]); // Re-bind listeners when mode changes

  // Refresh renderer when graph/time changes
  useEffect(() => {
    if (sigmaRef.current) {
      sigmaRef.current.refresh();
    }
  }, [version, timeFilter]);

  const handleEdgeCreate = () => {
    if (!edgeMode.source || !edgeDialog.target) return;
    
    // Check duplication
    if (graph.hasEdge(edgeMode.source, edgeDialog.target)) {
       notify.error("Edge already exists");
       setEdgeDialog({ open: false, relationship: '' });
       setEdgeMode({ active: false });
       return;
    }

    try {
      graph.addEdge(edgeMode.source, edgeDialog.target, {
        relationshipType: edgeDialog.relationship || 'RELATED_TO',
        weight: 1, // FIX: Added missing weight property
        sign: 1,
        valid_time: { start: timeFilter - 5, end: timeFilter + 5 },
        // FIX: Added missing 'method' and 'sourceClassification' properties to Provenance object
        provenance: [{ source: 'Manual Link', confidence: 1.0, method: 'archival', sourceClassification: 'primary', timestamp: Date.now() }],
        is_hypothetical: true,
      });
      
      refresh();
      notify.success("Connection created");
    } catch (e) {
      notify.error("Failed to create connection");
    } finally {
      setEdgeMode({ active: false });
      setEdgeDialog({ open: false, relationship: '' });
    }
  };

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
