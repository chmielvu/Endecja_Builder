// state/graphStore.ts
import { create } from 'zustand';
import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes, NodeType, Jurisdiction } from '../types';
import { fromJSON, toJSON } from '../graph/hydrate';

interface Snapshot {
  name: string;
  date: string;
  graphJSON: string;
}

interface GraphState {
  graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
  version: number; 
  selectedNode: string | null;
  hoveredNode: string | null;
  timeFilter: number;
  isLoading: boolean;
  loadingStatus: string;
  frustrationIndex: number | null;
  isEmbeddingLoaded: boolean;
  snapshots: Snapshot[];

  setGraph: (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => void;
  selectNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setTimeFilter: (year: number) => void;
  setLoading: (loading: boolean, status?: string) => void;
  setFrustrationIndex: (index: number) => void;
  setEmbeddingLoaded: (loaded: boolean) => void;
  updateNodeAttribute: (nodeId: string, key: keyof NodeAttributes, value: any) => void;
  addNodeMinimal: (category: NodeType, x: number, y: number) => string;
  refresh: () => void;
  addSnapshot: (name: string) => void;
  loadSnapshot: (graphJSON: string) => void;
  deleteSnapshot: (name: string) => void;
  loadSnapshotsFromStorage: () => void;
}

const SNAPSHOT_STORAGE_KEY = 'endecja-graph-snapshots';

export const useGraphStore = create<GraphState>((set, get) => ({
  graph: new MultiDirectedGraph(),
  version: 0,
  selectedNode: null,
  hoveredNode: null,
  timeFilter: 1905,
  isLoading: false,
  loadingStatus: '',
  frustrationIndex: null,
  isEmbeddingLoaded: false,
  snapshots: [],

  setGraph: (graph) => set({ graph, version: 0, selectedNode: null }),
  selectNode: (nodeId) => set({ selectedNode: nodeId }),
  setHoveredNode: (nodeId) => set({ hoveredNode: nodeId }),
  setTimeFilter: (year) => set({ timeFilter: year }),
  setLoading: (loading, status) => set({ isLoading: loading, loadingStatus: status || '' }),
  setFrustrationIndex: (index) => set({ frustrationIndex: index }),
  setEmbeddingLoaded: (loaded) => set({ isEmbeddingLoaded: loaded }),
  
  updateNodeAttribute: (nodeId, key, value) => set((state) => {
    state.graph.setNodeAttribute(nodeId, key, value);
    return { version: state.version + 1 };
  }),

  addNodeMinimal: (category, x, y) => {
    const { timeFilter, graph } = get();
    const newNodeId = `node_${Date.now()}`;
    
    set((state) => {
      state.graph.addNode(newNodeId, {
        label: `Nowy ${category}`,
        category: category,
        jurisdiction: Jurisdiction.OTHER,
        // Node starts in the currently filtered year
        valid_time: { start: timeFilter, end: 1939 }, 
        x: x,
        y: y,
        size: 10,
        color: '#3d5c45',
        financial_weight: 0,
        secrecy_level: 1,
        provenance: [{
          source: 'Manualna Kreacja',
          confidence: 1.0,
          method: 'archival',
          sourceClassification: 'primary',
          timestamp: Date.now(),
        }]
      });
      return { version: state.version + 1, selectedNode: newNodeId };
    });
    return newNodeId;
  },

  refresh: () => set((state) => ({ version: state.version + 1 })),

  addSnapshot: (name) => {
    const { graph, snapshots } = get();
    const newSnapshot: Snapshot = {
      name: name,
      date: new Date().toISOString(),
      graphJSON: toJSON(graph),
    };
    const updatedSnapshots = [...snapshots, newSnapshot];
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updatedSnapshots));
    set({ snapshots: updatedSnapshots });
  },

  loadSnapshot: (graphJSON) => {
    try {
      const newGraph = fromJSON(graphJSON);
      set({ graph: newGraph, version: get().version + 1, selectedNode: null });
    } catch (e) {
      console.error("Failed to load snapshot", e);
    }
  },

  deleteSnapshot: (name) => {
    const updatedSnapshots = get().snapshots.filter(s => s.name !== name);
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updatedSnapshots));
    set({ snapshots: updatedSnapshots });
  },

  loadSnapshotsFromStorage: () => {
    const storedSnapshots = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (storedSnapshots) {
      try {
        set({ snapshots: JSON.parse(storedSnapshots) });
      } catch (e) {
        set({ snapshots: [] });
      }
    }
  }
}));