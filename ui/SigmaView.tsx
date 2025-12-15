import React, { useEffect, useRef, useState } from 'react';
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
        zIndex: true,
        labelFont: '"IBM Plex Sans", sans-serif',
        labelRenderedSizeThreshold: 6,
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
      
      // Node Reducer
      sigmaRef.current.setSetting('nodeReducer', (node, data) => {
        const res: any = { ...data };
        
        // Ensure visual type is always 'circle' to prevent crashes with semantic types
        res.type = 'circle';
        
        // Ensure label is preserved
        res.label = data.label;

        return res;
      });

      // Edge Reducer
      sigmaRef.current.setSetting('edgeReducer', (edge, data) => {
        const res: any = { ...data };

        // Force visual rendering to 'arrow'
        res.type = 'arrow';

        if (data.is_hypothetical) {
            res.color = 'rgba(100, 100, 100, 0.3)';
            res.size = (res.size || 1) * 0.5;
        } else {
             if (data.sign === -1) res.color = '#dc143c'; 
             else res.color = '#2c241b';
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
  }, [graph, timeFilter, selectNode, setHoveredNode, version]);

  return (
      <div className="relative w-full h-screen">
          <div ref={containerRef} className="w-full h-full bg-[#f4e4bc]" />
          {sigmaInstance && <GeoOverlay sigma={sigmaInstance} />}
      </div>
  );
};