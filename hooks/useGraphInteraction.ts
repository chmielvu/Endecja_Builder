
import { useEffect, useState } from 'react';
import Sigma from 'sigma';
import { useGraphStore } from '../state/graphStore';
import { notify } from '../lib/utils';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  graphX: number;
  graphY: number;
  nodeId?: string;
}

interface EdgeModeState {
  active: boolean;
  source?: string;
}

export const useGraphInteraction = (sigma: Sigma | null) => {
  const { 
    graph, 
    selectNode, 
    selectEdge, 
    setHoveredNode, 
    selectedNode,
    hoveredNode,
    refresh,
    timeFilter
  } = useGraphStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, graphX: 0, graphY: 0 });
  const [edgeMode, setEdgeMode] = useState<EdgeModeState>({ active: false });
  const [edgeDialog, setEdgeDialog] = useState<{ open: boolean; target?: string; relationship: string }>({
    open: false,
    relationship: '',
  });

  // --- Visual Reducers ---
  useEffect(() => {
    if (!sigma) return;

    sigma.setSetting("nodeReducer", (node, data) => {
        const res = { ...data };
        if (data.hidden) return res;

        const focalNode = hoveredNode || selectedNode;

        if (focalNode) {
            if (node === focalNode || graph.areNeighbors(node, focalNode)) {
                res.zIndex = 10;
            } else {
                res.color = "#E0E0E0";
                res.zIndex = 0;
                res.label = "";
            }
        }
        
        if (node === selectedNode) {
            res.highlighted = true;
            res.forceLabel = true;
        }
        return res;
    });

    sigma.setSetting("edgeReducer", (edge, data) => {
        const res = { ...data };
        const focalNode = hoveredNode || selectedNode;

        if (focalNode) {
            if (graph.hasExtremity(edge, focalNode)) {
                res.zIndex = 10;
                res.size = (res.size || 1) * 2;
            } else {
                res.hidden = true;
                res.color = "#f0f0f0";
            }
        }
        return res;
    });

    sigma.refresh();
  }, [sigma, hoveredNode, selectedNode, graph]);

  // --- Event Listeners ---
  useEffect(() => {
    if (!sigma) return;

    const onEnterNode = (e: any) => setHoveredNode(e.node);
    const onLeaveNode = () => setHoveredNode(null);
    
    const onClickNode = (e: any) => {
      if (edgeMode.active && edgeMode.source && edgeMode.source !== e.node) {
        setEdgeDialog({ open: true, target: e.node, relationship: '' });
      } else {
        selectNode(e.node);
        setEdgeMode({ active: true, source: e.node });
        notify.info("Link mode: Click another node to connect");
      }
    };

    const onClickEdge = (e: any) => selectEdge(e.edge);

    const onRightClickNode = (e: any) => {
      e.preventSigmaDefault();
      const original = e.event.original as MouseEvent;
      setContextMenu({
        visible: true,
        x: original.clientX,
        y: original.clientY,
        graphX: 0,
        graphY: 0,
        nodeId: e.node,
      });
    };

    const onRightClickStage = (e: any) => {
      e.preventSigmaDefault();
      const original = e.event.original as MouseEvent;
      const pos = sigma.viewportToGraph({ x: e.event.x, y: e.event.y });
      setContextMenu({
        visible: true,
        x: original.clientX,
        y: original.clientY,
        graphX: pos.x,
        graphY: pos.y,
      });
    };

    const onClickStage = () => {
      if (edgeMode.active) {
        setEdgeMode({ active: false });
        notify.info("Link mode cancelled");
      }
      setContextMenu(prev => ({ ...prev, visible: false }));
      selectNode(null);
      selectEdge(null);
    };

    sigma.on("enterNode", onEnterNode);
    sigma.on("leaveNode", onLeaveNode);
    sigma.on("clickNode", onClickNode);
    sigma.on("clickEdge", onClickEdge);
    sigma.on("rightClickNode", onRightClickNode);
    sigma.on("rightClickStage", onRightClickStage);
    sigma.on("clickStage", onClickStage);

    const escHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (edgeMode.active) {
          setEdgeMode({ active: false });
          notify.info("Link mode cancelled");
        }
        setContextMenu(prev => ({ ...prev, visible: false }));
        selectNode(null);
      }
    };
    window.addEventListener('keydown', escHandler);

    return () => {
      sigma.removeAllListeners();
      window.removeEventListener('keydown', escHandler);
    };
  }, [sigma, edgeMode, graph, selectNode, selectEdge, setHoveredNode]);

  const handleEdgeCreate = () => {
    if (!edgeMode.source || !edgeDialog.target) return;
    
    if (graph.hasEdge(edgeMode.source, edgeDialog.target)) {
       notify.error("Edge already exists");
       setEdgeDialog({ open: false, relationship: '' });
       setEdgeMode({ active: false });
       return;
    }

    try {
      graph.addEdge(edgeMode.source, edgeDialog.target, {
        relationshipType: edgeDialog.relationship || 'RELATED_TO',
        weight: 1, 
        sign: 1,
        valid_time: { start: timeFilter - 5, end: timeFilter + 5 },
        provenance: [{ source: 'Manual Link', confidence: 1.0, method: 'archival', sourceClassification: 'primary', timestamp: Date.now() }],
        is_hypothetical: false,
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

  return {
    contextMenu,
    setContextMenu,
    edgeMode,
    setEdgeMode,
    edgeDialog,
    setEdgeDialog,
    handleEdgeCreate
  };
};
