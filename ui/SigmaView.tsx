// ui/SigmaView.tsx
import React, { useEffect, useRef, useState } from 'react';
import Sigma from 'sigma';
import { useGraphStore } from '../state/graphStore';
import { GeoOverlay } from './GeoOverlay';
import { NodeType } from '../types';
import { ContextMenu } from './ContextMenu';

export const SigmaView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    graph, 
    selectNode, 
    setHoveredNode, 
    timeFilter, 
    version, 
    addNodeMinimal 
  } = useGraphStore();
  
  const sigmaRef = useRef<Sigma | null>(null);
  const [sigmaInstance, setSigmaInstance] = useState<Sigma | null>(null);
  const [contextMenu, setContextMenu] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
    graphX: number; 
    graphY: number; 
  }>({
    visible: false,
    x: 0,
    y: 0,
    graphX: 0,
    graphY: 0,
  });

  // 1. Lifecycle: Initial Mount and Instance Creation
  useEffect(() => {
    if (!containerRef.current || sigmaRef.current) return;

    // Initialize Sigma Instance with Verdigris settings
    const renderer = new Sigma(graph, containerRef.current, {
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
      renderEdgeLabels: true,
      renderLabels: true,
      allowInvalidContainer: true,
      
      // Verdigris Palette Settings
      defaultEdgeType: 'arrow',
      defaultNodeType: 'circle',
      defaultNodeColor: '#3d5c45', 
      defaultEdgeColor: '#9ca3af',
      labelColor: { color: '#1b2d21' },
      labelFont: 'Crimson Text',
      hoverBackgroundColor: '#d4af37',
      
      nodeTypeAttribute: 'sigmaVisualType', 
      edgeTypeAttribute: 'sigmaVisualEdgeType',
      zIndex: true,
      labelRenderedSizeThreshold: 6,
    });

    // Event Listeners
    renderer.on('clickNode', (e) => {
      selectNode(e.node);
      setContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
    });

    renderer.on('enterNode', (e) => {
      setHoveredNode(e.node);
      document.body.style.cursor = 'pointer';
    });

    renderer.on('leaveNode', () => {
      setHoveredNode(null);
      document.body.style.cursor = 'default';
    });

    renderer.on('rightClickStage', (e) => {
      e.event.preventDefault();
      const { x, y } = renderer.viewportToGraph({ x: e.event.x, y: e.event.y });
      setContextMenu({
        visible: true,
        x: e.event.x,
        y: e.event.y,
        graphX: x,
        graphY: y,
      });
    });

    sigmaRef.current = renderer;
    setSigmaInstance(renderer);

    return () => {
      renderer.kill();
      sigmaRef.current = null;
      setSigmaInstance(null);
    };
  }, [graph]); // Only re-run if the graph object itself changes (e.g. hydration)

  // 2. Lifecycle: Reactive Updates (Filtering and Styling)
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;

    // Node Reducer for temporal filtering
    sigma.setSetting('nodeReducer', (node, data) => {
      const res: any = { ...data };
      const attr = graph.getNodeAttributes(node);
      const isActive = attr.valid_time.start <= timeFilter && attr.valid_time.end >= timeFilter;

      res.hidden = !isActive;

      if (isActive) {
        if ((data.size || 10) > 15) {
          res.color = '#d4af37';
          res.borderColor = '#1b2d21';
          res.borderSize = 2;
        } else {
          res.color = '#3d5c45';
          res.borderColor = 'transparent';
        }
        
        if (data.category === NodeType.MYTH) {
          res.color = '#991b1b';
          res.borderColor = '#1b2d21';
          res.borderSize = 2;
        }
        
        if (data.category === NodeType.ORGANIZATION) {
          res.borderColor = '#1b2d21';
          res.borderSize = 3;
        }
      }
      return res;
    });

    // Edge Reducer
    sigma.setSetting('edgeReducer', (edge, data) => {
      const res: any = { ...data };
      const sourceNode = graph.source(edge);
      const targetNode = graph.target(edge);

      const sourceAttr = graph.getNodeAttributes(sourceNode);
      const targetAttr = graph.getNodeAttributes(targetNode);
      
      const sourceActive = sourceAttr.valid_time.start <= timeFilter && sourceAttr.valid_time.end >= timeFilter;
      const targetActive = targetAttr.valid_time.start <= timeFilter && targetAttr.valid_time.end >= timeFilter;

      res.hidden = !sourceActive || !targetActive;
      
      if (!res.hidden) {
        if (data.is_hypothetical) {
          res.color = 'rgba(100, 100, 100, 0.3)';
          res.size = (res.size || 1) * 0.7;
        } else {
          res.color = data.sign === -1 ? '#991b1b' : '#3d5c45';
        }
      }
      return res;
    });

    sigma.refresh();
  }, [timeFilter, version, graph]); // Triggers refresh without re-initializing Sigma

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
  };

  const handleCreateNodeFromContext = (category: NodeType) => {
    addNodeMinimal(category, contextMenu.graphX, contextMenu.graphY);
    handleCloseContextMenu();
  };

  return (
      <div className="relative w-full h-full" aria-label="Historical Graph Workspace">
          <div ref={containerRef} className="w-full h-full bg-endecja-paper" />
          {sigmaInstance && <GeoOverlay sigma={sigmaInstance} />}
          {contextMenu.visible && (
            <ContextMenu 
              x={contextMenu.x} 
              y={contextMenu.y} 
              onClose={handleCloseContextMenu}
              onCreateNode={handleCreateNodeFromContext}
            />
          )}
      </div>
  );
};

export default SigmaView;