import React, { useEffect, useRef } from 'react';
import { NodeType } from '../types';
import { X } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onCreateNode: (category: NodeType) => void;
}

export const ContextMenu: React.FC<Props> = ({ x, y, onClose, onCreateNode }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute bg-archival-paper border-2 border-archival-sepia shadow-xl rounded-sm p-2 flex flex-col gap-1 z-50 font-serif text-sm"
      style={{ left: x, top: y }}
      role="menu"
      aria-orientation="vertical"
    >
      <div className="flex justify-between items-center pb-1 border-b border-archival-sepia/20 mb-1">
        <span className="font-bold text-archival-ink">Add Node</span>
        <button onClick={onClose} className="text-archival-sepia hover:text-archival-accent" aria-label="Close menu">
          <X size={16} />
        </button>
      </div>
      {Object.values(NodeType).map((type) => (
        <button
          key={type}
          onClick={() => onCreateNode(type)}
          className="px-3 py-1 text-left hover:bg-archival-faint rounded text-archival-ink capitalize"
          role="menuitem"
        >
          {type}
        </button>
      ))}
    </div>
  );
};