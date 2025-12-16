import React from 'react';

export const MieczykLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 100 120" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* The Szczerbiec (Sword) */}
    <path 
      d="M48 10 H52 V30 H65 V34 H52 V110 L50 115 L48 110 V34 H35 V30 H48 V10 Z" 
      fill="#d4af37" /* Gold Hilt/Blade */
      stroke="#1b2d21" 
      strokeWidth="2"
    />
    <rect x="46" y="5" width="8" height="6" fill="#d4af37" stroke="#1b2d21" strokeWidth="2"/>
    
    {/* The Ribbon (White/Red represented as bands) */}
    <path 
      d="M30 50 L70 40 L70 55 L30 65 Z" 
      fill="#dc2626" /* Red Band */
      opacity="0.9"
    />
    <path 
      d="M30 70 L70 60 L70 75 L30 85 Z" 
      fill="#f8fafc" /* White Band */
      stroke="#1b2d21"
      strokeWidth="1"
      opacity="0.9"
    />
    <path 
      d="M30 90 L70 80 L70 95 L30 105 Z" 
      fill="#dc2626" /* Red Band */
      opacity="0.9"
    />
  </svg>
);