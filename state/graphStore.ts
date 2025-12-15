import { create } from 'zustand';
import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../types';

interface GraphState {
  graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
  version: number; // Increment to force re-renders
  
  // UI State
  selectedNode: string | null;
  hoveredNode: string | null;
  timeFilter: number; // Year
  isLoading: boolean;
  loadingStatus: string;
  
  // Analysis State
  frustrationIndex: number | null;
  isEmbeddingLoaded: boolean;
  
  // Actions
  setGraph: (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => void;
  selectNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setTimeFilter: (year: number) => void;
  setLoading: (loading: boolean, status?: string) => void;
  setFrustrationIndex: (index: number) => void;
  setEmbeddingLoaded: (loaded: boolean) => void;
  updateNodeAttribute: (nodeId: string, key: keyof NodeAttributes, value: any) => void;
  refresh: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graph: new MultiDirectedGraph(),
  version: 0,
  selectedNode: null,
  hoveredNode: null,
  timeFilter: 1905,
  isLoading: false,
  loadingStatus: '',
  frustrationIndex: null,
  isEmbeddingLoaded: false,

  setGraph: (graph) => set({ graph, version: 0 }),
  selectNode: (nodeId) => set({ selectedNode: nodeId }),
  setHoveredNode: (nodeId) => set({ hoveredNode: nodeId }),
  setTimeFilter: (year) => set({ timeFilter: year }),
  setLoading: (loading, status) => set({ isLoading: loading, loadingStatus: status || '' }),
  setFrustrationIndex: (index) => set({ frustrationIndex: index }),
  setEmbeddingLoaded: (loaded) => set({ isEmbeddingLoaded: loaded }),
  updateNodeAttribute: (nodeId, key, value) => set((state) => {
    state.graph.setNodeAttribute(nodeId, key, value);
    return { graph: state.graph, version: state.version + 1 };
  }),
  refresh: () => set((state) => ({ version: state.version + 1 }))
}));