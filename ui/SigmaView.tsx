import React, { useEffect, useRef } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { useGraphStore } from '../state/graphStore';

export const SigmaView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graph, selectNode, setHoveredNode, timeFilter } = useGraphStore();
  const sigmaRef = useRef<Sigma | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Filter graph based on time before rendering
    // In a real optimized scenario, we would use graphology-filtering or a subgraph
    // Here we hide nodes/edges visually for performance in the scaffold
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
        allowInvalidContainer: true
      });

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
    } else {
        // Refresh if needed
        sigmaRef.current.refresh();
    }

    return () => {
      // Cleanup handled by ref check or explicit kill if unmounting
    };
  }, [graph, timeFilter, selectNode, setHoveredNode]);

  return <div ref={containerRef} className="w-full h-screen bg-[#f4e4bc]" />;
};