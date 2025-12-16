import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, PublicGraphExport } from '../types';

/**
 * Export graph as public-ready JSON with full metadata and images
 */
export function exportPublicGraph(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>) {
  const exportData: PublicGraphExport = {
    version: '1.0',
    title: 'Endecja Historical Knowledge Graph',
    description: 'Curated historical network of Polish National Democracy movement',
    creator: 'Visual Builder',
    exportDate: new Date().toISOString(),
    graph: {
      nodes: graph.nodes().map(nodeId => {
        const attrs = graph.getNodeAttributes(nodeId);
        return {
          id: nodeId,
          label: attrs.label,
          type: attrs.category,
          descriptionHtml: attrs.descriptionHtml || attrs.description || '',
          images: attrs.images || [],
          jurisdiction: attrs.jurisdiction,
          timeRange: attrs.valid_time,
          position: {
            x: attrs.x || 0,
            y: attrs.y || 0,
          },
          size: attrs.size || 10,
          color: attrs.color || '#3d5c45',
        };
      }),
      edges: graph.edges().map(edgeId => {
        const attrs = graph.getEdgeAttributes(edgeId);
        return {
          id: edgeId,
          source: graph.source(edgeId),
          target: graph.target(edgeId),
          relationshipType: attrs.relationshipType,
          sign: attrs.sign,
          descriptionText: attrs.descriptionText,
          color: attrs.color,
        };
      }),
    },
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `endecja-public-${new Date().toISOString().split('T')[0]}.graphjson`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export as self-contained static HTML viewer
 */
export function exportStaticViewer(graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes>) {
  const graphData = JSON.stringify(graph.export());
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Endecja Knowledge Graph - Interactive Viewer</title>
  <script src="https://cdn.jsdelivr.net/npm/graphology@0.25.4/dist/graphology.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sigma@3.0.0-beta.19/build/sigma.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Georgia', serif; 
      background: #f0fdf4; 
      overflow: hidden; 
    }
    #container { 
      width: 100vw; 
      height: 100vh; 
      position: relative; 
    }
    #info-panel {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 350px;
      max-height: 80vh;
      background: white;
      border: 3px solid #d4af37;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      overflow-y: auto;
      display: none;
      z-index: 1000;
    }
    #info-panel.visible { display: block; }
    #info-header {
      background: linear-gradient(135deg, #1b2d21, #3d5c45);
      color: #d4af37;
      padding: 16px;
      font-size: 18px;
      font-weight: bold;
      border-bottom: 2px solid #d4af37;
    }
    #info-content {
      padding: 16px;
      font-size: 14px;
      line-height: 1.6;
    }
    .info-label {
      color: #d4af37;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11px;
      margin-top: 12px;
      margin-bottom: 4px;
    }
    .info-value {
      color: #2c241b;
    }
    .image-gallery {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 8px;
    }
    .image-gallery img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: 4px;
      border: 2px solid #d4af37;
    }
    #close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: #d4af37;
      color: #1b2d21;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
    }
    #close-btn:hover { background: #b59230; }
    #title {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(27, 45, 33, 0.95);
      color: #d4af37;
      padding: 16px 24px;
      border: 2px solid #d4af37;
      border-radius: 8px;
      font-size: 24px;
      font-weight: bold;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="title">Endecja Knowledge Graph</div>
  <div id="container"></div>
  <div id="info-panel">
    <button id="close-btn">×</button>
    <div id="info-header"></div>
    <div id="info-content"></div>
  </div>
  <script>
    const graphData = ${graphData};
    const graph = new graphology.MultiDirectedGraph();
    graph.import(graphData);
    
    const container = document.getElementById('container');
    const infoPanel = document.getElementById('info-panel');
    const infoHeader = document.getElementById('info-header');
    const infoContent = document.getElementById('info-content');
    const closeBtn = document.getElementById('close-btn');

    const renderer = new Sigma(graph, container, {
      renderEdgeLabels: true,
      renderLabels: true,
      defaultNodeColor: '#3d5c45',
      defaultEdgeColor: '#9ca3af',
      labelColor: { color: '#1b2d21' },
      labelFont: 'Georgia, serif',
    });

    renderer.on('clickNode', ({ node }) => {
      const attrs = graph.getNodeAttributes(node);
      infoHeader.textContent = attrs.label;
      
      let content = '';
      if (attrs.category) {
        content += \`<div class="info-label">Type</div>\`;
        content += \`<div class="info-value">\${attrs.category}</div>\`;
      }
      if (attrs.descriptionHtml || attrs.description) {
        content += \`<div class="info-label">Description</div>\`;
        content += \`<div class="info-value">\${attrs.descriptionHtml || attrs.description}</div>\`;
      }
      if (attrs.valid_time) {
        content += \`<div class="info-label">Time Period</div>\`;
        content += \`<div class="info-value">\${attrs.valid_time.start} - \${attrs.valid_time.end}</div>\`;
      }
      if (attrs.images && attrs.images.length > 0) {
        content += \`<div class="info-label">Images</div>\`;
        content += \`<div class="image-gallery">\`;
        attrs.images.forEach(img => {
          content += \`<img src="\${img.dataUrl}" alt="\${img.alt || ''}" title="\${img.caption || ''}">\`;
        });
        content += \`</div>\`;
      }
      
      infoContent.innerHTML = content;
      infoPanel.classList.add('visible');
    });

    closeBtn.onclick = () => {
      infoPanel.classList.remove('visible');
    };
    
    renderer.on('clickStage', () => {
      infoPanel.classList.remove('visible');
    });
  </script>
</body>
</html>`;

  const blob = new Blob([htmlTemplate], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `endecja-viewer-${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  URL.revokeObjectURL(url);
}