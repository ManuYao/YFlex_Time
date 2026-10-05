import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useLongPress } from '../../hooks/useLongPress';

/**
 * Calque transparent posé sur un bouton : il faut le MAINTENIR `duration` ms
 * pour déclencher `onComplete` (mode pluie, lib/rainMode.js). Un anneau (rond)
 * ou un contour (capsule, `width`/`height`) se remplit pendant l'appui.
 * Aucune vibration propre : l'action déclenchée vibre elle-même.
 */
export default function HoldOverlay({ size, width, height, radius, color, duration, onComplete }) {
  const { isPressing, progress, start, cancel } = useLongPress(onComplete, duration, { silent: true });
  // Sans dimensions données, le calque mesure lui-même le bouton qu'il couvre.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const w = width ?? size ?? box.w;
  const h = height ?? size ?? box.h;
  const r = radius ?? Math.min(w, h) / 2;
  const inset = 3;
  const perimeterRect = 2 * (w - 2 * inset - 2 * (r - inset)) + 2 * (h - 2 * inset - 2 * (r - inset)) + 2 * Math.PI * (r - inset);
  const round = size != null && width == null && height == null;
  const circ = 2 * Math.PI * ((size || 0) / 2 - 4);
  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      style={[StyleSheet.absoluteFill, { borderRadius: r }]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      hitSlop={6}
    >
      {isPressing && w > 0 && (
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} pointerEvents="none">
          {round ? (
            <Circle
              cx={w / 2}
              cy={h / 2}
              r={size / 2 - 4}
              stroke={color}
              strokeWidth={3}
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={circ - progress * circ}
              strokeLinecap="round"
              transform={`rotate(-90 ${w / 2} ${h / 2})`}
            />
          ) : (
            <Rect
              x={inset}
              y={inset}
              width={w - 2 * inset}
              height={h - 2 * inset}
              rx={r - inset}
              stroke={color}
              strokeWidth={3}
              fill="none"
              strokeDasharray={perimeterRect}
              strokeDashoffset={perimeterRect - progress * perimeterRect}
              strokeLinecap="round"
            />
          )}
        </Svg>
      )}
    </Pressable>
  );
}
