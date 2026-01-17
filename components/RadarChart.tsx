
import React from 'react';
import { Dimension } from '../types';

interface RadarChartProps {
  dimensions: Dimension[];
  showCurrent?: boolean;
  showTarget?: boolean;
  size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ 
  dimensions, 
  showCurrent = true, 
  showTarget = true,
  size = 180 
}) => {
  const center = 100;
  const radius = 80;
  const count = dimensions.length;

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (value / 10) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const currentPoints = dimensions.map((d, i) => {
    const coords = getCoordinates(i, d.currentScore);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  const targetPoints = dimensions.map((d, i) => {
    const coords = getCoordinates(i, d.targetScore);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background Grids */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
          <div 
            key={scale}
            className="absolute border border-white/50 rounded-full"
            style={{ 
              width: `${scale * 100}%`, 
              height: `${scale * 100}%`,
              top: `${(1 - scale) * 50}%`,
              left: `${(1 - scale) * 50}%`,
              borderStyle: scale === 1 ? 'solid' : 'dashed'
            }}
          />
        ))}
        {/* Radial Axis Lines */}
        {Array.from({ length: count }).map((_, i) => {
          const angle = (360 / count) * i;
          return (
            <div 
              key={i}
              className="absolute w-[1px] bg-white/30 h-1/2 left-1/2 bottom-1/2 origin-bottom"
              style={{ transform: `rotate(${angle}deg)` }}
            />
          );
        })}
      </div>

      <svg className="overflow-visible w-full h-full" viewBox="0 0 200 200">
        {showTarget && (
          <polygon 
            points={targetPoints} 
            fill="rgba(245, 158, 11, 0.05)" 
            stroke="#f59e0b" 
            strokeDasharray="4,4" 
            strokeWidth="2.5" 
          />
        )}
        {showCurrent && (
          <polygon 
            points={currentPoints} 
            fill="rgba(19, 236, 91, 0.25)" 
            stroke="#13ec5b" 
            strokeWidth="2.5" 
          />
        )}
      </svg>
    </div>
  );
};

export default RadarChart;
