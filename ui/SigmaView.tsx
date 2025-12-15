import React, { useEffect, useRef, useState } from 'react';
import Sigma from 'sigma';
import { useGraphStore } from '../state/graphStore';
import { GeoOverlay } from './GeoOverlay';
import { EdgeAttributes, NodeAttributes, NodeType } from '../types';
import { ContextMenu } from './ContextMenu'; // New component

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

    // Filter graph based on time before rendering
    graph.forEachNode((node, attr) => {
        const isActive = attr.valid_time.start <= timeFilter && attr.valid_time.end >= timeFilter;
        graph.setNodeAttribute(node, 'hidden', !isActive);
    });
    
    graph.forEachEdge((edge, attr) => {
        const isActive = attr.valid_time.start <= timeFilter && attr.valid_time.end >= timeFilter;
        graph.setEdgeAttribute(edge, 'hidden', !isActive);
    });

    if (!sigmaRef.current) {
      // [RAI @Techne] Initializing Sigma Instance with corrected settings
      sigmaRef.current = new Sigma(graph, containerRef.current, {
        minCameraRatio: 0.1,
        maxCameraRatio: 10,
        renderEdgeLabels: true,
        renderLabels: true,
        allowInvalidContainer: true,
        defaultEdgeType: 'arrow',
        defaultNodeType: 'circle',
        // CRITICAL FIX: Tell Sigma to look for a non-existent attribute for the program type.
        // This forces it to fall back to 'defaultNodeType' ("circle") instead of reading
        // our semantic "type" attribute (which contains "person", "organization", etc.)
        nodeTypeAttribute: 'sigmaVisualType', 
        // CRITICAL FIX: Add edgeTypeAttribute to prevent crash from semantic 'type' edge attribute
        edgeTypeAttribute: 'sigmaVisualEdgeType',
        zIndex: true,
        labelFont: '"IBM Plex Sans", sans-serif',
        labelRenderedSizeThreshold: 6,
      });

      // Event Listeners
      sigmaRef.current.on('clickNode', (e) => {
        selectNode(e.node);
        setContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 }); // Close context menu on node click
      });

      sigmaRef.current.on('enterNode', (e) => {
        setHoveredNode(e.node);
        document.body.style.cursor = 'pointer';
      });

      sigmaRef.current.on('leaveNode', () => {
        setHoveredNode(null);
        document.body.style.cursor = 'default';
      });

      // Right-click event for adding nodes
      sigmaRef.current.on('rightClickStage', (e) => {
        e.event.preventDefault(); // Prevent native context menu
        const { x, y } = sigmaRef.current!.viewportToGraph({ x: e.event.x, y: e.event.y });
        setContextMenu({
          visible: true,
          x: e.event.x,
          y: e.event.y,
          graphX: x,
          graphY: y,
        });
      });
      
      // Node Reducer
      sigmaRef.current.setSetting('nodeReducer', (node, data) => {
        const res: any = { ...data };
        
        // Ensure visual type is always 'circle' to prevent crashes with semantic types
        res.type = 'circle';
        
        // Apply glyphs/borders based on node category
        switch (data.category) {
          case NodeType.ORGANIZATION:
            res.borderColor = '#1e3a5f'; // Archival navy
            res.borderSize = 2;
            break;
          case NodeType.MYTH:
            res.borderColor = '#7b2cbf'; // Myth purple
            res.borderSize = 2;
            res.size = (res.size || 10) * 1.2; // Slightly larger for myths
            break;
          case NodeType.PERSON:
            // Default circle, no special border
            res.borderColor = 'transparent'; 
            res.borderSize = 1;
            break;
          default:
            res.borderColor = '#704214'; // Sepia for others
            res.borderSize = 1;
        }

        // Ensure label is preserved
        res.label = data.label;

        return res;
      });

      // Edge Reducer
      sigmaRef.current.setSetting('edgeReducer', (edge, data) => {
        const res: any = { ...data };

        // Force visual rendering to 'arrow'
        res.type = 'arrow';
        
        // Map the semantic 'relationshipType' attribute to the label for display
        res.label = data.relationshipType;

        if (data.is_hypothetical) {
            res.color = 'rgba(100, 100, 100, 0.4)'; // Faint gray for hypothetical
            res.size = (res.size || 1) * 0.7; // Thinner
            // Sigma 3.x default renderer doesn't directly support dashed lines
            // Could use a custom edge renderer if this becomes critical.
            // For now, rely on faint color and size for visual cue.
        } else {
             if (data.sign === -1) res.color = '#dc143c'; // Accent red for conflict
             else res.color = '#2c241b'; // Ink for alliance/positive
             res.size = (res.size || 1); // Default thickness
        }
        return res;
      });

      setSigmaInstance(sigmaRef.current);
    } else {
        // Refresh graph data if version changed
        sigmaRef.current.refresh();
    }

    return () => {
      // Proper cleanup to support React StrictMode
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
        setSigmaInstance(null);
      }
    };
  }, [graph, timeFilter, selectNode, setHoveredNode, version, addNodeMinimal]);

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
  };

  const handleCreateNodeFromContext = (category: NodeType) => {
    addNodeMinimal(category, contextMenu.graphX, contextMenu.graphY);
    handleCloseContextMenu();
  };

  return (
      <div className="relative w-full h-screen">
          <div ref={containerRef} className="w-full h-full bg-[#f4e4bc]" />
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