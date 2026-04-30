import React, { useEffect } from 'react';
import Svg, { Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const TOTAL_TICKS = 60;
const easeImpact = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * TickRing — cercle à 60 ticks, signature visuelle.
 *
 * - animateIn : déclenche l'animation stagger au mount
 * - triggerKey : si fourni, re-fire l'animation à chaque changement de cette key
 *   (utilisé pour rejouer la séquence quand l'utilisateur swipe entre timers)
 */
export default function TickRing({
  progress = 0.75,
  size = 320,
  colorActive = '#FFFFFF',
  colorInactive = 'rgba(255,255,255,0.22)',
  animateIn = false,
  triggerKey,
}) {
  const activeTicks = Math.floor(TOTAL_TICKS * progress);
  const center = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius - 18;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: TOTAL_TICKS }).map((_, i) => {
        const angle = (i / TOTAL_TICKS) * Math.PI * 2 - Math.PI / 2;
        const isActive = i < activeTicks;
        const isMajor = i % 5 === 0;
        const r1 = isMajor ? innerRadius - 4 : innerRadius;
        const x1 = center + Math.cos(angle) * r1;
        const y1 = center + Math.sin(angle) * r1;
        const x2 = center + Math.cos(angle) * outerRadius;
        const y2 = center + Math.sin(angle) * outerRadius;
        return (
          <TickLine
            key={i}
            i={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isActive ? colorActive : colorInactive}
            strokeWidth={isMajor ? 2.5 : 1.5}
            animateIn={animateIn}
            triggerKey={triggerKey}
          />
        );
      })}
    </Svg>
  );
}

function TickLine({ i, x1, y1, x2, y2, stroke, strokeWidth, animateIn, triggerKey }) {
  const lineLength = Math.hypot(x2 - x1, y2 - y1);
  const shouldAnimate = animateIn || triggerKey !== undefined;
  const opacity = useSharedValue(shouldAnimate ? 0 : 1);
  const dashOffset = useSharedValue(shouldAnimate ? lineLength : 0);

  useEffect(() => {
    if (!shouldAnimate) return;
    const delay = 150 + (i / TOTAL_TICKS) * 600;
    opacity.value = 0;
    dashOffset.value = lineLength;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300, easing: easeImpact }));
    dashOffset.value = withDelay(delay, withTiming(0, { duration: 300, easing: easeImpact }));
  }, [triggerKey, animateIn]);

  const animProps = useAnimatedProps(() => ({
    opacity: opacity.value,
    strokeDashoffset: dashOffset.value,
  }));

  return (
    <AnimatedLine
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${lineLength} ${lineLength}`}
      animatedProps={animProps}
    />
  );
}
