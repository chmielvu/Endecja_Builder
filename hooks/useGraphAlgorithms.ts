import { useCallback } from 'react';
import { useGraphStore } from '../state/graphStore';
import { embeddingService, searchByEmbedding } from '../ml/embeddings';
import { notify } from '../lib/utils';

// Import workers using strict relative paths for compatibility
import LayoutFA2Worker from '../workers/layoutFA2.worker.ts?worker';
import LouvainWorker from '../workers/louvain.worker.ts?worker';
import CentralityWorker from '../workers/centrality.worker.ts?worker';
import SbtWorker from '../workers/sbt.worker.ts?worker';

export const useGraphAlgorithms = () => {
  const { 
    graph, 
    setLoading, 
    refresh, 
    setFrustrationIndex, 
    setEmbeddingLoaded,
  } = useGraphStore();

  const runLayout = useCallback(() => {
    setLoading(true, 'Structuring Graph (ForceAtlas2)...');
    // @ts-ignore
    const worker = new LayoutFA2Worker({ type: 'module' });
    worker.postMessage({ graphData: graph.export(), iterations: 500 });
    worker.onmessage = (e: MessageEvent) => {
      const { positions } = e.data;
      Object.entries(positions).forEach(([key, pos]: [string, any]) => {
        if (graph.hasNode(key)) {
          graph.setNodeAttribute(key, 'x', pos.x);
          graph.setNodeAttribute(key, 'y', pos.y);
        }
      });
      worker.terminate();
      refresh();
      setLoading(false);
    };
    worker.onerror = (e) => {
      console.error(e);
      setLoading(false);
      notify.error("Layout calculation failed");
    };
  }, [graph, setLoading, refresh]);

  const detectCommunities = useCallback(() => {
    setLoading(true, 'Detecting Factions (Louvain)...');
    // @ts-ignore
    const worker = new LouvainWorker({ type: 'module' });
    worker.postMessage({ graphData: graph.export() });
    worker.onmessage = (e: MessageEvent) => {
      const { communities } = e.data;
      const PALETTE = ['#3d5c45', '#1b2d21', '#d4af37', '#991b1b', '#0f172a', '#4a6741', '#704214'];
      graph.forEachNode((node) => {
          const commId = communities[node];
          if (commId !== undefined) {
             graph.setNodeAttribute(node, 'community', commId);
             graph.setNodeAttribute(node, 'color', PALETTE[commId % PALETTE.length]);
          }
      });
      refresh();
      worker.terminate();
      setLoading(false);
      notify.success("Communities detected");
    };
  }, [graph, setLoading, refresh]);

  const measureInfluence = useCallback(() => {
    setLoading(true, 'Measuring Influence (Centrality)...');
    // @ts-ignore
    const worker = new CentralityWorker({ type: 'module' });
    worker.postMessage({ graphData: graph.export() });
    worker.onmessage = (e: MessageEvent) => {
      const { scores } = e.data;
      const maxScore = Math.max(...(Object.values(scores) as number[]));
      
      Object.entries(scores).forEach(([nodeId, score]) => {
        if (graph.hasNode(nodeId)) {
          const norm = (score as number) / (maxScore || 1);
          graph.setNodeAttribute(nodeId, 'size', 5 + norm * 25);
          graph.setNodeAttribute(nodeId, 'betweenness', score as number);
        }
      });
      
      refresh();
      worker.terminate();
      setLoading(false);
      notify.success("Influence metrics updated");
    };
  }, [graph, setLoading, refresh]);

  const calculateFrustration = useCallback(() => {
    setLoading(true, 'Analyzing Tensions (SBT)...');
    // @ts-ignore
    const worker = new SbtWorker({ type: 'module' });
    worker.postMessage({ graphData: graph.export() });
    worker.onmessage = (e: MessageEvent) => {
      setFrustrationIndex(e.data.frustrationIndex);
      worker.terminate();
      setLoading(false);
    };
  }, [graph, setLoading, setFrustrationIndex]);

  const computeEmbeddings = useCallback(async () => {
    setLoading(true, 'Loading Transformers...');
    try {
      const loadResult = await embeddingService.load();
      if (loadResult.mockMode) {
        notify.info("Operating in mock embedding mode (Model unavailable)");
      }
      setLoading(true, 'Embedding Graph Nodes...');
      await embeddingService.embedNodes(graph);
      setEmbeddingLoaded(true);
      setLoading(false);
      notify.success("Graph embeddings computed");
    } catch (e) {
      console.error(e);
      notify.error('Failed to compute embeddings');
      setLoading(false);
      setEmbeddingLoaded(false);
    }
  }, [graph, setLoading, setEmbeddingLoaded]);

  const semanticSearch = useCallback(async (query: string, localIsEmbeddingLoaded: boolean) => {
    if (!query.trim()) return [];
    if (!localIsEmbeddingLoaded) {
        notify.info("Please load ML models first");
        return [];
    }
    setLoading(true, 'Searching...');
    try {
        const results = await searchByEmbedding(query, graph);
        setLoading(false);
        return results;
    } catch (e) {
        console.error(e);
        notify.error('Semantic search failed');
        setLoading(false);
        return [];
    }
  }, [graph, setLoading]);

  return {
    runLayout,
    detectCommunities,
    measureInfluence,
    calculateFrustration,
    computeEmbeddings,
    semanticSearch
  };
};