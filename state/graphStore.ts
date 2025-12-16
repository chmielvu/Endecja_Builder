
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes, NodeType, Jurisdiction, AppMode } from '../types';
import { fromJSON, toJSON } from '../graph/hydrate';
import { notify } from '../lib/utils';

const SNAPSHOT_STORAGE_KEY = 'endecja_snapshots';
const BUILDER_DRAFT_KEY = 'endecja-builder-draft';
const MODE_KEY = 'endecja-app-mode';
const MAX_HISTORY = 50;

interface Snapshot {
  name: string;
  date: string;
  graphJSON: string;
}

interface GraphState {
  // Data
  graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
  version: number;
  selectedNode: string | null;
  selectedEdge: string | null; // NEW
  hoveredNode: string | null;
  timeFilter: number;
  isLoading: boolean;
  loadingStatus: string;
  frustrationIndex: number | null;
  isEmbeddingLoaded: boolean;
  snapshots: Snapshot[];
  
  // Mode Management
  mode: AppMode;
  builderDraft: string | null;

  // History State
  history: string[];
  historyIndex: number;
  
  // Actions
  setGraph: (graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void; // NEW
  setHoveredNode: (nodeId: string | null) => void;
  setTimeFilter: (year: number) => void;
  setLoading: (loading: boolean, status?: string) => void;
  setFrustrationIndex: (index: number | null) => void;
  setEmbeddingLoaded: (loaded: boolean) => void;

  // Mutations (History Aware)
  addNodeMinimal: (category: NodeType, x: number, y: number, label?: string) => string; // Updated return type
  deleteNode: (nodeId: string) => void;
  updateNodeAttribute: (nodeId: string, key: keyof NodeAttributes, value: any) => void; // NEW
  updateEdgeAttribute: (edgeId: string, key: keyof EdgeAttributes, value: any) => void; // NEW
  
  // History Actions
  pushHistory: () => void; // NEW
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Persistence
  addSnapshot: (name: string) => void;
  loadSnapshot: (graphJSON: string) => void;
  deleteSnapshot: (name: string) => void;
  loadSnapshotsFromStorage: () => void;
  refresh: () => void;

  // Mode Actions
  setMode: (mode: AppMode) => void;
  saveBuilderDraft: () => void;
  loadBuilderDraft: () => void;
}

export const useGraphStore = create<GraphState>()(
  devtools((set, get) => ({
    graph: new MultiDirectedGraph(),
    version: 0,
    selectedNode: null,
    selectedEdge: null,
    hoveredNode: null,
    timeFilter: 1918,
    isLoading: false,
    loadingStatus: '',
    frustrationIndex: null,
    isEmbeddingLoaded: false,
    snapshots: [],
    
    mode: (typeof window !== 'undefined' ? localStorage.getItem(MODE_KEY) as AppMode : null) || 'analysis',
    builderDraft: typeof window !== 'undefined' ? localStorage.getItem(BUILDER_DRAFT_KEY) : null,
    
    history: [],
    historyIndex: -1,

    // Helper: Push current state to history
    pushHistory: () => {
      const { graph, history, historyIndex } = get();
      const json = toJSON(graph);
      
      // Truncate future if in middle of history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(json);
      
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      
      set({ 
        history: newHistory, 
        historyIndex: newHistory.length - 1 
      });
    },

    setGraph: (graph) => {
      set({ graph, version: get().version + 1, selectedNode: null, selectedEdge: null });
      // Reset history for new graph
      const json = toJSON(graph);
      set({ history: [json], historyIndex: 0 });
    },

    selectNode: (nodeId) => set({ selectedNode: nodeId, selectedEdge: null }),
    selectEdge: (edgeId) => set({ selectedEdge: edgeId, selectedNode: null }),
    setHoveredNode: (nodeId) => set({ hoveredNode: nodeId }),
    setTimeFilter: (year) => set({ timeFilter: year }),
    setLoading: (loading, status = '') => set({ isLoading: loading, loadingStatus: status }),
    setFrustrationIndex: (index) => set({ frustrationIndex: index }),
    setEmbeddingLoaded: (loaded) => set({ isEmbeddingLoaded: loaded }),
    refresh: () => set(s => ({ version: s.version + 1 })),

    addNodeMinimal: (category, x, y, label) => {
      const { graph, timeFilter } = get();
      const id = label 
        ? `${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString().slice(-4)}`
        : `node_${Date.now()}`;

      try {
        graph.addNode(id, {
          label: label || `New ${category}`,
          category, 
          x,
          y,
          size: 10,
          color: '#3d5c45',
          valid_time: { start: timeFilter, end: 1939 },
          jurisdiction: Jurisdiction.OTHER,
          financial_weight: 0,
          secrecy_level: 1,
          images: [],
          provenance: [{ 
            source: 'Manual User Input', 
            confidence: 1.0, 
            method: 'archival', 
            sourceClassification: 'primary', 
            timestamp: Date.now() 
          }],
        });

        set({ version: get().version + 1, selectedNode: id });
        get().pushHistory();
        notify.success('Node created');
        return id;
      } catch (e) {
        console.error(e);
        notify.error('Failed to create node');
        return '';
      }
    },

    updateNodeAttribute: (nodeId, key, value) => {
      const { graph } = get();
      if (!graph.hasNode(nodeId)) return;
      graph.setNodeAttribute(nodeId, key, value);
      set({ version: get().version + 1 });
      get().pushHistory();
    },

    updateEdgeAttribute: (edgeId, key, value) => {
      const { graph } = get();
      if (!graph.hasEdge(edgeId)) return;
      graph.setEdgeAttribute(edgeId, key, value);
      set({ version: get().version + 1 });
      get().pushHistory();
    },

    deleteNode: (nodeId) => {
      const { graph } = get();
      if (!graph.hasNode(nodeId)) return;

      try {
        graph.dropNode(nodeId);
        set({ version: get().version + 1, selectedNode: null });
        get().pushHistory();
        notify.success('Node deleted');
      } catch (e) {
        notify.error('Failed to delete node');
      }
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        const prevJSON = history[historyIndex - 1];
        try {
          const restoredGraph = fromJSON(prevJSON);
          set({ 
            graph: restoredGraph, 
            version: get().version + 1,
            historyIndex: historyIndex - 1,
            selectedNode: null,
            selectedEdge: null
          });
          notify.info('Undone');
        } catch (e) {
          notify.error('Undo failed');
        }
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const nextJSON = history[historyIndex + 1];
        try {
          const restoredGraph = fromJSON(nextJSON);
          set({ 
            graph: restoredGraph, 
            version: get().version + 1,
            historyIndex: historyIndex + 1,
            selectedNode: null,
            selectedEdge: null
          });
          notify.info('Redone');
        } catch (e) {
          notify.error('Redo failed');
        }
      }
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    addSnapshot: (name) => {
      const { graph, snapshots } = get();
      const newSnapshot: Snapshot = {
        name,
        date: new Date().toISOString(),
        graphJSON: toJSON(graph),
      };
      const updated = [...snapshots, newSnapshot];
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updated));
      set({ snapshots: updated });
      notify.success('Snapshot saved');
    },

    loadSnapshot: (graphJSON) => {
      try {
        const newGraph = fromJSON(graphJSON);
        set({ 
          graph: newGraph, 
          version: get().version + 1, 
          selectedNode: null, 
          selectedEdge: null 
        });
        
        // Reset history
        const json = toJSON(newGraph);
        set({ history: [json], historyIndex: 0 });
        
        notify.success('Snapshot loaded');
      } catch (e) {
        notify.error('Failed to load snapshot');
      }
    },

    deleteSnapshot: (name) => {
      const updated = get().snapshots.filter(s => s.name !== name);
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updated));
      set({ snapshots: updated });
    },

    loadSnapshotsFromStorage: () => {
      const stored = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (stored) {
        try {
          set({ snapshots: JSON.parse(stored) });
        } catch {
          set({ snapshots: [] });
        }
      }
    },

    setMode: (mode) => {
      localStorage.setItem(MODE_KEY, mode);
      set({ mode, selectedNode: null, selectedEdge: null });
    },

    saveBuilderDraft: () => {
      const { graph } = get();
      const draft = toJSON(graph);
      localStorage.setItem(BUILDER_DRAFT_KEY, draft);
      set({ builderDraft: draft });
      notify.success('Draft saved');
    },

    loadBuilderDraft: () => {
      const draft = get().builderDraft;
      if (draft) {
        try {
          const graph = fromJSON(draft);
          set({
            graph,
            version: get().version + 1,
            selectedNode: null,
            selectedEdge: null
          });
          const json = toJSON(graph);
          set({ history: [json], historyIndex: 0 });
          notify.success('Draft loaded');
        } catch (e) {
          console.error("Failed to load builder draft", e);
          notify.error('Failed to load draft');
        }
      }
    },
  }))
);

// Auto-save hook equivalent logic (can be used in a component or effect)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useGraphStore.getState();
    if (state.mode === 'builder') {
      const draft = toJSON(state.graph);
      localStorage.setItem(BUILDER_DRAFT_KEY, draft);
    }
  }, 30000);
}
