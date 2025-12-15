import React, { useState } from 'react';
import { useGraphStore } from '../state/graphStore';
import { NodeType, Jurisdiction, NodeAttributes } from '../types';
import { ProvenanceBadge } from './ProvenanceBadge';
import { X, Save, Trash2, Plus, Edit } from 'lucide-react';

export const EditPanel: React.FC = () => {
  const { graph, selectedNode, selectNode, version } = useGraphStore();
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');

  if (mode === 'create') {
    return <NodeCreator onSave={() => setMode('view')} />;
  }

  if (!selectedNode) {
    return (
      <div className="absolute right-4 top-4 w-80 bg-archival-paper border-2 border-archival-sepia p-4 rounded shadow-xl">
        <button 
          onClick={() => setMode('create')}
          className="w-full flex items-center justify-center gap-2 bg-archival-accent text-white p-3 rounded font-serif font-bold hover:bg-red-900 transition-colors"
        >
          <Plus size={18} /> Add New Node
        </button>
      </div>
    );
  }

  if (!graph.hasNode(selectedNode)) {
    // Handling case where selected node was deleted
    selectNode(null);
    return null;
  }

  const attrs = graph.getNodeAttributes(selectedNode);

  return (
    <div className="absolute right-4 top-4 w-80 bg-archival-paper border-2 border-archival-sepia shadow-xl rounded-sm font-serif max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-archival-sepia/20 flex justify-between items-start bg-archival-ink/5">
        <div>
           {mode === 'view' && <h2 className="text-xl font-bold text-archival-ink leading-tight">{attrs.label}</h2>}
           {mode === 'edit' && <span className="font-bold text-archival-accent">Editing Node</span>}
        </div>
        <button onClick={() => selectNode(null)} className="text-archival-sepia hover:text-archival-accent">
          <X size={20} />
        </button>
      </div>

      <div className="p-4">
        {mode === 'view' ? (
          <ViewMode attrs={attrs} onEdit={() => setMode('edit')} nodeId={selectedNode} />
        ) : (
          <EditMode 
            nodeId={selectedNode} 
            attrs={attrs} 
            onSave={() => setMode('view')} 
          />
        )}
        
        {/* Edge Management */}
        <div className="mt-6 pt-4 border-t border-archival-sepia">
            <EdgeManager nodeId={selectedNode} />
        </div>
      </div>
    </div>
  );
};

const ViewMode: React.FC<{attrs: NodeAttributes, onEdit: () => void, nodeId: string}> = ({ attrs, onEdit, nodeId }) => {
  const { graph } = useGraphStore();
  return (
    <div className="space-y-4">
       <div className="text-sm">
          <span className="text-archival-sepia italic">{attrs.type} | {attrs.jurisdiction}</span>
       </div>
       <div className="text-sm">
          <span className="font-bold">Active: </span>
          {attrs.valid_time.start} - {attrs.valid_time.end}
       </div>
       
       <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-white/50 border border-archival-sepia/10 rounded">
            <div className="text-xs text-gray-500 uppercase">Degree</div>
            <div className="font-bold text-lg">{graph.degree(nodeId)}</div>
          </div>
          <div className="p-2 bg-white/50 border border-archival-sepia/10 rounded">
            <div className="text-xs text-gray-500 uppercase">Secrecy</div>
            <div className="font-bold text-lg">Lvl {attrs.secrecy_level}</div>
          </div>
       </div>

       <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase text-archival-sepia">Provenance</h3>
          <ProvenanceBadge provenance={attrs.provenance} />
       </div>

       <button 
         onClick={onEdit}
         className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-archival-sepia text-archival-ink hover:bg-archival-paper rounded text-sm transition-colors mt-2"
       >
         <Edit size={14} /> Edit Attributes
       </button>
    </div>
  );
};

const EditMode: React.FC<{nodeId: string, attrs: NodeAttributes, onSave: () => void}> = ({ nodeId, attrs, onSave }) => {
  const { graph, refresh, selectNode } = useGraphStore();
  const [formData, setFormData] = useState({
      label: attrs.label,
      type: attrs.type,
      jurisdiction: attrs.jurisdiction,
      start: attrs.valid_time.start,
      end: attrs.valid_time.end,
      secrecy: attrs.secrecy_level
  });

  const handleSave = () => {
    graph.mergeNodeAttributes(nodeId, {
        label: formData.label,
        type: formData.type,
        jurisdiction: formData.jurisdiction,
        valid_time: { start: formData.start, end: formData.end },
        secrecy_level: formData.secrecy
    });
    refresh();
    onSave();
  };
  
  const handleDelete = () => {
    if(confirm('Are you sure you want to delete this node?')) {
        graph.dropNode(nodeId);
        selectNode(null);
        refresh();
    }
  };

  return (
    <div className="space-y-3 text-sm">
        <div>
            <label className="block text-xs font-bold text-archival-sepia">Label</label>
            <input className="w-full p-1 border rounded bg-white" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-xs font-bold text-archival-sepia">Type</label>
                <select className="w-full p-1 border rounded bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as NodeType})}>
                    {Object.values(NodeType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
             <div>
                <label className="block text-xs font-bold text-archival-sepia">Jurisdiction</label>
                <select className="w-full p-1 border rounded bg-white" value={formData.jurisdiction} onChange={e => setFormData({...formData, jurisdiction: e.target.value as Jurisdiction})}>
                    {Object.values(Jurisdiction).map(j => <option key={j} value={j}>{j}</option>)}
                </select>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-xs font-bold text-archival-sepia">Start</label>
                <input type="number" className="w-full p-1 border rounded bg-white" value={formData.start} onChange={e => setFormData({...formData, start: parseInt(e.target.value)})} />
            </div>
             <div>
                <label className="block text-xs font-bold text-archival-sepia">End</label>
                <input type="number" className="w-full p-1 border rounded bg-white" value={formData.end} onChange={e => setFormData({...formData, end: parseInt(e.target.value)})} />
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-archival-sepia">Secrecy (1-5)</label>
            <input type="range" min="1" max="5" className="w-full accent-archival-accent" value={formData.secrecy} onChange={e => setFormData({...formData, secrecy: parseInt(e.target.value)})} />
        </div>
        
        <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="flex-1 bg-archival-ink text-white p-2 rounded flex justify-center items-center gap-1 hover:bg-black"><Save size={14}/> Save</button>
            <button onClick={handleDelete} className="bg-red-100 text-red-800 p-2 rounded border border-red-200 hover:bg-red-200"><Trash2 size={14}/></button>
        </div>
    </div>
  );
};

const NodeCreator: React.FC<{onSave: () => void}> = ({ onSave }) => {
  const { graph, refresh } = useGraphStore();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<NodeType>(NodeType.PERSON);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(Jurisdiction.KONGRESOWKA);
  const [startYear, setStartYear] = useState(1900);
  const [endYear, setEndYear] = useState(1939);
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    const id = `node_${Date.now()}`;
    // Random position near center
    const x = Math.random() * 20 - 10;
    const y = Math.random() * 20 - 10;
    
    graph.addNode(id, {
      label,
      type,
      jurisdiction,
      valid_time: { start: startYear, end: endYear },
      x: x,
      y: y,
      size: 15,
      color: type === NodeType.PERSON ? '#2c241b' : '#8b0000',
      financial_weight: 0.5,
      secrecy_level: 1,
      provenance: {
        source: 'Manual Entry',
        confidence: 1.0,
        method: 'archival',
        timestamp: Date.now()
      }
    });
    refresh();
    onSave();
  };

  return (
    <div className="absolute right-4 top-4 w-80 bg-archival-paper border-2 border-archival-sepia p-4 shadow-xl rounded-sm font-serif">
      <div className="flex justify-between items-center mb-4 border-b border-archival-sepia/20 pb-2">
         <h3 className="text-lg font-bold">Create New Node</h3>
         <button onClick={onSave}><X size={20}/></button>
      </div>
      
      <div className="space-y-3 text-sm">
          <input 
            type="text" 
            placeholder="Label (e.g., 'Jan Kowalski')"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full p-2 border border-archival-sepia rounded"
          />

          <select 
            value={type} 
            onChange={e => setType(e.target.value as NodeType)}
            className="w-full p-2 border border-archival-sepia rounded"
          >
            {Object.values(NodeType).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select 
            value={jurisdiction} 
            onChange={e => setJurisdiction(e.target.value as Jurisdiction)}
            className="w-full p-2 border border-archival-sepia rounded"
          >
            {Object.values(Jurisdiction).map(j => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="Start"
              value={startYear}
              onChange={e => setStartYear(parseInt(e.target.value))}
              className="w-1/2 p-2 border border-archival-sepia rounded"
            />
            <input 
              type="number" 
              placeholder="End"
              value={endYear}
              onChange={e => setEndYear(parseInt(e.target.value))}
              className="w-1/2 p-2 border border-archival-sepia rounded"
            />
          </div>

          <textarea 
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-2 border border-archival-sepia rounded h-20"
          />

          <button 
            onClick={handleCreate}
            disabled={!label}
            className="w-full bg-archival-accent text-white p-3 rounded font-bold disabled:opacity-50"
          >
            Create Node
          </button>
      </div>
    </div>
  );
};

const EdgeManager: React.FC<{nodeId: string}> = ({ nodeId }) => {
  const { graph, refresh } = useGraphStore();
  const [targetId, setTargetId] = useState('');
  const [relationship, setRelationship] = useState('');

  const allNodes = graph.nodes().filter(n => n !== nodeId);

  const handleAddEdge = () => {
    if (!targetId || !relationship) return;

    graph.addEdge(nodeId, targetId, {
      type: relationship,
      weight: 1,
      sign: 1,
      valid_time: { start: 1900, end: 1939 },
      is_hypothetical: false,
      provenance: {
        source: 'Manual Entry',
        confidence: 1.0,
        method: 'archival',
        timestamp: Date.now()
      }
    });
    refresh();
    setTargetId('');
    setRelationship('');
  };
  
  const handleDropEdge = (edgeId: string) => {
    graph.dropEdge(edgeId);
    refresh();
  };

  return (
    <div>
      <h4 className="font-bold mb-2 text-sm text-archival-ink">Connections</h4>
      
      {/* Existing Edges */}
      <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
        {graph.outEdges(nodeId).map(edgeId => {
          const target = graph.target(edgeId);
          const targetLabel = graph.getNodeAttribute(target, 'label');
          const rel = graph.getEdgeAttribute(edgeId, 'type');
          return (
            <div key={edgeId} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-archival-sepia/10">
              <span><span className="text-archival-sepia">{rel}</span> → {targetLabel}</span>
              <button 
                onClick={() => handleDropEdge(edgeId)}
                className="text-red-600 hover:text-red-800"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        {graph.outDegree(nodeId) === 0 && <span className="text-xs text-gray-400 italic">No outgoing connections.</span>}
      </div>

      {/* Add New Edge */}
      <div className="space-y-2 bg-archival-sepia/5 p-2 rounded">
        <select 
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          className="w-full p-1.5 border border-archival-sepia/30 rounded text-xs"
        >
          <option value="">Select target...</option>
          {allNodes.map(id => (
            <option key={id} value={id}>
              {graph.getNodeAttribute(id, 'label')}
            </option>
          ))}
        </select>

        <input 
          type="text"
          placeholder="Relation (e.g., 'founded')"
          value={relationship}
          onChange={e => setRelationship(e.target.value)}
          className="w-full p-1.5 border border-archival-sepia/30 rounded text-xs"
        />

        <button 
          onClick={handleAddEdge}
          disabled={!targetId || !relationship}
          className="w-full bg-archival-ink text-white p-1.5 rounded text-xs disabled:opacity-50 hover:bg-black transition-colors"
        >
          + Connect
        </button>
      </div>
    </div>
  );
};