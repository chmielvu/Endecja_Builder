import React, { useEffect, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { useGraphStore } from '../state/graphStore';
import { GeoOverlay } from './GeoOverlay';
import { EdgeAttributes, NodeAttributes } from '../types';

export const SigmaView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, selectNode, setHoveredNode, timeFilter, version } = useGraphStore();
  const sigmaRef = useRef<Sigma | null>(null);
  const [sigmaInstance, setSigmaInstance] = useState<Sigma | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Filter graph based on time before rendering
    // We modify the 'hidden' attribute for visual filtering
    graph.forEachNode((node, attr) => {
        const isActive = attr.valid_time.start <= timeFilter && attr.valid_time.end >= timeFilter;
        graph.setNodeAttribute(node, 'hidden', !isActive);
    });
    
    graph.forEachEdge((edge, attr) => {
        const isActive = attr.valid_time.start <= timeFilter && attr.valid_time.end >= timeFilter;
        graph.setEdgeAttribute(edge, 'hidden', !isActive);
    });

    if (!sigmaRef.current) {
      sigmaRef.current = new Sigma(graph, containerRef.current, {
        minCameraRatio: 0.1,
        maxCameraRatio: 10,
        renderEdgeLabels: true,
        allowInvalidContainer: true,
        defaultEdgeType: 'arrow',
        edgeProgramClasses: {
          // In a full implementation, we would register custom WebGL programs here.
          // For this scaffold, we rely on standard renderers and visual hacks (color/alpha).
        }
      });

      // Event Listeners
      sigmaRef.current.on('clickNode', (e) => {
        selectNode(e.node);
      });

      sigmaRef.current.on('enterNode', (e) => {
        setHoveredNode(e.node);
        document.body.style.cursor = 'pointer';
      });

      sigmaRef.current.on('leaveNode', () => {
        setHoveredNode(null);
        document.body.style.cursor = 'default';
      });
      
      // Node Reducer for LOD and Selection
      sigmaRef.current.setSetting('nodeReducer', (node, data) => {
        const res: Partial<NodeAttributes> = { ...data };
        
        // Highlight logic could go here if selectedNode is passed to a ref or store subscription
        
        // Semantic LOD: If zoomed out (ratio > 2), hide small nodes
        // Note: We can't access camera easily in reducer without binding. 
        // Sigma handles label density automatically.
        // We'll trust Sigma's default label grid for text LOD.
        
        return res;
      });

      // Edge Reducer for Hypothetical Edges
      sigmaRef.current.setSetting('edgeReducer', (edge, data) => {
        const res: Partial<EdgeAttributes> & { color?: string; size?: number; hidden?: boolean } = { ...data };

        // Visual flag for hypothetical edges
        if (data.is_hypothetical) {
            // Make them dashed-like by using a very light color or specific tint
            // Since we can't easily do dashed without custom shaders in v3 core setup quickly,
            // we use transparency and color.
            res.color = 'rgba(100, 100, 100, 0.3)';
            res.size = (res.size || 1) * 0.5;
        } else {
             // Sign-based coloring
             if (data.sign === -1) res.color = '#dc143c'; // Hostile
             else res.color = '#2c241b'; // Friendly
        }

        return res;
      });

      setSigmaInstance(sigmaRef.current);
    } else {
        // Refresh if needed
        sigmaRef.current.refresh();
    }

    return () => {
      // Cleanup handled by ref check or explicit kill if unmounting
      // sigmaRef.current?.kill();
    };
  }, [graph, timeFilter, selectNode, setHoveredNode, version]);

  return (
      <div className="relative w-full h-screen">
          <div ref={containerRef} className="w-full h-full bg-[#f4e4bc]" />
          {sigmaInstance && <GeoOverlay sigma={sigmaInstance} />}
      </div>
  );
};