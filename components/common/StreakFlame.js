import React, { useEffect } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FLAME_INNER, FLAME_OUTER, splitColor } from './AppIcon';

/**
 * Flamme de série de l'accueil (StreakBadge) : plus la série grandit, plus
 * elle se colore (demande utilisateur du 24/09/2026). Quatre paliers, sur la
 * MÊME échelle que les braises du fond d'écran (EmberField, app/home.js) :
 * de `min` (STREAK_THRESHOLD, le badge apparaît) à `max` (EMBER_MAX_HEAT, les
 * braises sont au plus fort).
 *
 *   1  contour, cœur jaune           début de série
 *   2  flamme dorée
 *   3  flamme orange
 *   4  dégradé rouge-orangé, deux étincelles, et elle vacille
 *
 * Le contour garde la couleur du texte de la carte (blanc, ou noir sur
 * TABATA) : sans lui, une flamme orange disparaîtrait sur le rouge d'AMRAP
 * ou le jaune de TABATA.
 */
export function flameLevel(heat, min, max) {
  const ratio = Math.max(0, Math.min(1, (heat - min) / Math.max(1, max - min)));
  return 1 + Math.min(3, Math.floor(ratio * 3 + 1e-6));
}

const LEVELS = {
  1: { size: 12, body: '#FFC933', bodyOpacity: 0.25, core: '#FFC933' },
  2: { size: 13, body: '#FFA41B', bodyOpacity: 0.6, core: '#FFE27A' },
  3: { size: 14, body: '#FF7A1A', bodyOpacity: 0.95, core: '#FFD23F' },
  4: { size: 15, body: null, bodyOpacity: 1, core: '#FFE45C' },
};

export default function StreakFlame({ heat, min, max, outline = '#FFFFFF', gradientId = 'streak' }) {
  const level = flameLevel(heat, min, max);
  const cfg = LEVELS[level];
  const { hex, alpha } = splitColor(outline);
  const flicker = useSharedValue(0);

  useEffect(() => {
    if (level < 4) {
      cancelAnimation(flicker);
      flicker.value = 0;
      return undefined;
    }
    // Irrégulier exprès (quatre temps de durées différentes) : un battement
    // régulier ferait « clignotant », pas « feu ».
    const ease = Easing.inOut(Easing.quad);
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, easing: ease }),
        withTiming(0.35, { duration: 300, easing: ease }),
        withTiming(0.8, { duration: 260, easing: ease }),
        withTiming(0, { duration: 380, easing: ease })
      ),
      -1,
      false
    );
    return () => cancelAnimation(flicker);
  }, [level]);

  const flickerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -flicker.value * 0.8 },
      { scaleY: 1 + flicker.value * 0.08 },
      { scaleX: 1 - flicker.value * 0.03 },
    ],
  }));

  const gradId = `flame-${gradientId}`;

  return (
    <Animated.View style={flickerStyle}>
      <Svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24">
        {level === 4 && (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#FF3B1F" stopOpacity={1} />
              <Stop offset="1" stopColor="#FF9A1A" stopOpacity={1} />
            </LinearGradient>
          </Defs>
        )}
        <Path
          d={FLAME_OUTER}
          fill={cfg.body || `url(#${gradId})`}
          fillOpacity={cfg.bodyOpacity}
          stroke={hex}
          strokeOpacity={alpha}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d={FLAME_INNER} fill={cfg.core} />
        {level === 4 && (
          <>
            <Circle cx={18.9} cy={5.2} r={1.25} fill="#FFC933" />
            <Circle cx={5.3} cy={7.4} r={0.9} fill="#FF9A1A" />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}
