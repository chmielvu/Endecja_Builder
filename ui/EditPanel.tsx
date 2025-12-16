import React, { useState } from 'react';
import { useGraphStore } from '../state/graphStore';
import { NodeType, Jurisdiction, NodeAttributes, Provenance } from '../types';
import { ProvenanceBadge } from './ProvenanceBadge';
import { X, Save, Trash2, Plus, Edit } from 'lucide-react';

export const EditPanel: React.FC = () => {
  const { graph, selectedNode, selectNode, version } = useGraphStore();
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');

  if (mode === 'create') {
    return (
        <div className="w-80 bg-endecja-paper border-2 border-endecja-gold p-4 shadow-xl rounded-sm font-serif">
            <NodeCreator onSave={() => setMode('view')} />
        </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="w-80 bg-endecja-paper border-2 border-endecja-gold p-4 rounded shadow-xl">
        <button 
          onClick={() => setMode('create')}
          className="w-full flex items-center justify-center gap-2 bg-endecja-gold text-endecja-base p-3 rounded font-serif font-bold hover:bg-endecja-light hover:text-endecja-ink transition-colors"
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
    <div className="w-80 bg-endecja-paper border-2 border-endecja-gold shadow-xl rounded-sm font-serif max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-endecja-gold/20 flex justify-between items-start bg-endecja-ink/5">
        <div>
           {mode === 'view' && <h2 className="text-xl font-bold text-endecja-ink leading-tight">{attrs.label}</h2>}
           {mode === 'edit' && <span className="font-bold text-endecja-gold">Editing Node</span>}
        </div>
        <button onClick={() => selectNode(null)} className="text-endecja-gold hover:text-endecja-gold">
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
        <div className="mt-6 pt-4 border-t border-endecja-gold">
            <EdgeManager nodeId={selectedNode} />
        </div>
      </div>
    </div>
  );
};

// ... Subcomponents kept intact but ensured they are exported or defined within scope
// For brevity in the diff, I will re-include the full subcomponents to avoid errors.

const ViewMode: React.FC<{attrs: NodeAttributes, onEdit: () => void, nodeId: string}> = ({ attrs, onEdit, nodeId }) => {
  const { graph } = useGraphStore();
  return (
    <div className="space-y-4">
       <div className="text-sm">
          <span className="text-endecja-gold italic">{attrs.category} | {attrs.jurisdiction}</span>
       </div>
       <div className="text-sm">
          <span className="font-bold">Active: </span>
          {attrs.valid_time.start} - {attrs.valid_time.end}
       </div>
       
       <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-white/50 border border-endecja-gold/10 rounded">
            <div className="text-xs text-gray-500 uppercase">Degree</div>
            <div className="font-bold text-lg">{graph.degree(nodeId)}</div>
          </div>
          <div className="p-2 bg-white/50 border border-endecja-gold/10 rounded">
            <div className="text-xs text-gray-500 uppercase">Secrecy</div>
            <div className="font-bold text-lg">Lvl {attrs.secrecy_level}</div>
          </div>
       </div>

       <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase text-endecja-gold">Provenance</h3>
          {attrs.provenance && attrs.provenance.length > 0 ? (
            attrs.provenance.map((p, i) => <ProvenanceBadge key={i} provenance={p} />)
          ) : (
             <div className="text-xs italic text-gray-500">No provenance information.</div>
          )}
       </div>

       <button 
         onClick={onEdit}
         className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-endecja-gold text-endecja-ink hover:bg-endecja-gold/10 rounded text-sm transition-colors mt-2"
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
      category: attrs.category,
      jurisdiction: attrs.jurisdiction,
      start: attrs.valid_time.start,
      end: attrs.valid_time.end,
      secrecy: attrs.secrecy_level
  });

  const handleSave = () => {
    graph.mergeNodeAttributes(nodeId, {
        label: formData.label,
        category: formData.category,
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
            <label className="block text-xs font-bold text-endecja-gold">Label</label>
            <input className="w-full p-1 border rounded bg-white text-endecja-ink focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-xs font-bold text-endecja-gold">Category</label>
                <select className="w-full p-1 border rounded bg-white text-endecja-ink focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as NodeType})}>
                    {Object.values(NodeType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
             <div>
                <label className="block text-xs font-bold text-endecja-gold">Jurisdiction</label>
                <select className="w-full p-1 border rounded bg-white text-endecja-ink focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold" value={formData.jurisdiction} onChange={e => setFormData({...formData, jurisdiction: e.target.value as Jurisdiction})}>
                    {Object.values(Jurisdiction).map(j => <option key={j} value={j}>{j}</option>)}
                </select>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-xs font-bold text-endecja-gold">Start</label>
                <input type="number" className="w-full p-1 border rounded bg-white text-endecja-ink focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold" value={formData.start} onChange={e => setFormData({...formData, start: parseInt(e.target.value)})} />
            </div>
             <div>
                <label className="block text-xs font-bold text-endecja-gold">End</label>
                <input type="number" className="w-full p-1 border rounded bg-white text-endecja-ink focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold" value={formData.end} onChange={e => setFormData({...formData, end: parseInt(e.target.value)})} />
            </div>
        </div>
        <div>
            <label className="block text-xs font-bold text-endecja-gold">Secrecy (1-5)</label>
            <input type="range" min="1" max="5" className="w-full accent-endecja-gold" value={formData.secrecy} onChange={e => setFormData({...formData, secrecy: parseInt(e.target.value)})} />
        </div>
        
        <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="flex-1 bg-endecja-ink text-white p-2 rounded flex justify-center items-center gap-1 hover:bg-black"><Save size={14}/> Save</button>
            <button onClick={handleDelete} className="bg-red-100 text-red-800 p-2 rounded border border-red-200 hover:bg-red-200"><Trash2 size={14}/></button>
        </div>
    </div>
  );
};

const NodeCreator: React.FC<{onSave: () => void}> = ({ onSave }) => {
  const { graph, refresh } = useGraphStore();
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<NodeType>(NodeType.PERSON);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(Jurisdiction.KONGRESOWKA);
  const [startYear, setStartYear] = useState(1900);
  const [endYear, setEndYear] = useState(1939);
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    const id = `node_${Date.now()}`;
    const x = Math.random() * 20 - 10;
    const y = Math.random() * 20 - 10;
    
    graph.addNode(id, {
      label,
      category,
      jurisdiction,
      valid_time: { start: startYear, end: endYear },
      x: x,
      y: y,
      size: 15,
      color: category === NodeType.PERSON ? '#2c241b' : '#8b0000',
      financial_weight: 0.5,
      secrecy_level: 1,
      provenance: [{
        source: 'Manual Entry',
        confidence: 1.0,
        method: 'archival',
        sourceClassification: 'primary',
        timestamp: Date.now()
      }]
    });
    refresh();
    onSave();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 border-b border-endecja-gold/20 pb-2">
         <h3 className="text-lg font-bold text-endecja-ink">Create New Node</h3>
         <button onClick={onSave} className="text-endecja-ink hover:text-endecja-gold"><X size={20}/></button>
      </div>
      
      <div className="space-y-3 text-sm">
          <input 
            type="text" 
            placeholder="Label (e.g., 'Jan Kowalski')"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full p-2 border border-endecja-gold/50 rounded bg-white text-endecja-ink placeholder-endecja-light focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold"
          />

          <select 
            value={category} 
            onChange={e => setCategory(e.target.value as NodeType)}
            className="w-full p-2 border border-endecja-gold/50 rounded bg-white text-endecja-ink focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold"
          >
            {Object.values(NodeType).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select 
            value={jurisdiction} 
            onChange={e => setJurisdiction(e.target.value as Jurisdiction)}
            className="w-full p-2 border border-endecja-gold/50 rounded bg-white text-endecja-ink focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold"
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
              className="w-1/2 p-2 border border-endecja-gold/50 rounded bg-white text-endecja-ink placeholder-endecja-light focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold"
            />
            <input 
              type="number" 
              placeholder="End"
              value={endYear}
              onChange={e => setEndYear(parseInt(e.target.value))}
              className="w-1/2 p-2 border border-endecja-gold/50 rounded bg-white text-endecja-ink placeholder-endecja-light focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold"
            />
          </div>

          <textarea 
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-2 border border-endecja-gold/50 rounded h-20 bg-white text-endecja-ink placeholder-endecja-light focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold"
          />

          <button 
            onClick={handleCreate}
            disabled={!label}
            className="w-full bg-endecja-gold text-endecja-base p-3 rounded font-bold disabled:opacity-50 hover:bg-endecja-light hover:text-endecja-ink transition-colors"
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
  const [relationshipType, setRelationshipType] = useState('');

  const allNodes = graph.nodes().filter(n => n !== nodeId);

  const handleAddEdge = () => {
    if (!targetId || !relationshipType) return;

    graph.addEdge(nodeId, targetId, {
      relationshipType: relationshipType,
      weight: 1,
      sign: 1,
      valid_time: { start: 1900, end: 1939 },
      is_hypothetical: false,
      provenance: [{
        source: 'Manual Entry',
        confidence: 1.0,
        method: 'archival',
        sourceClassification: 'primary',
        timestamp: Date.now()
      }]
    });
    refresh();
    setTargetId('');
    setRelationshipType('');
  };
  
  const handleDropEdge = (edgeId: string) => {
    graph.dropEdge(edgeId);
    refresh();
  };

  const renderEdges = (edgeIds: string[], direction: 'in' | 'out') => {
      return edgeIds.map(edgeId => {
          const otherNodeId = direction === 'out' ? graph.target(edgeId) : graph.source(edgeId);
          const otherNodeLabel = graph.getNodeAttribute(otherNodeId, 'label');
          const relType = graph.getEdgeAttribute(edgeId, 'relationshipType');
          
          const relationshipDisplay = direction === 'out' 
              ? <><span className="text-endecja-gold">{relType}</span> → {otherNodeLabel}</>
              : <>{otherNodeLabel} → <span className="text-endecja-gold">{relType}</span></>;

          return (
              <div key={edgeId} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-endecja-gold/10">
                  <span>{relationshipDisplay}</span>
                  <button 
                      onClick={() => handleDropEdge(edgeId)}
                      className="text-red-600 hover:text-red-800"
                  >
                      <X size={12} />
                  </button>
              </div>
          );
      });
  };

  return (
    <div>
      <h4 className="font-bold mb-2 text-sm text-endecja-ink">Outgoing Connections ({graph.outDegree(nodeId)})</h4>
      
      <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
        {renderEdges(graph.outEdges(nodeId), 'out')}
        {graph.outDegree(nodeId) === 0 && <span className="text-xs text-gray-400 italic">No outgoing connections.</span>}
      </div>

      <h4 className="font-bold mb-2 text-sm text-endecja-ink">Incoming Connections ({graph.inDegree(nodeId)})</h4>
      
      <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
        {renderEdges(graph.inEdges(nodeId), 'in')}
        {graph.inDegree(nodeId) === 0 && <span className="text-xs text-gray-400 italic">No incoming connections.</span>}
      </div>

      <div className="space-y-2 bg-endecja-gold/5 p-2 rounded">
        <select 
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          className="w-full p-1.5 border border-endecja-gold/30 rounded text-xs bg-white text-endecja-ink focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold"
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
          value={relationshipType}
          onChange={e => setRelationshipType(e.target.value)}
          className="w-full p-1.5 border border-endecja-gold/30 rounded text-xs bg-white text-endecja-ink placeholder-endecja-light focus:ring-1 focus:ring-endecja-gold focus:border-endecja-gold"
        />

        <button 
          onClick={handleAddEdge}
          disabled={!targetId || !relationshipType}
          className="w-full bg-endecja-ink text-white p-1.5 rounded text-xs disabled:opacity-50 hover:bg-black transition-colors"
        >
          + Connect
        </button>
      </div>
    </div>
  );
};
