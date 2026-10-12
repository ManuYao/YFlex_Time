import React, { memo, useEffect, useMemo } from 'react';
import Svg, { Defs, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  TICK_BASE_OPACITY,
  TICK_COUNT,
  crownPaths,
  tickGeometry,
} from '../../lib/launchVisuals';

/**
 * Les trois briques de l'anneau du lancement, partagées par la transition de l'accueil,
 * le décompte et l'intro de démarrage.
 *
 *   LaunchRing  l'anneau de 60 graduations qui s'allume
 *   FineCrown   la fine couronne de 120 repères (deux tracés seulement)
 *   RadialGlow  une lueur ronde qui s'éteint vers les bords
 *
 * Légèreté : chaque graduation n'anime qu'une seule valeur (son opacité) sur le fil
 * d'interface, avec un retard calé sur sa position — rien ne passe par le fil JavaScript une
 * fois lancé, et au plus quelques graduations bougent en même temps.
 */

const AnimatedLine = Animated.createAnimatedComponent(Line);
const EASE = Easing.out(Easing.cubic);

/**
 * mode
 *   'ignite'  une vague parcourt l'anneau : chaque graduation monte à 1 puis redescend à `rest`
 *             (par défaut son opacité d'éteinte) — la traînée d'une comète ;
 *   'fill'    les graduations s'allument une à une et RESTENT allumées (le décompte) ;
 *   'static'  rien ne bouge, toutes à `staticOpacity` (réduire les animations).
 * Les graduations avant `startDelay` sont à `baseOpacity`. Le tour complet dure `sweepMs`.
 *
 * color : une couleur, ou quatre (un quart d'anneau chacune, à partir de midi — l'icône).
 */
function LaunchRing({
  size,
  preset = 'app',
  color = '#FFFFFF',
  baseOpacity = TICK_BASE_OPACITY,
  mode = 'ignite',
  startDelay = 0,
  sweepMs = 600,
  riseMs = 120,
  fallMs = 400,
  rest,
  staticOpacity,
}) {
  const ticks = useMemo(() => tickGeometry(size, preset), [size, preset]);
  const colors = Array.isArray(color) ? color : null;
  const restOpacity = rest ?? baseOpacity;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ticks.map((t, i) => (
        <Tick
          key={i}
          tick={t}
          color={colors ? colors[t.group % colors.length] : color}
          base={mode === 'static' ? (staticOpacity ?? baseOpacity) : baseOpacity}
          mode={mode}
          delay={startDelay + (i / TICK_COUNT) * sweepMs}
          rise={riseMs}
          fall={fallMs}
          rest={restOpacity}
        />
      ))}
    </Svg>
  );
}

export default memo(LaunchRing);

const Tick = memo(function Tick({ tick, color, base, mode, delay, rise, fall, rest }) {
  const opacity = useSharedValue(base);

  useEffect(() => {
    if (mode === 'ignite') {
      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: rise, easing: EASE }),
          withTiming(rest, { duration: fall, easing: Easing.inOut(Easing.sin) })
        )
      );
    } else if (mode === 'fill') {
      opacity.value = withDelay(delay, withTiming(1, { duration: rise, easing: EASE }));
    }
    // 'static' : rien à animer.
  }, []);

  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  return (
    <AnimatedLine
      x1={tick.x1}
      y1={tick.y1}
      x2={tick.x2}
      y2={tick.y2}
      stroke={color}
      strokeWidth={tick.width}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
});

/**
 * La fine couronne de 120 repères, au rayon donné (dp). Deux tracés seulement : on peut la
 * faire tourner (transform sur le conteneur) sans coût. `color` en hex opaque, la transparence
 * passe par `opacity` (react-native-svg ignore l'alpha d'un rgba()).
 */
export const FineCrown = memo(function FineCrown({ radius, color = '#FFFFFF', opacity = 0.4 }) {
  const p = useMemo(() => crownPaths(radius), [radius]);
  return (
    <Svg width={p.box} height={p.box} viewBox={`0 0 ${p.box} ${p.box}`}>
      <Path
        d={p.minor}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={p.minorWidth}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={p.major}
        stroke={color}
        strokeOpacity={Math.min(1, opacity * 1.25)}
        strokeWidth={p.majorWidth}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
});

/**
 * Une lueur ronde : opaque au centre, transparente au bord. `id` doit être unique parmi les
 * lueurs montées en même temps (deux dégradés du même identifiant se marchent dessus).
 */
export const RadialGlow = memo(function RadialGlow({ size, color = '#FFFFFF', id = 'launchGlow' }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="0.4" stopColor={color} stopOpacity="0.42" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
});
