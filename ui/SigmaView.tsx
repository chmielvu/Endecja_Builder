import React, { useEffect, useRef, useState } from 'react';
import Sigma from 'sigma';
import { useGraphStore } from '../state/graphStore';
import { GeoOverlay } from './GeoOverlay';
import { EdgeAttributes, NodeAttributes, NodeType } from '../types';
import { ContextMenu } from './ContextMenu';

export const SigmaView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, selectNode, setHoveredNode, timeFilter, version, addNodeMinimal } = useGraphStore();
  const sigmaRef = useRef<Sigma | null>(null);
  const [sigmaInstance, setSigmaInstance] = useState<Sigma | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; graphX: number; graphY: number; }>({
    visible: false,
    x: 0,
    y: 0,
    graphX: 0,
    graphY: 0,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    if (!sigmaRef.current) {
      // [RAI @Techne] Initializing Sigma Instance with Verdigris settings
      sigmaRef.current = new Sigma(graph, containerRef.current, {
        minCameraRatio: 0.1,
        maxCameraRatio: 10,
        renderEdgeLabels: true,
        renderLabels: true,
        allowInvalidContainer: true,
        
        // Verdigris Palette Settings
        defaultEdgeType: 'arrow',
        defaultNodeType: 'circle',
        defaultNodeColor: '#3d5c45', // Endecja Light Green
        defaultEdgeColor: '#9ca3af', // Neutral Gray edges
        labelColor: { color: '#1b2d21' }, // Deep Forest Green Text
        labelFont: 'Crimson Text',
        hoverBackgroundColor: '#d4af37', // Gold highlight
        
        nodeTypeAttribute: 'sigmaVisualType', 
        edgeTypeAttribute: 'sigmaVisualEdgeType',
        zIndex: true,
        labelRenderedSizeThreshold: 6,
      });

      // Event Listeners
      sigmaRef.current.on('clickNode', (e) => {
        selectNode(e.node);
        setContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
      });

      sigmaRef.current.on('enterNode', (e) => {
        setHoveredNode(e.node);
        document.body.style.cursor = 'pointer';
      });

      sigmaRef.current.on('leaveNode', () => {
        setHoveredNode(null);
        document.body.style.cursor = 'default';
      });

      sigmaRef.current.on('rightClickStage', (e) => {
        e.event.preventDefault();
        const { x, y } = sigmaRef.current!.viewportToGraph({ x: e.event.x, y: e.event.y });
        setContextMenu({
          visible: true,
          x: e.event.x,
          y: e.event.y,
          graphX: x,
          graphY: y,
        });
      });
      
      setSigmaInstance(sigmaRef.current);
    } 

    // REDUCERS - Applied on every render/refresh
    if (sigmaRef.current) {
        // Node Reducer
        sigmaRef.current.setSetting('nodeReducer', (node, data) => {
            const res: any = { ...data };
            res.type = 'circle';
            res.label = data.label;

            const attr = graph.getNodeAttributes(node);
            const isActive = attr.valid_time.start <= timeFilter && attr.valid_time.end >= timeFilter;

            res.hidden = !isActive;

            // Dynamic Styling based on Verdigris Rules
            if (isActive) {
                // Highlight "Important" nodes with Gold
                // We assume size reflects importance roughly
                if ((data.size || 10) > 15) {
                    res.color = '#d4af37'; // Gold
                    res.borderColor = '#1b2d21'; // Dark base border
                    res.borderSize = 2;
                } else {
                    res.color = '#3d5c45'; // Standard Green
                    res.borderColor = 'transparent';
                }
                
                // Myths are Alert Red
                if (data.category === NodeType.MYTH) {
                    res.color = '#991b1b';
                    res.borderColor = '#1b2d21';
                    res.borderSize = 2;
                }
                
                // Organizations get "Fortress" styling
                if (data.category === NodeType.ORGANIZATION) {
                    res.borderColor = '#1b2d21';
                    res.borderSize = 3;
                }
            } else {
                // Nodes outside the time filter are hidden
                res.color = '#ccc'; // Faded color for hidden nodes if needed for debug, but hidden:true takes precedence
            }

            return res;
        });

        // Edge Reducer
        sigmaRef.current.setSetting('edgeReducer', (edge, data) => {
            const res: any = { ...data };
            res.type = 'arrow';
            res.label = data.relationshipType;

            const sourceNode = graph.source(edge);
            const targetNode = graph.target(edge);

            // Hide edge if either of its connected nodes are hidden by the nodeReducer
            // Fix: Use sigma.getNodeDisplayData to get the *rendered* hidden status
            const sourceDisplayData = sigmaRef.current!.getNodeDisplayData(sourceNode);
            const targetDisplayData = sigmaRef.current!.getNodeDisplayData(targetNode);
            
            res.hidden = (sourceDisplayData?.hidden || false) || (targetDisplayData?.hidden || false);
            
            if (!res.hidden) {
                if (data.is_hypothetical) {
                    res.color = 'rgba(100, 100, 100, 0.3)';
                    res.size = (res.size || 1) * 0.7;
                } else {
                    if (data.sign === -1) res.color = '#991b1b'; // Alert Red for conflict
                    else res.color = '#3d5c45'; // Green for alliance
                    res.size = (res.size || 1);
                }
            }
            return res;
        });

        sigmaRef.current.refresh();
    }


    return () => {
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
        setSigmaInstance(null);
      }
    };
  }, [graph, timeFilter, selectNode, setHoveredNode, version, addNodeMinimal]); // Added timeFilter to dependency array

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
  };

  const handleCreateNodeFromContext = (category: NodeType) => {
    addNodeMinimal(category, contextMenu.graphX, contextMenu.graphY);
    handleCloseContextMenu();
  };

  return (
      <div className="relative w-full h-full">
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