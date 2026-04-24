import React from 'react';
import Svg, { Line } from 'react-native-svg';

export default function TickRing({
  progress = 0.75,
  size = 320,
  colorActive = '#FFFFFF',
  colorInactive = 'rgba(255,255,255,0.22)',
}) {
  const totalTicks = 60;
  const activeTicks = Math.floor(totalTicks * progress);
  const center = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius - 18;

  const lines = [];
  for (let i = 0; i < totalTicks; i++) {
    const angle = (i / totalTicks) * Math.PI * 2 - Math.PI / 2;
    const isActive = i < activeTicks;
    const isMajor = i % 5 === 0;
    const r1 = isMajor ? innerRadius - 4 : innerRadius;
    const x1 = center + Math.cos(angle) * r1;
    const y1 = center + Math.sin(angle) * r1;
    const x2 = center + Math.cos(angle) * outerRadius;
    const y2 = center + Math.sin(angle) * outerRadius;

    lines.push(
      <Line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isActive ? colorActive : colorInactive}
        strokeWidth={isMajor ? 2.5 : 1.5}
        strokeLinecap="round"
      />
    );
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {lines}
    </Svg>
  );
}
