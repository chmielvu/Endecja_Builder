import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../state/graphStore';
import { X, Save, Upload, Trash2 } from 'lucide-react';

export const SnapshotManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { snapshots, addSnapshot, loadSnapshot, deleteSnapshot, loadSnapshotsFromStorage } = useGraphStore();
  const [newSnapshotName, setNewSnapshotName] = useState('');

  useEffect(() => {
    loadSnapshotsFromStorage();
  }, [loadSnapshotsFromStorage]);

  const handleCreateSnapshot = () => {
    if (!newSnapshotName.trim()) {
      alert('Please provide a name for the snapshot.');
      return;
    }
    if (snapshots.some(s => s.name === newSnapshotName.trim())) {
      alert('A snapshot with this name already exists.');
      return;
    }
    addSnapshot(newSnapshotName.trim());
    setNewSnapshotName('');
  };

  const handleLoadSnapshot = (snapshotJSON: string) => {
    if (confirm('Loading a snapshot will overwrite the current graph. Are you sure?')) {
      loadSnapshot(snapshotJSON);
      onClose();
    }
  };

  const handleDeleteSnapshot = (name: string) => {
    if (confirm(`Are you sure you want to delete the snapshot "${name}"? This cannot be undone.`)) {
      deleteSnapshot(name);
    }
  };

  return (
    <div className="fixed inset-0 bg-endecja-base/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-endecja-paper border-2 border-endecja-gold p-6 rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col text-endecja-ink font-serif">
        <div className="flex justify-between items-center mb-4 border-b border-endecja-gold/20 pb-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Save className="text-endecja-gold" />
            Snapshot Manager
          </h2>
          <button onClick={onClose} className="hover:text-endecja-gold"><X size={24} /></button>
        </div>
        
        <div className="bg-white/50 p-4 rounded border border-endecja-gold/20 mb-4">
          <label htmlFor="snapshot-name" className="text-xs font-bold uppercase text-endecja-gold">New Snapshot Name</label>
          <div className="flex gap-2 mt-1">
            <input
              id="snapshot-name"
              type="text"
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              placeholder={`e.g., "Pre-WWI Analysis"`}
              className="flex-grow p-2 text-sm border border-endecja-gold/30 rounded bg-white text-endecja-ink focus:border-endecja-gold outline-none"
            />
            <button
              onClick={handleCreateSnapshot}
              className="px-4 py-2 bg-endecja-base text-endecja-gold rounded text-sm hover:bg-endecja-light font-bold"
            >
              Create
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {snapshots.length === 0 ? (
            <div className="text-center text-gray-500 italic py-8">No snapshots saved yet.</div>
          ) : (
            snapshots.map(snapshot => (
              <div key={snapshot.name} className="bg-white p-3 rounded border border-endecja-gold/10 flex justify-between items-center group">
                <div>
                  <div className="font-bold text-endecja-ink">{snapshot.name}</div>
                  <div className="text-xs text-gray-500 font-sans">
                    Saved on {new Date(snapshot.date).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleLoadSnapshot(snapshot.graphJSON)}
                    title="Load Snapshot"
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Upload size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSnapshot(snapshot.name)}
                    title="Delete Snapshot"
                    className="p-2 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-endecja-gold/20 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-endecja-base text-endecja-gold rounded text-sm hover:bg-endecja-light"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
