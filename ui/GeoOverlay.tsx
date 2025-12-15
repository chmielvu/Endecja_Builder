import React, { useEffect, useRef, useState } from 'react';
import Sigma from 'sigma';
import { Coordinates } from 'sigma/types';

interface Props {
  sigma: Sigma;
}

// Simplified paths for Polish Partitions (approximate shapes for visualization)
const PARTITIONS = [
  {
    id: 'kongresowka',
    label: 'Kongresówka',
    color: 'rgba(255, 0, 0, 0.05)',
    border: 'rgba(255, 0, 0, 0.2)',
    // Abstract shape coordinates (relative to graph space center ~0,0)
    path: [
      {x: 5, y: 5}, {x: 15, y: 5}, {x: 15, y: -5}, {x: 5, y: -5}
    ]
  },
  {
    id: 'galicja',
    label: 'Galicja',
    color: 'rgba(0, 0, 255, 0.05)',
    border: 'rgba(0, 0, 255, 0.2)',
    path: [
      {x: 5, y: -5}, {x: 15, y: -5}, {x: 15, y: -15}, {x: 5, y: -15}
    ]
  },
  {
    id: 'wielkopolska',
    label: 'Wielkopolska',
    color: 'rgba(0, 255, 0, 0.05)',
    border: 'rgba(0, 255, 0, 0.2)',
    path: [
      {x: -5, y: 5}, {x: 5, y: 5}, {x: 5, y: -5}, {x: -5, y: -5}
    ]
  }
];

export const GeoOverlay: React.FC<Props> = ({ sigma }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Rerender loop
  useEffect(() => {
    if (!sigma || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Resize canvas to match container
      const container = sigma.getContainer();
      if(canvas.width !== container.offsetWidth || canvas.height !== container.offsetHeight) {
          canvas.width = container.offsetWidth;
          canvas.height = container.offsetHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      PARTITIONS.forEach(part => {
        ctx.beginPath();
        part.path.forEach((pt, i) => {
          // Project graph coordinates to viewport
          const pos = sigma.graphToViewport(pt as Coordinates);
          if (i === 0) ctx.moveTo(pos.x, pos.y);
          else ctx.lineTo(pos.x, pos.y);
        });
        ctx.closePath();
        ctx.fillStyle = part.color;
        ctx.fill();
        ctx.strokeStyle = part.border;
        ctx.stroke();
        
        // Label
        const center = part.path[0]; 
        const labelPos = sigma.graphToViewport({x: center.x + 2, y: center.y - 2});
        ctx.fillStyle = part.border;
        ctx.font = '12px "Playfair Display"';
        ctx.fillText(part.label, labelPos.x, labelPos.y);
      });
    };

    // Bind to sigma events
    sigma.on('afterRender', render);
    
    // Initial render
    render();

    return () => {
      sigma.removeAllListeners('afterRender');
    };
  }, [sigma]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
};
